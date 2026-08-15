import Link from "next/link";
import { requireUser, resolveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Block } from "@/types/block";
import ProfileForm from "@/components/dashboard/ProfileForm";
import BlockListEditor from "@/components/dashboard/blocks/BlockListEditor";

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
  const tab = params.tab === "blocos" ? "blocos" : "perfil";
  const tabLink = (target: "perfil" | "blocos") =>
    `/dashboard/edit?tab=${target}&profileId=${profile.id}`;

  return (
    <div>
      <nav className="mb-6 flex gap-2" aria-label="Seções de edição">
        <Link
          href={tabLink("perfil")}
          className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
            tab === "perfil"
              ? "bg-[#7C3AED] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Perfil
        </Link>
        <Link
          href={tabLink("blocos")}
          className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
            tab === "blocos"
              ? "bg-[#7C3AED] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Blocos
        </Link>
      </nav>

      {tab === "blocos" ? (
        <BlockListEditor
          profileId={profile.id}
          profile={profile}
          initialBlocks={blocks}
        />
      ) : (
        <ProfileForm initialData={profile} initialBlocks={blocks} />
      )}
    </div>
  );
}