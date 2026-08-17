import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LoyaltyCustomerForm from "@/components/dashboard/loyalty/LoyaltyCustomerForm";
import { requireLoyaltyProfilePage } from "@/lib/loyalty/server";

export const dynamic = "force-dynamic";

export default async function NewLoyaltyCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { profile } = await requireLoyaltyProfilePage(
    user.id,
    params.profileId,
    "loyalty.customers.manage",
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/dashboard/loyalty/customers?profileId=${encodeURIComponent(profile.id)}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Novo cliente</h1>
      </div>

      <LoyaltyCustomerForm profileId={profile.id} />
    </div>
  );
}
