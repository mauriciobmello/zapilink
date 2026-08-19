export type AccessStatus = "pending" | "active" | "revoked" | "expired";

export type Permission =
  | "profile.view"
  | "profile.edit"
  | "theme.edit"
  | "social_links.edit"
  | "blocks.view"
  | "blocks.edit"
  | "schedule.view"
  | "schedule.edit"
  | "bookings.view"
  | "bookings.manage"
  | "loyalty.view"
  | "loyalty.customers.view"
  | "loyalty.customers.manage"
  | "loyalty.stars.add"
  | "loyalty.stars.reverse"
  | "loyalty.benefits.view"
  | "loyalty.benefits.redeem"
  | "loyalty.settings.edit"
  | "page.publish"
  | "crm.view"
  | "crm.create"
  | "crm.update"
  | "crm.delete"
  | "crm.export"
  | "crm.import"
  | "crm.tags.manage"
  | "crm.segments.manage";

export interface ProfileAccess {
  id: string;
  profile_id: string;
  owner_user_id: string;
  grantee_user_id: string;
  status: AccessStatus;
  invited_email: string;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileAccessPermission {
  id: string;
  profile_access_id: string;
  permission: Permission;
  created_at: string;
}

export interface AccessRole {
  role: "owner" | "delegate";
  permissions: Permission[];
}

export interface AccessCheck {
  allowed: boolean;
  role?: "owner" | "delegate";
  permissions?: Permission[];
}
