import { NextResponse } from "next/server";
import { createAdminClient, getProfileOwnerEmail } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  createCalendarEvent,
  getConnectionAccessToken,
} from "@/lib/google-calendar";
import { toUtcIso } from "@/lib/schedule/availability";

export const dynamic = "force-dynamic";

type ActionResult = { ok: true } | { ok: false; error: string; status: number };

async function performAction(
  token: string,
  action: "approve" | "decline",
): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("approval_token", token)
    .maybeSingle();
  if (!booking) {
    return { ok: false, error: "Solicitação não encontrada.", status: 404 };
  }
  if (booking.status !== "pending") {
    return { ok: false, error: "Solicitação já decidida.", status: 409 };
  }

  const { data: event } = await admin
    .from("schedule_events")
    .select("*")
    .eq("profile_id", booking.profile_id)
    .maybeSingle();
  const timezone = event?.timezone ?? "America/Sao_Paulo";

  if (action === "approve") {
    let googleEventId: string | null = null;
    try {
      const conn = await getConnectionAccessToken(booking.profile_id);
      if (conn) {
        googleEventId = await createCalendarEvent(conn.accessToken, {
          summary: event?.title ?? "Agendamento",
          description: [
            `Confirmado: ${booking.invitee_name}`,
            `Contato: ${booking.invitee_email}`,
            booking.invitee_phone ? `Telefone: ${booking.invitee_phone}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          location: event?.location ?? null,
          startIso: toUtcIso(
            booking.slot_date,
            booking.slot_start_time,
            timezone,
          ),
          endIso: toUtcIso(booking.slot_date, booking.slot_end_time, timezone),
          attendeeEmail: booking.invitee_email,
        });
      }
    } catch {
      // Falha ao criar o evento do Google não bloqueia a aprovação.
    }

    await admin
      .from("bookings")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        google_calendar_event_id: googleEventId,
      })
      .eq("id", booking.id);

    await sendEmail({
      recipient: booking.invitee_email,
      subject: "Sua solicitação foi aprovada",
      text: `Olá, ${booking.invitee_name}! Sua solicitação para ${booking.slot_date} às ${booking.slot_start_time} foi aprovada.`,
    });
  } else {
    await admin
      .from("bookings")
      .update({ status: "declined", decided_at: new Date().toISOString() })
      .eq("id", booking.id);

    await sendEmail({
      recipient: booking.invitee_email,
      subject: "Sua solicitação foi recusada",
      text: `Olá, ${booking.invitee_name}! Infelizmente sua solicitação para ${booking.slot_date} às ${booking.slot_start_time} foi recusada.`,
    });
  }

  return { ok: true };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  let action: string | undefined;
  try {
    const body = await request.json();
    action = body?.action;
  } catch {
    // action fica undefined
  }
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }
  const result = await performAction(token, action);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }
  const result = await performAction(token, action);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.redirect(`${await getSiteUrl()}/`);
}