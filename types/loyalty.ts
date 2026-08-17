export type MemberStatus = "active" | "completed" | "cancelled" | "blocked";
export type BenefitState = "progress" | "completed" | "redeemed";

export interface LoyaltyProgram {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  rules: string | null;
  stars_required: number;
  benefit_description: string | null;
  reset_on_redeem: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyCustomer {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgramMember {
  id: string;
  program_id: string;
  customer_id: string;
  status: MemberStatus;
  current_cycle: number;
  lookup_token: string;
  consent_at: string | null;
  consent_version: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyStarTransaction {
  id: string;
  program_member_id: string;
  cycle: number;
  stars: number;
  service_description: string | null;
  notes: string | null;
  reverses_transaction_id: string | null;
  granted_by: string | null;
  granted_at: string;
  created_at: string;
}

export interface LoyaltyBenefitRedemption {
  id: string;
  program_member_id: string;
  cycle: number;
  stars_used: number;
  benefit_description: string | null;
  notes: string | null;
  redeemed_by: string | null;
  redeemed_at: string;
  created_at: string;
}

/** Cliente + progresso, como exibido no dashboard. */
export interface LoyaltyCustomerSummary {
  customer: LoyaltyCustomer;
  member_id: string;
  status: MemberStatus;
  joined_at: string;
  stars_current: number;
  stars_required: number;
  benefit_state: BenefitState;
}

/** Progresso exposto ao cliente na consulta pública (sem dados sensíveis). */
export interface LoyaltyPublicProgress {
  first_name: string;
  stars_current: number;
  stars_required: number;
  benefit_state: BenefitState;
  benefit_description: string | null;
}
