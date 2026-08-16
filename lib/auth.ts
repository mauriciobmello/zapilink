import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessProfile } from "@/lib/access/authorization";
import type { Profile, ProfileAccessInfo } from "@/types/profile";
import type { Permission } from "@/types/access";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

const ALL_PERMISSIONS: Permission[] = [
  "profile.view",
  "profile.edit",
  "theme.edit",
  "social_links.edit",
  "blocks.view",
  "blocks.edit",
  "schedule.view",
  "schedule.edit",
  "bookings.view",
  "bookings.manage",
  "page.publish",
];

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return {
      ...data,
      access: {
        role: "owner" as const,
        permissions: ALL_PERMISSIONS,
      },
    } as Profile;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0
        ? `user_${userId.slice(0, 8).toLowerCase()}`
        : `user_${Math.random().toString(36).slice(2, 12)}`;

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({ user_id: userId, username: candidate })
      .select()
      .single();

    if (!insertError && created) {
      return {
        ...created,
        access: {
          role: "owner" as const,
          permissions: ALL_PERMISSIONS,
        },
      } as Profile;
    }

    const isUsernameConflict =
      insertError?.code === "23505" &&
      insertError.message.includes("username");
    if (!isUsernameConflict) {
      throw new Error(
        insertError?.message ?? "Não foi possível criar seu perfil.",
      );
    }
  }

  throw new Error("Não foi possível criar seu perfil. Tente novamente.");
}


export async function getSiteUrl() {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ??
    headersList.get("host") ??
    "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function listUserProfiles(userId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Profile[];
}

export async function resolveProfile(
  userId: string,
  profileId?: string,
): Promise<Profile> {
  const supabase = await createClient();
  const admin = createAdminClient();

  if (profileId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (profile) {
      // Verificar acesso usando service role (bypass RLS)
      const access = await canAccessProfile(userId, profileId);
      if (access.allowed) {
        return {
          ...profile,
          access: {
            role: access.role as "owner" | "delegate",
            permissions: access.permissions as Permission[],
          },
        } as Profile;
      }

      // Sem acesso: retornar 404
      return {
        ...profile,
        access: { role: null, permissions: [] } as unknown as ProfileAccessInfo,
      } as unknown as Profile;
    }
  }

  // Se nenhum profileId for fornecido ou não encontrado, retorna o primeiro perfil próprio
  return getOrCreateProfile(userId);
}

export async function createProfile(
  userId: string,
  username: string,
): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId, username })
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as Profile;
}
