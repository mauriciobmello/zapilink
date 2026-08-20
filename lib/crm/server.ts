import { notFound } from "next/navigation";
import { getCurrentUser, resolveProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessProfile } from "@/lib/access/authorization";
import type { Permission } from "@/types/access";
import type { Profile } from "@/types/profile";
import { balanceForCycle, benefitState } from "@/lib/loyalty/progress";
import type { Customer, CustomerSummary } from "@/types/crm";
import type {
  LoyaltyBenefitRedemption,
  LoyaltyProgram,
  LoyaltyProgramMember,
  LoyaltyStarTransaction,
} from "@/types/loyalty";

export class CrmError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireCrmProfilePage(
  userId: string,
  profileId: string | undefined,
  permission: Permission,
): Promise<Profile> {
  const profile = await resolveProfile(userId, profileId);
  if (!profile.access?.permissions.includes(permission)) {
    notFound();
  }
  return profile;
}

export interface CrmAdminContext {
  userId: string;
  profileId: string;
  permissions: Set<Permission>;
}

export async function requireCrmAdmin(
  profileId: string | null | undefined,
  permission: Permission,
): Promise<CrmAdminContext> {
  const user = await getCurrentUser();
  if (!user) {
    throw new CrmError("Sessão expirada.", 401);
  }

  const admin = createAdminClient();
  const { data: profile } = profileId
    ? await admin.from("profiles").select("id").eq("id", profileId).maybeSingle()
    : await admin
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

  if (!profile) {
    throw new CrmError("Perfil não encontrado.", 404);
  }

  const access = await canAccessProfile(user.id, profile.id);
  if (!access.allowed) {
    throw new CrmError("Perfil não encontrado.", 404);
  }

  const permissions = new Set<Permission>(access.permissions ?? []);
  if (!permissions.has(permission)) {
    throw new CrmError("Sem permissão para esta operação.", 403);
  }

  return { userId: user.id, profileId: profile.id, permissions };
}

export async function listCustomers(
  profileId: string,
  search?: string,
  status?: string,
  limit = 50,
  offset = 0,
): Promise<CustomerSummary[]> {
  const admin = createAdminClient();

  let query = admin
    .from("customers")
    .select("*")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const term = (search ?? "").trim();
  if (term) {
    const clean = term.replace(/[%_,]/g, "");
    if (clean) {
      const like = `%${clean}%`;
      query = query.or(
        `name.ilike.${like},phone.ilike.${like},email.ilike.${like}`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new CrmError(error.message, 500);
  }

  const customers = (data ?? []) as Customer[];
  if (customers.length === 0) return [];

  const customerIds = customers.map((c) => c.id);
  const { data: relations } = await admin
    .from("customer_tag_relations")
    .select("customer_id, tag_id")
    .in("customer_id", customerIds);

  const tagIds = Array.from(new Set((relations ?? []).map((r) => r.tag_id as string)));
  const { data: tags } = tagIds.length
    ? await admin
        .from("customer_tags")
        .select("*")
        .in("id", tagIds)
        .eq("status", "active")
    : { data: [] };

  const tagsById = new Map((tags ?? []).map((t) => [t.id, t]));
  const relationsByCustomer = new Map<string, string[]>();
  for (const r of (relations ?? []) as { customer_id: string; tag_id: string }[]) {
    const bucket = relationsByCustomer.get(r.customer_id) ?? [];
    bucket.push(r.tag_id);
    relationsByCustomer.set(r.customer_id, bucket);
  }

  return customers.map((customer) => {
    const tagIdsForCustomer = relationsByCustomer.get(customer.id) ?? [];
    const customerTags = tagIdsForCustomer
      .map((id) => tagsById.get(id))
      .filter(Boolean) as unknown as CustomerSummary["tags"];
    return { ...customer, tags: customerTags };
  });
}

export async function getCustomer(
  profileId: string,
  customerId: string,
): Promise<CustomerSummary | null> {
  const admin = createAdminClient();

  const { data: customer, error } = await admin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new CrmError(error.message, 500);
  }
  if (!customer) return null;

  const { data: relations } = await admin
    .from("customer_tag_relations")
    .select("tag_id")
    .eq("customer_id", customerId);

  const tagIds = (relations ?? []).map((r) => r.tag_id);
  const { data: tags } = tagIds.length
    ? await admin.from("customer_tags").select("*").in("id", tagIds)
    : { data: [] };

  return {
    ...(customer as Customer),
    tags: (tags ?? []) as CustomerSummary["tags"],
  };
}

export interface CrmMetrics {
  total: number;
  active: number;
  new: number;
  inactive: number;
  vip: number;
}

export async function getCrmMetrics(profileId: string): Promise<CrmMetrics> {
  const admin = createAdminClient();

  const now = new Date().toISOString();
  const activeSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const newSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: totalRows } = await admin
    .from("customers")
    .select("id, status, is_vip, last_interaction_at, created_at", { count: "exact" })
    .eq("profile_id", profileId)
    .is("deleted_at", null);

  const rows = (totalRows ?? []) as Customer[];

  const active = rows.filter(
    (c) =>
      c.status === "active" &&
      c.last_interaction_at &&
      new Date(c.last_interaction_at).toISOString() > activeSince,
  ).length;

  const newCustomers = rows.filter(
    (c) => new Date(c.created_at).toISOString() > newSince,
  ).length;

  const inactive = rows.filter(
    (c) =>
      !c.last_interaction_at ||
      new Date(c.last_interaction_at).toISOString() < activeSince,
  ).length;

  return {
    total: rows.length,
    active,
    new: newCustomers,
    inactive,
    vip: rows.filter((c) => c.is_vip).length,
  };
}

export interface CustomerLoyaltyInfo {
  customer: LoyaltyProgramMember | null;
  program: LoyaltyProgram | null;
  stars_current: number;
  stars_required: number;
  benefit_state: "progress" | "completed" | "redeemed";
  redemptions: LoyaltyBenefitRedemption[];
  last_transaction_at: string | null;
}

export async function getCustomerLoyaltyInfo(
  profileId: string,
  customer: Customer,
): Promise<CustomerLoyaltyInfo | null> {
  const admin = createAdminClient();

  const orFilters: string[] = [];
  if (customer.phone) orFilters.push(`phone.eq.${customer.phone}`);
  if (customer.email) orFilters.push(`email.eq.${customer.email}`);
  if (orFilters.length === 0) return null;

  const { data: loyaltyCustomer } = await admin
    .from("loyalty_customers")
    .select("id")
    .eq("profile_id", profileId)
    .or(orFilters.join(","))
    .maybeSingle();
  if (!loyaltyCustomer) return null;

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!program) return null;

  const { data: member } = await admin
    .from("loyalty_program_members")
    .select("*")
    .eq("program_id", program.id)
    .eq("customer_id", loyaltyCustomer.id)
    .maybeSingle();

  if (!member) {
    return {
      customer: null,
      program: program as LoyaltyProgram,
      stars_current: 0,
      stars_required: program.stars_required,
      benefit_state: "progress",
      redemptions: [],
      last_transaction_at: null,
    };
  }

  const { data: transactions } = await admin
    .from("loyalty_star_transactions")
    .select("*")
    .eq("program_member_id", member.id)
    .order("granted_at", { ascending: false });

  const { data: redemptions } = await admin
    .from("loyalty_benefit_redemptions")
    .select("*")
    .eq("program_member_id", member.id)
    .order("redeemed_at", { ascending: false });

  const stars = balanceForCycle(
    (transactions ?? []) as LoyaltyStarTransaction[],
    member.current_cycle,
  );

  const lastTx = (transactions ?? [])[0] as LoyaltyStarTransaction | undefined;

  return {
    customer: member as LoyaltyProgramMember,
    program: program as LoyaltyProgram,
    stars_current: stars,
    stars_required: program.stars_required,
    benefit_state: benefitState(stars, program.stars_required),
    redemptions: (redemptions ?? []) as LoyaltyBenefitRedemption[],
    last_transaction_at: lastTx?.granted_at ?? null,
  };
}
