import { createClient } from "@/lib/supabase/server";
import { getProfileTheme, type ProfileTheme } from "@/lib/profileTheme";
import type { LoyaltyProgram } from "@/types/loyalty";
import type { Profile } from "@/types/profile";

export interface PublicLoyaltyContext {
  profile: Profile;
  program: LoyaltyProgram | null;
  theme: ProfileTheme;
}

/**
 * Contexto público das páginas `/[username]/loyalty*`. Usa o cliente com RLS:
 * somente programas ativos são visíveis.
 */
export async function loadPublicLoyalty(
  username: string,
): Promise<PublicLoyaltyContext | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();

  return {
    profile: profile as Profile,
    program: (program ?? null) as LoyaltyProgram | null,
    theme: getProfileTheme(profile as Profile),
  };
}
