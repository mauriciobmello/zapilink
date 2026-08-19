import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/crm/format";

type CustomerSource = "agenda" | "fidelity" | "manual" | "other";

export async function upsertCustomerFromEvent(input: {
  profileId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source: CustomerSource;
}): Promise<string | null> {
  const { profileId, name, phone, email, source } = input;
  const admin = createAdminClient();

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const normalizedEmail = email ? email.trim().toLowerCase() : null;

  if (!normalizedPhone && !normalizedEmail) {
    return null;
  }

  // Tenta localizar um cliente existente no CRM pelo telefone ou e-mail.
  const filters: string[] = [];
  if (normalizedPhone) filters.push(`phone.eq.${normalizedPhone}`);
  if (normalizedEmail) filters.push(`email.eq.${normalizedEmail}`);

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .or(filters.join(","))
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: customer, error } = await admin
    .from("customers")
    .insert({
      profile_id: profileId,
      name: name.trim(),
      phone: normalizedPhone,
      email: normalizedEmail,
      origin: source,
    })
    .select("id")
    .single();

  if (error || !customer) {
    return null;
  }

  await admin.rpc("crm_register_event", {
    p_profile_id: profileId,
    p_customer_id: customer.id,
    p_event_type: "customer.created",
    p_source: source,
    p_description: `Cliente criado a partir de ${source}`,
  });

  return customer.id;
}
