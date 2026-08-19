import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { requireCrmProfilePage, getCrmMetrics } from "@/lib/crm/server";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const profile = await requireCrmProfilePage(user.id, params.profileId, "crm.view");
  const metrics = await getCrmMetrics(profile.id);

  const cards = [
    { label: "Clientes", value: metrics.total, color: "text-gray-900" },
    { label: "Ativos", value: metrics.active, color: "text-green-600" },
    { label: "Novos", value: metrics.new, color: "text-yellow-600" },
    { label: "Inativos", value: metrics.inactive, color: "text-red-600" },
    { label: "VIP", value: metrics.vip, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão rápida da base de clientes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-card bg-white p-6 shadow-card"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Link
          href={`/dashboard/crm/customers?profileId=${encodeURIComponent(profile.id)}`}
          className="flex h-12 items-center justify-center rounded-card bg-[#7C3AED] px-6 font-medium text-white transition-colors hover:brightness-110"
        >
          Ver clientes
        </Link>
      </div>
    </div>
  );
}
