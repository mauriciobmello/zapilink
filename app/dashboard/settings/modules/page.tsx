import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { resolveProfileAccess } from "@/lib/access/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import ModulesSettingsForm from "@/components/dashboard/ModulesSettingsForm";

const DEFAULT_MODULES = ["edit", "schedule", "loyalty", "crm"];

const AVAILABLE_MODULES = [
  { id: "edit", label: "Editor de Perfil" },
  { id: "schedule", label: "Agenda" },
  { id: "loyalty", label: "Fidelidade" },
  { id: "crm", label: "CRM" },
];

export const dynamic = "force-dynamic";

export default async function ModulesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const profileId = params.profileId;
  if (!profileId) {
    notFound();
  }

  const access = await resolveProfileAccess(user.id, profileId);
  if (!access || access.role !== "owner") {
    notFound();
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("name, enabled_modules")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Habilitar módulos</h1>
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          Erro ao carregar o perfil: {error.message}. Verifique se a migration 005 foi aplicada.
        </p>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  const enabled = Array.isArray(data.enabled_modules)
    ? data.enabled_modules
    : DEFAULT_MODULES;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard?profileId=${encodeURIComponent(profileId)}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Visão Geral
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Habilitar módulos
        </h1>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-3 py-1">
          <span className="text-sm text-[#7C3AED]">Perfil:</span>
          <span className="font-semibold text-[#7C3AED]">
            {data.name || "Sem nome"}
          </span>
        </div>
      </div>

      <ModulesSettingsForm
        profileId={profileId}
        available={AVAILABLE_MODULES}
        enabled={enabled}
      />
    </div>
  );
}
