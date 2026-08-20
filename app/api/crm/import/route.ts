import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, CrmError } from "@/lib/crm/server";
import { crmErrorResponse, readJsonBody } from "@/lib/crm/http";
import type { Customer } from "@/types/crm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { profileId } = await requireCrmAdmin(
      typeof body.profileId === "string" ? body.profileId : null,
      "crm.import",
    );
    const rows = Array.isArray(body.rows) ? (body.rows as unknown[]) : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha para importar." }, { status: 400 });
    }

    const admin = createAdminClient();

    const toInsert = rows
      .map((raw) => raw as Record<string, unknown>)
      .filter((row) => typeof row.name === "string" && row.name.trim().length >= 2)
      .map((row) => ({
        profile_id: profileId,
        name: String(row.name).trim(),
        phone: row.phone ? String(row.phone) : null,
        email: row.email ? String(row.email).toLowerCase() : null,
        cpf: row.cpf ? String(row.cpf).replace(/\D/g, "") : null,
        birth_date: row.birth_date ? String(row.birth_date) : null,
        origin: String(row.origin || "importacao"),
        city: row.city ? String(row.city) : null,
        profession: row.profession ? String(row.profession) : null,
        company: row.company ? String(row.company) : null,
      }));

    const { data, error } = await admin
      .from("customers")
      .insert(toInsert)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const imported = (data ?? []) as Customer[];
    for (const customer of imported) {
      await admin.rpc("crm_register_event", {
        p_profile_id: profileId,
        p_customer_id: customer.id,
        p_event_type: "customer.created",
        p_source: "importacao",
        p_description: "Cliente importado via CSV",
      });
    }

    return NextResponse.json({
      imported: imported.length,
      total: toInsert.length,
    });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
