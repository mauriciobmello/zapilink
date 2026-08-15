import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileOwnerEmail } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { securityLogger } from "@/lib/security-logger";
import {
  addDays,
  computeAvailability,
  todayInTimeZone,
  toUtcIso,
} from "@/lib/schedule/availability";
import type { AvailabilityException, AvailabilityRule } from "@/types/schedule";

export const dynamic = "force-dynamic";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const slotDate = typeof body.slot_date === "string" ? body.slot_date : "";
  const slotStart = typeof body.slot_start_time === "string" ? body.slot_start_time : "";
  const slotEnd = typeof body.slot_end_time === "string" ? body.slot_end_time : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
    await securityLogger.warn("Invalid booking date format", {
      username: username,
      slotDate: slotDate,
    });
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(slotStart) || !/^\d{2}:\d{2}$/.test(slotEnd)) {
    await securityLogger.warn("Invalid booking time format", {
      username: username,
      slotStart: slotStart,
      slotEnd: slotEnd,
    });
    return NextResponse.json({ error: "Horário inválido." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 255) {
    await securityLogger.warn("Invalid booking name length", {
      username: username,
      nameLength: name.length,
    });
    return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    await securityLogger.warn("Invalid booking email format", {
      username: username,
      email: email,
    });
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  const { data: event } = await admin
    .from("schedule_events")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!event || !event.is_active) {
    return NextResponse.json({ error: "Agenda não configurada." }, { status: 400 });
  }

  const tz = event.timezone;
  const fromDate = todayInTimeZone(tz);
  const maxDate = addDays(fromDate, 60);
  if (slotDate < fromDate || slotDate > maxDate) {
    return NextResponse.json({ error: "Data fora da janela de agendamento." }, { status: 400 });
  }
  if (toMinutes(slotEnd) - toMinutes(slotStart) !== event.duration_minutes) {
    return NextResponse.json({ error: "Duração do horário inválida." }, { status: 400 });
  }

  const { data: rules } = await admin
    .from("availability_rules")
    .select("*")
    .eq("profile_id", profile.id);
  const { data: exceptions } = await admin
    .from("availability_exceptions")
    .select("*")
    .eq("profile_id", profile.id);
  const { data: bookings } = await admin
    .from("bookings")
    .select("slot_date, slot_start_time")
    .eq("profile_id", profile.id)
    .eq("slot_date", slotDate)
    .in("status", ["pending", "approved"]);

  const bookedCounts = new Map<string, number>();
  for (const b of bookings ?? []) {
    bookedCounts.set(
      `${b.slot_date}|${b.slot_start_time}`,
      (bookedCounts.get(`${b.slot_date}|${b.slot_start_time}`) ?? 0) + 1,
    );
  }

  const slots = computeAvailability({
    timeZone: tz,
    durationMinutes: event.duration_minutes,
    defaultCapacity: event.default_capacity,
    rules: (rules ?? []) as AvailabilityRule[],
    exceptions: (exceptions ?? []) as AvailabilityException[],
    bookings: Array.from(bookedCounts.entries()).map(([key, count]) => {
      const [d, t] = key.split("|");
      return { slot_date: d, slot_start_time: t, count };
    }),
    busyIntervals: [],
    fromDate: slotDate,
    days: 1,
  });

  const match = slots.find(
    (s) => s.start_time === slotStart && s.remaining_capacity > 0,
  );
  if (!match) {
    return NextResponse.json(
      { error: "Horário indisponível ou esgotado." },
      { status: 409 },
    );
  }

  const { data: booking, error } = await admin.rpc("book_slot", {
    p_profile_id: profile.id,
    p_event_id: event.id,
    p_slot_date: slotDate,
    p_slot_start_time: slotStart,
    p_slot_end_time: slotEnd,
    p_invitee_name: name,
    p_invitee_email: email,
    p_invitee_phone: phone || null,
  });

  if (error || !booking) {
    const message = error?.message ?? "Não foi possível reservar o horário.";
    if (message.includes("SL002") || message.includes("esgotado")) {
      await securityLogger.warn("Booking slot unavailable", {
        username: username,
        slotDate: slotDate,
        slotStart: slotStart,
      });
      return NextResponse.json({ error: "Horário esgotado." }, { status: 409 });
    }
    if (message.includes("SL001") || message.includes("não configurada")) {
      await securityLogger.warn("Booking schedule not configured", {
        username: username,
      });
      return NextResponse.json({ error: "Agenda não configurada." }, { status: 400 });
    }
    await securityLogger.error("Booking creation failed", {
      username: username,
      slotDate: slotDate,
      slotStart: slotStart,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await securityLogger.info("Booking created successfully", {
    username: username,
    bookingId: booking.id,
    slotDate: slotDate,
    slotStart: slotStart,
    inviteeEmail: email,
  });

  try {
    await sendEmail({
      recipient: booking.invitee_email,
      subject: `Solicitação recebida: ${event.title}`,
      text: [
        `Olá, ${booking.invitee_name}!`,
        `Recebemos sua solicitação para ${slotDate} às ${slotStart} (${tz}).`,
        "Aguarde a confirmação no seu e-mail.",
      ].join("\n"),
    });
  } catch {
    // Falha no e-mail de confirmação não invalida a reserva.
  }

  try {
    const ownerEmail = await getProfileOwnerEmail(profile.id);
    if (ownerEmail) {
      const base = await getSiteUrl();
      const approveUrl = `${base}/api/schedule/respond/${booking.approval_token}?action=approve`;
      const declineUrl = `${base}/api/schedule/respond/${booking.approval_token}?action=decline`;
      await sendEmail({
        recipient: ownerEmail,
        subject: `Nova solicitação: ${event.title}`,
        text: [
          `${booking.invitee_name} (${booking.invitee_email})`,
          `solicitou ${slotDate} às ${slotStart} (${tz}).`,
          `Aprovar: ${approveUrl}`,
          `Recusar: ${declineUrl}`,
        ].join("\n"),
      });
    }
  } catch {
    // Falha de e-mail não invalida a reserva.
  }

  return NextResponse.json({ ok: true, booking_id: booking.id });
}