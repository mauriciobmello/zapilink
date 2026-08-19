import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, getCustomer, CrmError } from "@/lib/crm/server";
import { crmErrorResponse, readJsonBody, readString, readOptionalString } from "@/lib/crm/http";
import type { Customer } from "@/types/crm";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { profileId } = await requireCrmAdmin(undefined, "crm.view");
    const customer = await getCustomer(profileId, id);
    if (!customer) {
      throw new CrmError("Cliente não encontrado.", 404);
    }
    return NextResponse.json({ customer });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { profileId } = await requireCrmAdmin(undefined, "crm.update");
    const body = await readJsonBody(request);

    const updates: Record<string, unknown> = {};
    const name = readOptionalString(body, "name")?.trim();
    if (name !== undefined) {
      if (!name) throw new CrmError("Nome não pode ser vazio.", 400);
      updates.name = name;
    }
    const phone = readOptionalString(body, "phone")?.trim() ?? null;
    if (phone !== undefined) updates.phone = phone;
    const email = readOptionalString(body, "email")?.trim() ?? null;
    if (email !== undefined) updates.email = email;
    const cpf = readOptionalString(body, "cpf")?.trim() ?? null;
    if (cpf !== undefined) updates.cpf = cpf;
    const birthDate = readOptionalString(body, "birthDate");
    if (birthDate !== undefined) updates.birth_date = birthDate;
    const origin = readOptionalString(body, "origin")?.trim();
    if (origin !== undefined) updates.origin = origin;
    const city = readOptionalString(body, "city")?.trim();
    if (city !== undefined) updates.city = city;
    const profession = readOptionalString(body, "profession")?.trim();
    if (profession !== undefined) updates.profession = profession;
    const company = readOptionalString(body, "company")?.trim();
    if (company !== undefined) updates.company = company;
    const notes = readOptionalString(body, "notes")?.trim();
    if (notes !== undefined) updates.notes = notes;
    const status = readOptionalString(body, "status");
    if (status !== undefined) updates.status = status;

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) {
      throw new CrmError("Cliente não encontrado.", 404);
    }

    const { data: customer, error } = await admin
      .from("customers")
      .update(updates)
      .eq("id", id)
      .eq("profile_id", profileId)
      .select()
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: error?.message ?? "Não foi possível atualizar o cliente." },
        { status: 400 },
      );
    }

    await admin.rpc("crm_register_event", {
      p_profile_id: profileId,
      p_customer_id: id,
      p_event_type: "customer.updated",
      p_source: "crm",
      p_description: "Cliente atualizado no CRM",
    });

    return NextResponse.json({ customer: customer as Customer });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { profileId } = await requireCrmAdmin(undefined, "crm.delete");

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) {
      throw new CrmError("Cliente não encontrado.", 404);
    }

    const { error } = await admin
      .from("customers")
      .update({ status: "inactive", deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Não foi possível inativar o cliente." },
        { status: 400 },
      );
    }

    await admin.rpc("crm_register_event", {
      p_profile_id: profileId,
      p_customer_id: id,
      p_event_type: "customer.updated",
      p_source: "crm",
      p_description: "Cliente inativado no CRM",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
