import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { requireCrmProfilePage } from "@/lib/crm/server";
import CustomerImport from "@/components/dashboard/crm/CustomerImport";

export const dynamic = "force-dynamic";

export default async function CrmImportPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = await requireCrmProfilePage(user.id, params.profileId, "crm.import");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/crm/customers?profileId=${encodeURIComponent(profile.id)}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Importar clientes
        </h1>
      </div>

      <CustomerImport profileId={profile.id} />
    </div>
  );
}
