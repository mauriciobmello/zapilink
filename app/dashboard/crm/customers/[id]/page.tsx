import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getCustomer,
  getCustomerLoyaltyInfo,
  requireCrmProfilePage,
} from "@/lib/crm/server";
import CustomerDetail from "@/components/dashboard/crm/CustomerDetail";

export const dynamic = "force-dynamic";

export default async function CrmCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ profileId?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const paramsSearch = await searchParams;
  const profile = await requireCrmProfilePage(user.id, paramsSearch.profileId, "crm.view");

  const customer = await getCustomer(profile.id, id);
  if (!customer) {
    notFound();
  }

  const loyalty = await getCustomerLoyaltyInfo(profile.id, customer);

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/crm/customers?profileId=${encodeURIComponent(profile.id)}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Clientes
      </Link>

      <CustomerDetail
        profileId={profile.id}
        customer={customer}
        loyalty={loyalty}
      />
    </div>
  );
}
