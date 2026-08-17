import type { Permission } from "@/types/access";

export const LOYALTY_PERMISSIONS = [
  "loyalty.view",
  "loyalty.customers.view",
  "loyalty.customers.manage",
  "loyalty.stars.add",
  "loyalty.stars.reverse",
  "loyalty.benefits.view",
  "loyalty.benefits.redeem",
  "loyalty.settings.edit",
] as const satisfies readonly Permission[];

export type LoyaltyPermission = (typeof LOYALTY_PERMISSIONS)[number];

export function isLoyaltyPermission(
  permission: Permission,
): permission is LoyaltyPermission {
  return (LOYALTY_PERMISSIONS as readonly Permission[]).includes(permission);
}

/** Subconjunto de fidelidade das permissões concedidas ao usuário no perfil. */
export function loyaltyPermissions(
  permissions: Permission[],
): Set<LoyaltyPermission> {
  return new Set(permissions.filter(isLoyaltyPermission));
}
