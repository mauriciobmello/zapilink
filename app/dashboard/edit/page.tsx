import { requireUser, resolveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Block } from "@/types/block";
import EditPageContent from "@/components/dashboard/EditPageContent";

export const dynamic = "force-dynamic";

async function fetchBlocks(profileId: string): Promise<Block[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("*")
    .eq("profile_id", profileId)
    .order("position", { ascending: true });
  return (data ?? []) as Block[];
}

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = await resolveProfile(user.id, params.profileId);
  const blocks = await fetchBlocks(profile.id);

  return (
    <EditPageContent profile={profile} initialBlocks={blocks} />
  );
}