import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LoyaltySettingsForm from "@/components/dashboard/loyalty/LoyaltySettingsForm";
import { requireLoyaltyProfilePage } from "@/lib/loyalty/server";

export const dynamic = "force-dynamic";

export default async function LoyaltySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { profile, program } = await requireLoyaltyProfilePage(
    user.id,
    params.profileId,
    "loyalty.settings.edit",
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/dashboard/loyalty?profileId=${encodeURIComponent(profile.id)}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Fidelidade
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Configurar programa
        </h1>
      </div>

      <LoyaltySettingsForm
        profileId={profile.id}
        username={profile.username}
        program={program}
      />
    </div>
  );
}
