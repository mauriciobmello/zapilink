import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeAvailability,
  addDays,
  todayInTimeZone,
  toUtcIso,
} from "@/lib/schedule/availability";
import { fetchBusyIntervals, getConnectionAccessToken } from "@/lib/google-calendar";
import type { AvailabilityException, AvailabilityRule, BookedCount } from "@/types/schedule";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
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
    return NextResponse.json({ slots: [], event: null });
  }

  const tz = event.timezone;
  const fromDate = todayInTimeZone(tz);
  const endDate = addDays(fromDate, 60);

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
    .eq("status", "approved")
    .gte("slot_date", fromDate)
    .lte("slot_date", endDate);

  const bookedCounts = new Map<string, number>();
  for (const b of bookings ?? []) {
    const key = `${b.slot_date}|${b.slot_start_time}`;
    bookedCounts.set(key, (bookedCounts.get(key) ?? 0) + 1);
  }
  const booked: BookedCount[] = Array.from(bookedCounts.entries()).map(
    ([key, count]) => {
      const [slot_date, slot_start_time] = key.split("|");
      return { slot_date, slot_start_time, count };
    },
  );

  let busy: { start: Date; end: Date }[] = [];
  try {
    const conn = await getConnectionAccessToken(profile.id);
    if (conn) {
      busy = await fetchBusyIntervals(
        conn.accessToken,
        toUtcIso(fromDate, "00:00", tz),
        toUtcIso(endDate, "24:00", tz),
      );
    }
  } catch {
    // Falha na checagem do Google não bloqueia a disponibilidade.
  }

  const slots = computeAvailability({
    timeZone: tz,
    durationMinutes: event.duration_minutes,
    defaultCapacity: event.default_capacity,
    rules: (rules ?? []) as AvailabilityRule[],
    exceptions: (exceptions ?? []) as AvailabilityException[],
    bookings: booked,
    busyIntervals: busy,
    fromDate,
    days: 60,
  });

  return NextResponse.json({
    slots,
    event: {
      title: event.title,
      description: event.description,
      duration_minutes: event.duration_minutes,
    },
  });
}