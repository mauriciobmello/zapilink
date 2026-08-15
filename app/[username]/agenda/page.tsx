import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "@/components/schedule/BookingForm";
import type { ScheduleEvent } from "@/types/schedule";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const supabase = await createClient();
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const { data: event } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!event || !event.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-page px-4">
        <div className="rounded-card bg-white p-10 text-center shadow-card">
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="mt-2 text-gray-500">
            Este perfil ainda não configurou uma agenda.
          </p>
        </div>
      </main>
    );
  }

  return (
    <BookingForm
      username={username}
      profile={profile as Profile}
      event={{
        title: event.title,
        description: event.description,
        duration_minutes: event.duration_minutes,
      }}
    />
  );
}