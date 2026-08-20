import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, CrmError } from "@/lib/crm/server";
import { crmErrorResponse, readJsonBody, readString } from "@/lib/crm/http";
import type { CustomerTag } from "@/types/crm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { profileId } = await requireCrmAdmin(
      url.searchParams.get("profileId"),
      "crm.view",
    );

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("customer_tags")
      .select("*")
      .eq("profile_id", profileId)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      throw new CrmError(error.message, 500);
    }

    return NextResponse.json({ tags: (data ?? []) as CustomerTag[] });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { profileId } = await requireCrmAdmin(
      readString(body, "profileId"),
      "crm.tags.manage",
    );

    const name = readString(body, "name")?.trim();
    const color = readString(body, "color")?.trim() ?? "#7C3AED";
    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("customer_tags")
      .insert({ profile_id: profileId, name, color })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Não foi possível criar a tag." },
        { status: 400 },
      );
    }

    return NextResponse.json({ tag: data as CustomerTag });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
