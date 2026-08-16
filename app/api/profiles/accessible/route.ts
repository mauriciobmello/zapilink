import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Perfis próprios
    const { data: ownedProfiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id);

    // Acessos delegados ativos
    const { data: delegatedAccess } = await supabase
      .from("profile_access")
      .select(`
        *,
        profile_access_permissions (permission)
      `)
      .eq("grantee_user_id", user.id)
      .eq("status", "active");

    const delegatedProfileIds = (delegatedAccess ?? []).map((a) => a.profile_id);

    let delegatedProfiles: any[] = [];
    if (delegatedProfileIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id", delegatedProfileIds);

      delegatedProfiles = (data ?? []).map((profile) => {
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
    }

    return NextResponse.json({
      owned: ownedProfiles || [],
      delegated: delegatedProfiles,
    });
  } catch (error) {
    console.error("Error loading accessible profiles:", error);
    return NextResponse.json(
      { error: "Erro ao carregar perfis" },
      { status: 500 }
    );
  }
}
