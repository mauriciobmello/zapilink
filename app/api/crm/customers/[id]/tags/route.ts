import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, CrmError } from "@/lib/crm/server";
import { crmErrorResponse, readJsonBody, readString } from "@/lib/crm/http";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    const { profileId } = await requireCrmAdmin(
      readString(body, "profileId"),
      "crm.update",
    );
    const tagId = readString(body, "tagId");
    if (!tagId) {
      return NextResponse.json({ error: "Tag é obrigatória." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!customer) throw new CrmError("Cliente não encontrado.", 404);

    const { data: tag } = await admin
      .from("customer_tags")
      .select("id")
      .eq("id", tagId)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!tag) throw new CrmError("Tag não encontrada.", 404);

    const { data: existingRelation } = await admin
      .from("customer_tag_relations")
      .select("id")
      .eq("customer_id", id)
      .eq("tag_id", tagId)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (existingRelation) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await admin
      .from("customer_tag_relations")
      .insert({ profile_id: profileId, customer_id: id, tag_id: tagId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.rpc("crm_register_event", {
      p_profile_id: profileId,
      p_customer_id: id,
      p_event_type: "tag.added",
      p_source: "crm",
      p_reference_id: tagId,
      p_description: `Tag adicionada ao cliente`,
      p_metadata: { tag_id: tagId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { profileId } = await requireCrmAdmin(
      searchParams.get("profileId"),
      "crm.update",
    );
    const tagId = searchParams.get("tagId");
    if (!tagId) {
      return NextResponse.json({ error: "Tag é obrigatória." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("customer_tag_relations")
      .delete()
      .eq("customer_id", id)
      .eq("tag_id", tagId)
      .eq("profile_id", profileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.rpc("crm_register_event", {
      p_profile_id: profileId,
      p_customer_id: id,
      p_event_type: "tag.removed",
      p_source: "crm",
      p_reference_id: tagId,
      p_description: `Tag removida do cliente`,
      p_metadata: { tag_id: tagId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
