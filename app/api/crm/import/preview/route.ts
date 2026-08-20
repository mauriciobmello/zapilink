import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, CrmError } from "@/lib/crm/server";
import { crmErrorResponse, readJsonBody } from "@/lib/crm/http";
import { normalizePhone } from "@/lib/crm/format";

export const dynamic = "force-dynamic";

type ImportRow = {
  name: string;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  origin?: string | null;
  city?: string | null;
  profession?: string | null;
  company?: string | null;
};

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

    const { data: existing } = await admin
      .from("customers")
      .select("phone, email")
      .eq("profile_id", profileId)
      .is("deleted_at", null);

    const existingPhones = new Set(
      (existing ?? [])
        .map((c) => c.phone)
        .filter(Boolean) as string[],
    );
    const existingEmails = new Set(
      (existing ?? [])
        .map((c) => c.email)
        .filter(Boolean) as string[],
    );

    const valid: ImportRow[] = [];
    const duplicates: (ImportRow & { reason: string })[] = [];
    const invalid: (ImportRow & { reason: string })[] = [];

    for (const raw of rows) {
      const row = raw as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const phone =
        typeof row.phone === "string" && row.phone.trim()
          ? normalizePhone(row.phone)
          : null;
      const email =
        typeof row.email === "string" && row.email.trim()
          ? row.email.trim().toLowerCase()
          : null;
      const cpf =
        typeof row.cpf === "string" && row.cpf.trim()
          ? row.cpf.replace(/\D/g, "")
          : null;
      const birthDate =
        typeof row.birth_date === "string" && row.birth_date.trim()
          ? row.birth_date.trim()
          : null;
      const origin =
        typeof row.origin === "string" && row.origin.trim()
          ? row.origin.trim()
          : "importacao";

      const importRow: ImportRow = {
        name,
        phone,
        email,
        cpf,
        birth_date: birthDate,
        origin,
        city: typeof row.city === "string" ? row.city.trim() || null : null,
        profession:
          typeof row.profession === "string"
            ? row.profession.trim() || null
            : null,
        company:
          typeof row.company === "string" ? row.company.trim() || null : null,
      };

      if (name.length < 2) {
        invalid.push({ ...importRow, reason: "Nome inválido ou muito curto." });
        continue;
      }

      if (!phone && !email) {
        invalid.push({ ...importRow, reason: "Telefone ou e-mail obrigatório." });
        continue;
      }

      const reasons: string[] = [];
      if (phone && existingPhones.has(phone)) {
        reasons.push("Telefone já cadastrado.");
      }
      if (email && existingEmails.has(email)) {
        reasons.push("E-mail já cadastrado.");
      }

      if (reasons.length > 0) {
        duplicates.push({ ...importRow, reason: reasons.join(" ") });
        continue;
      }

      valid.push(importRow);
    }

    return NextResponse.json({ valid, duplicates, invalid });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
