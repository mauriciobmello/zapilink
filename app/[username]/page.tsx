import { notFound } from "next/navigation";
import ProfilePage from "@/components/profile/ProfilePage";
import { createClient } from "@/lib/supabase/server";
import type { Block } from "@/types/block";
import type { Profile } from "@/types/profile";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const supabase = await createClient();
  const { username } = await params;

  // First get the profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    await securityLogger.warn("Profile not found", {
      username: username,
      error: profileError?.message,
    });
    notFound();
  }

  // Then get the blocks separately
  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_visible", true)
    .order("position", { ascending: true });

  const p = profile as Profile;
  const visibleBlocks = (blocks ?? []) as Block[];

  const { data: scheduleEvent } = await supabase
    .from("schedule_events")
    .select("is_active")
    .eq("profile_id", p.id)
    .maybeSingle();
  const scheduleAgendaUrl =
    scheduleEvent?.is_active ? `/${username}/agenda` : undefined;

  const { data: loyaltyProgram } = await supabase
    .from("loyalty_programs")
    .select("is_active")
    .eq("profile_id", p.id)
    .maybeSingle();
  const loyaltyUrl = loyaltyProgram?.is_active
    ? `/${username}/loyalty`
    : undefined;

  await supabase.from("page_views").insert({ profile_id: p.id });

  return (
    <ProfilePage
      profile={p}
      blocks={visibleBlocks}
      scheduleAgendaUrl={scheduleAgendaUrl}
      loyaltyUrl={loyaltyUrl}
    />
  );
}