import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCustomers, requireCrmProfilePage } from "@/lib/crm/server";
import CustomerList from "@/components/dashboard/crm/CustomerList";

export const dynamic = "force-dynamic";

export default async function CrmCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = await requireCrmProfilePage(user.id, params.profileId, "crm.view");
  const customers = await listCustomers(profile.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard?profileId=${encodeURIComponent(profile.id)}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Visão Geral
        </Link>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/dashboard/crm/customers/new?profileId=${encodeURIComponent(profile.id)}`}
            className="flex h-12 items-center justify-center rounded-card bg-[#7C3AED] px-4 font-medium text-white transition-colors hover:brightness-110"
          >
            Novo cliente
          </Link>
          <Link
            href={`/dashboard/crm/import?profileId=${encodeURIComponent(profile.id)}`}
            className="flex h-12 items-center justify-center rounded-card border border-gray-200 bg-white px-4 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Importar CSV
          </Link>
        </div>
      </div>

      <CustomerList profileId={profile.id} initialCustomers={customers} />
    </div>
  );
}
