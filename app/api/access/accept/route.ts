import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json(
        { error: "token é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Buscar o convite pelo token
    const { data: access, error } = await supabase
      .from("profile_access")
      .select(`
        *,
        profiles (name, username)
      `)
      .eq("invite_token", token)
      .eq("status", "pending")
      .single();

    if (error || !access) {
      return NextResponse.json(
        { error: "Convite não encontrado, já aceito ou expirado" },
        { status: 404 }
      );
    }

    // Verificar se o usuário autenticado é o destinatário
    if (access.grantee_user_id !== user.id) {
      return NextResponse.json(
        { error: "Este convite não é destinado ao seu usuário" },
        { status: 403 }
      );
    }

    // Aceitar o convite
    const { error: updateError } = await supabase
      .from("profile_access")
      .update({
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", access.id)
      .eq("status", "pending");

    if (updateError) throw updateError;

    await securityLogger.info("Access invite accepted", {
      userId: user.id,
      token,
      accessId: access.id,
    });

    return NextResponse.json({
      success: true,
      accessId: access.id,
      profileName: access.profiles?.name || access.profiles?.username,
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    await securityLogger.error("Failed to accept access invite", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Erro ao aceitar convite" },
      { status: 500 }
    );
  }
}
