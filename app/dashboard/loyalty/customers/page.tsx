import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LoyaltyCustomersList from "@/components/dashboard/loyalty/LoyaltyCustomersList";
import {
  listCustomerSummaries,
  requireLoyaltyProfilePage,
} from "@/lib/loyalty/server";

export const dynamic = "force-dynamic";

export default async function LoyaltyCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { profile, program } = await requireLoyaltyProfilePage(
    user.id,
    params.profileId,
    "loyalty.customers.view",
  );
  const customers = await listCustomerSummaries(program);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/loyalty?profileId=${encodeURIComponent(profile.id)}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Fidelidade
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {customers.length} participante(s) no programa.
        </p>
      </div>

      <LoyaltyCustomersList
        profileId={profile.id}
        initialCustomers={customers}
      />
    </div>
  );
}
