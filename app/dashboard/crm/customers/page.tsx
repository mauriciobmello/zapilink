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
        <h1 className="mt-2 text-2xl font-bold text-gray-900">CRM — Clientes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {customers.length} cliente(s) cadastrado(s).
        </p>
      </div>

      <CustomerList profileId={profile.id} initialCustomers={customers} />
    </div>
  );
}
