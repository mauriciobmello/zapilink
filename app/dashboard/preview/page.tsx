import Link from "next/link";
import { requireUser, resolveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Block } from "@/types/block";
import type { Profile } from "@/types/profile";
import ProfilePage from "@/components/profile/ProfilePage";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = (await resolveProfile(user.id, params.profileId)) as Profile;

  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("profile_id", profile.id)
    .order("position", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          Preview da sua página
        </h1>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/edit?profileId=${profile.id}`}
            className="rounded-card border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#7C3AED]"
          >
            Voltar para editar
          </Link>
          <Link
            href={`/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-card bg-gradient-to-br from-[#7C3AED] to-[#F97316] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Ver página pública
          </Link>
        </div>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-4 shadow-card">
        <ProfilePage profile={profile} blocks={(blocks ?? []) as Block[]} />
      </div>
    </div>
  );
}