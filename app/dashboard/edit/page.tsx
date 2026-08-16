import { notFound } from "next/navigation";
import { requireUser, resolveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Block } from "@/types/block";
import EditPageContent from "@/components/dashboard/EditPageContent";
import { ProfileProvider } from "@/contexts/ProfileContext";

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

  if (!profile) {
    notFound();
  }

  const blocks = await fetchBlocks(profile.id);

  return (
    <ProfileProvider
      initialProfile={profile}
      initialRole={profile.access?.role || "owner"}
      initialPermissions={profile.access?.permissions || []}
    >
      <EditPageContent profile={profile} initialBlocks={blocks} />
    </ProfileProvider>
  );
}