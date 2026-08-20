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
    .select("enabled_modules")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) {
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
        <p className="mt-1 text-sm text-gray-500">
          Escolha quais módulos aparecerão no painel deste perfil.
        </p>
      </div>

      <ModulesSettingsForm
        profileId={profileId}
        available={AVAILABLE_MODULES}
        enabled={enabled}
      />
    </div>
  );
}
