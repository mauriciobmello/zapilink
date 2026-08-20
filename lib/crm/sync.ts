import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/crm/format";

type CustomerSource = "agenda" | "fidelidade" | "manual" | "outro";

interface UpsertInput {
  profileId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source: CustomerSource;
}

function displayName(input: CustomerSource): string {
  switch (input) {
    case "agenda":
      return "Agenda";
    case "fidelidade":
      return "Fidelidade";
    case "manual":
      return "Cadastro manual";
    default:
      return "Outro";
  }
}

export async function upsertCustomerFromEvent(
  input: UpsertInput,
): Promise<string | null> {
  const { profileId, name, phone, email, source } = input;
  const admin = createAdminClient();

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const normalizedEmail = email ? email.trim().toLowerCase() : null;

  if (!normalizedPhone && !normalizedEmail) {
    return null;
  }

  const filters: string[] = [];
  if (normalizedPhone) filters.push(`phone.eq.${normalizedPhone}`);
  if (normalizedEmail) filters.push(`email.eq.${normalizedEmail}`);

  const { data: existing } = await admin
    .from("customers")
    .select("id, name, origin")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .or(filters.join(","))
    .maybeSingle();

  if (existing) {
    // Atualiza o nome e, quando a origem for Fidelidade/Agenda, marca a
    // fonte real de aquisição. Nunca sobrescreve "manual" por "outro".
    const updates: Record<string, unknown> = { name: name.trim() };
    const currentOrigin = (existing.origin ?? "manual") as CustomerSource;
    if (
      source === "fidelidade" ||
      source === "agenda" ||
      currentOrigin === "manual"
    ) {
      updates.origin = source;
    }

    const { error } = await admin
      .from("customers")
      .update(updates)
      .eq("id", existing.id)
      .eq("profile_id", profileId);

    if (!error) {
      await admin.rpc("crm_register_event", {
        p_profile_id: profileId,
        p_customer_id: existing.id,
        p_event_type: source === "fidelidade" ? "loyalty.updated" : "customer.updated",
        p_source: source,
        p_description: `Cliente vinculado à origem ${displayName(source)}`,
      });
    }

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
    p_description: `Cliente criado a partir de ${displayName(source)}`,
  });

  return customer.id;
}

export async function syncCrmLoyaltyPoints(
  profileId: string,
  loyaltyCustomerId: string,
  points: number,
): Promise<void> {
  const admin = createAdminClient();

  const { data: loyaltyCustomer } = await admin
    .from("loyalty_customers")
    .select("name, phone, email")
    .eq("id", loyaltyCustomerId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!loyaltyCustomer) return;

  const normalizedPhone = loyaltyCustomer.phone
    ? normalizePhone(loyaltyCustomer.phone)
    : null;
  const normalizedEmail = loyaltyCustomer.email
    ? loyaltyCustomer.email.trim().toLowerCase()
    : null;

  const filters: string[] = [];
  if (normalizedPhone) filters.push(`phone.eq.${normalizedPhone}`);
  if (normalizedEmail) filters.push(`email.eq.${normalizedEmail}`);
  if (filters.length === 0) return;

  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .or(filters.join(","))
    .maybeSingle();
  if (!customer) return;

  await admin.rpc("crm_register_event", {
    p_profile_id: profileId,
    p_customer_id: customer.id,
    p_event_type: "loyalty.updated",
    p_source: "fidelidade",
    p_reference_id: loyaltyCustomerId,
    p_description: `Pontos de fidelidade atualizados: ${points}`,
    p_metadata: { points },
  });
}
