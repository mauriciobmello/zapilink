import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  listCustomerSummaries,
  requireLoyaltyProfilePage,
} from "@/lib/loyalty/server";

export const dynamic = "force-dynamic";

export default async function LoyaltyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { profile, program } = await requireLoyaltyProfilePage(
    user.id,
    params.profileId,
    "loyalty.view",
  );
  const customers = await listCustomerSummaries(program);

  const query = `?profileId=${encodeURIComponent(profile.id)}`;
  const completed = customers.filter(
    (item) => item.benefit_state === "completed",
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fidelidade</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre clientes, acumule estrelas e registre resgates.
        </p>
      </div>

      <div className="rounded-card bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {program.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Meta de {program.stars_required} estrelas ·{" "}
              {program.benefit_description ?? "benefício não configurado"}
            </p>
          </div>
          <span
            className={`rounded-card px-3 py-1 text-xs font-medium ${
              program.is_active
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {program.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-card bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Participantes</p>
            <p className="text-2xl font-bold text-gray-900">
              {customers.length}
            </p>
          </div>
          <div className="rounded-card bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Benefícios disponíveis</p>
            <p className="text-2xl font-bold text-gray-900">{completed}</p>
          </div>
          <div className="rounded-card bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Página pública</p>
            <Link
              href={`/${profile.username}/loyalty`}
              className="text-sm font-medium text-[#7C3AED] hover:underline"
            >
              /{profile.username}/loyalty
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/dashboard/loyalty/customers${query}`}
            className="flex h-12 flex-1 items-center justify-center rounded-card bg-[#7C3AED] px-4 font-medium text-white transition-colors hover:brightness-110"
          >
            Clientes
          </Link>
          <Link
            href={`/dashboard/loyalty/settings${query}`}
            className="flex h-12 flex-1 items-center justify-center rounded-card border border-gray-200 px-4 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Configurar programa
          </Link>
        </div>
      </div>
    </div>
  );
}
