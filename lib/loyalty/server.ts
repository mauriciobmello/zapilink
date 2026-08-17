import { notFound } from "next/navigation";
import { getCurrentUser, resolveProfile } from "@/lib/auth";
import type { Profile } from "@/types/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessProfile } from "@/lib/access/authorization";
import { loyaltyPermissions, type LoyaltyPermission } from "./permissions";
import { balanceForCycle, benefitState } from "./progress";
import type {
  LoyaltyBenefitRedemption,
  LoyaltyCustomer,
  LoyaltyCustomerSummary,
  LoyaltyProgram,
  LoyaltyProgramMember,
  LoyaltyStarTransaction,
} from "@/types/loyalty";

export class LoyaltyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface LoyaltyAdminContext {
  userId: string;
  profileId: string;
  program: LoyaltyProgram;
  permissions: Set<LoyaltyPermission>;
}

/**
 * Resolve perfil, programa e permissões a partir da sessão do usuário.
 * O `profileId` recebido do cliente só é aceito depois de confirmar, no
 * servidor, que o usuário é proprietário ou delegado com a permissão pedida.
 */
export async function requireLoyaltyAdmin(
  profileId: string | null | undefined,
  permission: LoyaltyPermission,
): Promise<LoyaltyAdminContext> {
  const user = await getCurrentUser();
  if (!user) {
    throw new LoyaltyError("Sessão expirada.", 401);
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
    throw new LoyaltyError("Perfil não encontrado.", 404);
  }

  const access = await canAccessProfile(user.id, profile.id);
  if (!access.allowed) {
    throw new LoyaltyError("Perfil não encontrado.", 404);
  }

  const permissions = loyaltyPermissions(access.permissions ?? []);
  if (!permissions.has(permission)) {
    throw new LoyaltyError("Sem permissão para esta operação.", 403);
  }

  const program = await getOrCreateProgram(profile.id);

  return { userId: user.id, profileId: profile.id, program, permissions };
}

/**
 * Contexto das páginas do dashboard: resolve o perfil (próprio ou delegado) e
 * responde 404 quando o usuário não tem a permissão de fidelidade pedida.
 */
export async function requireLoyaltyProfilePage(
  userId: string,
  profileId: string | undefined,
  permission: LoyaltyPermission,
): Promise<{ profile: Profile; program: LoyaltyProgram }> {
  const profile = await resolveProfile(userId, profileId);
  const permissions = loyaltyPermissions(profile.access?.permissions ?? []);
  if (!permissions.has(permission)) {
    notFound();
  }
  const program = await getOrCreateProgram(profile.id);
  return { profile, program };
}

export async function getOrCreateProgram(
  profileId: string,
): Promise<LoyaltyProgram> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("loyalty_programs")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (data) return data as LoyaltyProgram;

  const { data: created, error } = await admin
    .from("loyalty_programs")
    .insert({ profile_id: profileId })
    .select()
    .single();
  if (error || !created) {
    throw new LoyaltyError(
      error?.message ?? "Não foi possível criar o programa de fidelidade.",
      500,
    );
  }
  return created as LoyaltyProgram;
}

/** Programa ativo de um perfil público, resolvido pelo username. */
export async function getActiveProgramByUsername(
  username: string,
): Promise<{ profileId: string; program: LoyaltyProgram } | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!program) return null;

  return { profileId: profile.id, program: program as LoyaltyProgram };
}

/** Participação garantidamente pertencente ao programa do contexto. */
export async function requireMemberInProgram(
  programId: string,
  memberId: string,
): Promise<LoyaltyProgramMember> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("loyalty_program_members")
    .select("*")
    .eq("id", memberId)
    .eq("program_id", programId)
    .maybeSingle();
  if (!data) {
    throw new LoyaltyError("Participação não encontrada.", 404);
  }
  return data as LoyaltyProgramMember;
}

export async function memberTransactions(
  memberId: string,
): Promise<LoyaltyStarTransaction[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("loyalty_star_transactions")
    .select("*")
    .eq("program_member_id", memberId)
    .order("granted_at", { ascending: false });
  return (data ?? []) as LoyaltyStarTransaction[];
}

export async function memberRedemptions(
  memberId: string,
): Promise<LoyaltyBenefitRedemption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("loyalty_benefit_redemptions")
    .select("*")
    .eq("program_member_id", memberId)
    .order("redeemed_at", { ascending: false });
  return (data ?? []) as LoyaltyBenefitRedemption[];
}

export async function listCustomerSummaries(
  program: LoyaltyProgram,
  search?: string,
  limit = 100,
): Promise<LoyaltyCustomerSummary[]> {
  const admin = createAdminClient();

  let customersQuery = admin
    .from("loyalty_customers")
    .select("*")
    .eq("profile_id", program.profile_id)
    .order("name", { ascending: true })
    .limit(limit);

  const term = (search ?? "").trim();
  if (term) {
    const like = `%${term.replace(/[%_,]/g, "")}%`;
    customersQuery = customersQuery.or(
      `name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
    );
  }

  const { data: customers } = await customersQuery;
  const list = (customers ?? []) as LoyaltyCustomer[];
  if (list.length === 0) return [];

  const { data: members } = await admin
    .from("loyalty_program_members")
    .select("*")
    .eq("program_id", program.id)
    .in(
      "customer_id",
      list.map((customer) => customer.id),
    );
  const memberList = (members ?? []) as LoyaltyProgramMember[];
  if (memberList.length === 0) return [];

  const { data: transactions } = await admin
    .from("loyalty_star_transactions")
    .select("program_member_id, cycle, stars")
    .in(
      "program_member_id",
      memberList.map((member) => member.id),
    );
  const txByMember = new Map<
    string,
    Pick<LoyaltyStarTransaction, "cycle" | "stars">[]
  >();
  for (const tx of (transactions ?? []) as Pick<
    LoyaltyStarTransaction,
    "program_member_id" | "cycle" | "stars"
  >[]) {
    const bucket = txByMember.get(tx.program_member_id) ?? [];
    bucket.push({ cycle: tx.cycle, stars: tx.stars });
    txByMember.set(tx.program_member_id, bucket);
  }

  const customerById = new Map(list.map((customer) => [customer.id, customer]));

  return memberList
    .map((member) => {
      const customer = customerById.get(member.customer_id);
      if (!customer) return null;
      const stars = balanceForCycle(
        txByMember.get(member.id) ?? [],
        member.current_cycle,
      );
      return {
        customer,
        member_id: member.id,
        status: member.status,
        joined_at: member.joined_at,
        stars_current: stars,
        stars_required: program.stars_required,
        benefit_state: benefitState(stars, program.stars_required),
      } satisfies LoyaltyCustomerSummary;
    })
    .filter((item): item is LoyaltyCustomerSummary => item !== null)
    .sort((a, b) => a.customer.name.localeCompare(b.customer.name, "pt-BR"));
}

interface AuditInput {
  event: string;
  actorUserId?: string | null;
  profileId: string;
  programId?: string | null;
  customerId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logLoyaltyEvent(input: AuditInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("loyalty_audit_events").insert({
      event: input.event,
      actor_user_id: input.actorUserId ?? null,
      profile_id: input.profileId,
      program_id: input.programId ?? null,
      customer_id: input.customerId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Auditoria não pode invalidar a operação principal.
  }
}

const RPC_ERROR_STATUS: Record<string, number> = {
  LY001: 404,
  LY002: 409,
  LY003: 400,
  LY004: 409,
  LY005: 409,
  LY006: 409,
  LY007: 409,
};

/** Erros dos RPCs traduzidos em status HTTP pelo SQLSTATE customizado. */
export function rpcErrorStatus(error: {
  code?: string | null;
  message?: string | null;
}): number {
  const code = error.code?.toUpperCase();
  if (code && RPC_ERROR_STATUS[code]) return RPC_ERROR_STATUS[code];

  const message = error.message ?? "";
  const fromMessage = Object.keys(RPC_ERROR_STATUS).find((key) =>
    message.includes(key),
  );
  if (fromMessage) return RPC_ERROR_STATUS[fromMessage];

  return 500;
}
