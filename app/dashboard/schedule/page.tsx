import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import SchedulePageContent from "@/components/dashboard/schedule/SchedulePageContent";
import type {
  AvailabilityException,
  AvailabilityRule,
  Booking,
  ScheduleEvent,
} from "@/types/schedule";

export const dynamic = "force-dynamic";

async function resolveProfile(userId: string, profileId?: string) {
  const admin = createAdminClient();
  if (profileId) {
    const { data } = await admin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) {
    throw new Error("Perfil não encontrado.");
  }
  return data;
}

async function getOrCreateScheduleEvent(
  profileId: string,
): Promise<ScheduleEvent> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("schedule_events")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (data) return data as ScheduleEvent;

  const { data: created, error } = await admin
    .from("schedule_events")
    .insert({ profile_id: profileId })
    .select()
    .single();
  if (error || !created) {
    throw new Error(error?.message ?? "Não foi possível criar a agenda.");
  }
  return created as ScheduleEvent;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const admin = createAdminClient();
  const params = await searchParams;
  const profile = await resolveProfile(user.id, params.profileId);

  const event = await getOrCreateScheduleEvent(profile.id);

  const [{ data: rules }, { data: exceptions }, { data: connection }, { data: bookings }] =
    await Promise.all([
      admin
        .from("availability_rules")
        .select("*")
        .eq("profile_id", profile.id)
        .order("day_of_week", { ascending: true }),
      admin
        .from("availability_exceptions")
        .select("*")
        .eq("profile_id", profile.id)
        .order("date", { ascending: true }),
      admin
        .from("google_calendar_connections")
        .select("google_email")
        .eq("profile_id", profile.id)
        .maybeSingle(),
      admin
        .from("bookings")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie sua disponibilidade e as solicitações de agendamento.
        </p>
      </div>

      <SchedulePageContent
        profileId={profile.id}
        initialEvent={event}
        initialRules={(rules ?? []) as AvailabilityRule[]}
        initialExceptions={(exceptions ?? []) as AvailabilityException[]}
        googleEmail={connection?.google_email ?? null}
        bookings={(bookings ?? []) as Booking[]}
      />
    </div>
  );
}