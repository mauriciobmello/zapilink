import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, listCustomers, CrmError } from "@/lib/crm/server";
import { crmErrorResponse, readJsonBody, readString } from "@/lib/crm/http";
import type { Customer } from "@/types/crm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { profileId } = await requireCrmAdmin(
      url.searchParams.get("profileId"),
      "crm.view",
    );

    const search = url.searchParams.get("search") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
      100,
    );
    const offset =
      parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

    const customers = await listCustomers(profileId, search, status, limit, offset);
    return NextResponse.json({ customers });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { profileId } = await requireCrmAdmin(
      readString(body, "profileId"),
      "crm.create",
    );

    const name = readString(body, "name")?.trim();
    const phone = readString(body, "phone")?.trim() ?? null;
    const email = readString(body, "email")?.trim() ?? null;
    const cpf = readString(body, "cpf")?.trim() ?? null;
    const birthDate = readString(body, "birthDate") ?? null;
    const origin = readString(body, "origin")?.trim() ?? "manual";

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verificar duplicidade por telefone ou email dentro do perfil.
    if (phone || email) {
      const orFilters: string[] = [];
      if (phone) orFilters.push(`phone.eq.${phone}`);
      if (email) orFilters.push(`email.eq.${email}`);

      const { data: existing } = await admin
        .from("customers")
        .select("id, name, phone, email")
        .eq("profile_id", profileId)
        .is("deleted_at", null)
        .or(orFilters.join(","))
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          {
            error: "Possível cliente duplicado.",
            customer: existing,
          },
          { status: 409 },
        );
      }
    }

    const { data: customer, error } = await admin
      .from("customers")
      .insert({
        profile_id: profileId,
        name,
        phone,
        email,
        cpf,
        birth_date: birthDate,
        origin,
      })
      .select()
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: error?.message ?? "Não foi possível criar o cliente." },
        { status: 400 },
      );
    }

    await admin.rpc("crm_register_event", {
      p_profile_id: profileId,
      p_customer_id: customer.id,
      p_event_type: "customer.created",
      p_source: "crm",
      p_description: "Cliente criado no CRM",
    });

    return NextResponse.json({ customer: customer as Customer });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
