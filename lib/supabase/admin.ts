import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY para operações administrativas.",
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getProfileOwnerEmail(
  profileId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return null;
  const { data: user } = await admin.auth.admin.getUserById(profile.user_id);
  return user?.user?.email ?? null;
}