import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { securityLogger } from "@/lib/security-logger";
import { sendInviteEmail } from "@/lib/access/invite-email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { accessId } = await request.json();
    if (!accessId) {
      return NextResponse.json(
        { error: "accessId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Buscar o convite com dados do perfil
    const { data: access, error } = await supabase
      .from("profile_access")
      .select(`
        *,
        profiles (name, username)
      `)
      .eq("id", accessId)
      .eq("owner_user_id", user.id)
      .single();

    if (error || !access) {
      return NextResponse.json(
        { error: "Convite não encontrado" },
        { status: 404 }
      );
    }

    if (access.status !== "pending") {
      return NextResponse.json(
        { error: "Apenas convites pendentes podem ser reenviados" },
        { status: 400 }
      );
    }

    // Reenviar e-mail
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/dashboard/access/invite/${access.invite_token}`;

    await sendInviteEmail({
      recipient: access.invited_email,
      profileName: access.profiles?.name || access.profiles?.username,
      ownerEmail: user.email || "",
      inviteUrl,
    });

    await securityLogger.info("Access invite resent", {
      accessId,
      email: access.invited_email,
    });

    return NextResponse.json({
      success: true,
      inviteUrl,
    });
  } catch (error) {
    console.error("Error resending invite:", error);
    await securityLogger.error("Failed to resend access invite", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Erro ao reenviar convite" },
      { status: 500 }
    );
  }
}
