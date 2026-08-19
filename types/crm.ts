export type CustomerStatus = "active" | "inactive" | "archived";

export interface Customer {
  id: string;
  profile_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  origin: string | null;
  city: string | null;
  profession: string | null;
  company: string | null;
  notes: string | null;
  preferences: Record<string, unknown>;
  status: CustomerStatus;
  is_vip: boolean;
  last_interaction_at: string | null;
  last_purchase_at: string | null;
  last_appointment_at: string | null;
  purchase_count: number;
  total_spent: number;
  average_ticket: number;
  appointment_count: number;
  purchase_frequency: number;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CustomerTag {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  profile_id: string;
  customer_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerEvent {
  id: string;
  profile_id: string;
  customer_id: string;
  event_type: string;
  source: string;
  reference_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CustomerSummary extends Customer {
  tags: CustomerTag[];
}
