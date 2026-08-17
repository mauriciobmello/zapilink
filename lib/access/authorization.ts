import { createAdminClient } from "@/lib/supabase/admin";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Permission, AccessCheck } from "@/types/access";
import { getDefaultPermissions } from "./permissions";

/**
 * Verifica se um usuário tem acesso a um perfil com determinada permissão
 * @param userId - ID do usuário autenticado
 * @param profileId - ID do perfil sendo acessado
 * @param permission - Permissão específica a verificar
 * @returns Objeto com allowed, role e permissions
 */
export async function canAccessProfile(
  userId: string,
  profileId: string,
  permission?: Permission
): Promise<AccessCheck> {
  const admin = createAdminClient();

  // 1. Verificar se o usuário é o proprietário do perfil
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .single();

  if (!profile) {
    return { allowed: false };
  }

  // Se for o proprietário, tem acesso total
  if (profile.user_id === userId) {
    return {
      allowed: true,
      role: "owner",
      permissions: getDefaultPermissions("full"),
    };
  }

  // 2. Se não for proprietário, verificar se existe delegação ativa
  const { data: access } = await admin
    .from("profile_access")
    .select("*")
    .eq("profile_id", profileId)
    .eq("grantee_user_id", userId)
    .eq("status", "active")
    .single();

  if (!access) {
    return { allowed: false };
  }

  // 3. Obter permissões da delegação
  const { data: permissions } = await admin
    .from("profile_access_permissions")
    .select("permission")
    .eq("profile_access_id", access.id);

  const userPermissions = (permissions ?? []).map((p) => p.permission as Permission);

  // 4. Se uma permissão específica foi solicitada, verificar
  if (permission && !userPermissions.includes(permission)) {
    return { allowed: false };
  }

  return {
    allowed: true,
    role: "delegate",
    permissions: userPermissions,
  };
}

/**
 * Verifica se o usuário é proprietário do perfil
 */
export async function isProfileOwner(
  userId: string,
  profileId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .single();

  return profile?.user_id === userId;
}

/**
 * Obtém todos os perfis que o usuário pode acessar (client-side)
 * Retorna tanto os próprios quanto os delegados
 */
export async function getAccessibleProfiles(userId: string) {
  const supabase = createBrowserClient();

  // 1. Obter perfis próprios
  const { data: ownedProfiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId);

  // 2. Obter perfis delegados com permissões
  const { data: delegatedAccess } = await supabase
    .from("profile_access")
    .select(`
      *,
      profile_access_permissions (permission)
    `)
    .eq("grantee_user_id", userId)
    .eq("status", "active");

  // 3. Obter detalhes dos perfis delegados
  const delegatedProfileIds = (delegatedAccess ?? []).map((a) => a.profile_id);
  const { data: delegatedProfiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", delegatedProfileIds);

  // 4. Mapear permissões para cada perfil delegado
  const delegatedWithPermissions = (delegatedProfiles ?? []).map((profile) => {
    const access = delegatedAccess?.find((a) => a.profile_id === profile.id);
    const permissions = access?.profile_access_permissions?.map((p: any) => p.permission) ?? [];
    return {
      ...profile,
      access: {
        permissions,
        owner_user_id: access?.owner_user_id,
      },
    };
  });

  return {
    owned: ownedProfiles ?? [],
    delegated: delegatedWithPermissions,
  };
}

export interface ResolveProfileAccessResult {
  role: "owner" | "delegate";
  permissions: Permission[];
  profileId: string;
}

/**
 * Resolve o acesso do usuário a um perfil incluindo permissões
 */
export async function resolveProfileAccess(
  userId: string,
  profileId: string
): Promise<ResolveProfileAccessResult | null> {
  const access = await canAccessProfile(userId, profileId);
  if (!access.allowed) return null;

  return {
    role: access.role as "owner" | "delegate",
    permissions: access.permissions as Permission[],
    profileId,
  };
}

/**
 * Verifica se o usuário tem uma permissão específica no perfil
 */
export async function hasPermission(
  userId: string,
  profileId: string,
  permission: Permission
): Promise<boolean> {
  const access = await canAccessProfile(userId, profileId, permission);
  return access.allowed;
}
