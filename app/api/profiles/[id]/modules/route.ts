import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { resolveProfileAccess } from "@/lib/access/authorization";

export const dynamic = "force-dynamic";

const DEFAULT_MODULES = ["edit", "schedule", "loyalty", "crm"];
const AVAILABLE_MODULES = [
  { id: "edit", label: "Editor de Perfil" },
  { id: "schedule", label: "Agenda" },
  { id: "loyalty", label: "Fidelidade" },
  { id: "crm", label: "CRM" },
];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const access = await resolveProfileAccess(user.id, id);
    if (!access || access.role !== "owner") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("enabled_modules")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }

    const enabled = Array.isArray(data.enabled_modules)
      ? data.enabled_modules
      : DEFAULT_MODULES;

    return NextResponse.json({
      available: AVAILABLE_MODULES,
      enabled,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const access = await resolveProfileAccess(user.id, id);
    if (!access || access.role !== "owner") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const enabled = Array.isArray(body.enabled) ? body.enabled : DEFAULT_MODULES;
    const valid = enabled.filter((m: unknown) =>
      AVAILABLE_MODULES.some((mod) => mod.id === m),
    );

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .update({ enabled_modules: valid })
      .eq("id", id)
      .select("enabled_modules")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Erro ao salvar." }, { status: 400 });
    }

    return NextResponse.json({
      available: AVAILABLE_MODULES,
      enabled: data.enabled_modules,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno." },
      { status: 500 },
    );
  }
}
