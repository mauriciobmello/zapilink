import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verificar se o usuário é proprietário do perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      );
    }

    if (profile.user_id !== user.id) {
      await securityLogger.warn("Non-owner tried to list access", {
        userId: user.id,
        profileId,
      });
      return NextResponse.json(
        { error: "Você não é proprietário deste perfil" },
        { status: 403 }
      );
    }

    // Buscar todos os acessos do perfil com permissões
    const { data: accessList, error } = await supabase
      .from("profile_access")
      .select(`
        *,
        profile_access_permissions (permission)
      `)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ accessList: accessList || [] });
  } catch (error) {
    console.error("Error listing access:", error);
    await securityLogger.error("Failed to list access", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Erro ao listar acessos" },
      { status: 500 }
    );
  }
}
