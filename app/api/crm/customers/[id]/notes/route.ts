import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, CrmError } from "@/lib/crm/server";
import { crmErrorResponse, readJsonBody, readString } from "@/lib/crm/http";
import type { CustomerNote } from "@/types/crm";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { userId } = await requireCrmAdmin(
      searchParams.get("profileId"),
      "crm.view",
    );

    const admin = createAdminClient();
    const { profileId } = await requireCrmAdmin(
      searchParams.get("profileId"),
      "crm.view",
    );

    const { data, error } = await admin
      .from("customer_notes")
      .select("*")
      .eq("customer_id", id)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) throw new CrmError(error.message, 500);
    return NextResponse.json({ notes: (data ?? []) as CustomerNote[] });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    const { userId, profileId } = await requireCrmAdmin(
      readString(body, "profileId"),
      "crm.update",
    );

    const content = readString(body, "content")?.trim();
    if (!content) {
      return NextResponse.json({ error: "Conteúdo é obrigatório." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("customer_notes")
      .insert({
        profile_id: profileId,
        customer_id: id,
        user_id: userId,
        content,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Não foi possível adicionar a observação." },
        { status: 400 },
      );
    }

    await admin.rpc("crm_register_event", {
      p_profile_id: profileId,
      p_customer_id: id,
      p_event_type: "note.created",
      p_source: "crm",
      p_description: "Observação adicionada",
    });

    return NextResponse.json({ note: data as CustomerNote });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
