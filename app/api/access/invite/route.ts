import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { securityLogger } from "@/lib/security-logger";
import { sendInviteEmail } from "@/lib/access/invite-email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const supabase = createAdminClient();

    const body = await request.json();
    const { profileId, email, permissions } = body;

    if (!profileId || !email || !permissions) {
      return NextResponse.json(
        { error: "Campos obrigatórios: profileId, email, permissions" },
        { status: 400 }
      );
    }

    // 1. Verificar se o usuário é proprietário do perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, username, user_id")
      .eq("id", profileId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    if (profile.user_id !== user.id) {
      await securityLogger.warn("Non-owner attempted to invite admin", {
        userId: user.id,
        profileId,
        email,
      });
      return NextResponse.json(
        { error: "Você não é proprietário deste perfil" },
        { status: 403 }
      );
    }

    // 2. Verificar se o e-mail existe no sistema
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const invitedUser = existingUser.users.find((u) => u.email === email);

    if (!invitedUser) {
      return NextResponse.json(
        {
          error: "Este e-mail ainda não possui uma conta ZAPILINK. Peça para o usuário criar uma conta antes de conceder o acesso.",
        },
        { status: 400 }
      );
    }

    // 3. Verificar se já existe um convite para este usuário neste perfil
    const { data: existingAccess } = await supabase
      .from("profile_access")
      .select("*")
      .eq("profile_id", profileId)
      .eq("grantee_user_id", invitedUser.id)
      .single();

    if (existingAccess) {
      if (existingAccess.status === "active") {
        return NextResponse.json(
          { error: "Este usuário já tem acesso ativo a este perfil" },
          { status: 400 }
        );
      }
      if (existingAccess.status === "pending") {
        return NextResponse.json(
          { error: "Já existe um convite pendente para este usuário" },
          { status: 400 }
        );
      }
    }

    // 4. Criar o convite com token UUID
    const { data: access, error: accessError } = await supabase
      .from("profile_access")
      .insert({
        profile_id: profileId,
        owner_user_id: user.id,
        grantee_user_id: invitedUser.id,
        status: "pending",
        invited_email: email,
      })
      .select()
      .single();

    if (accessError) {
      throw accessError;
    }

    // 5. Criar as permissões
    const permissionsToInsert = permissions.map((permission: string) => ({
      profile_access_id: access.id,
      permission,
    }));

    const { error: permissionsError } = await supabase
      .from("profile_access_permissions")
      .insert(permissionsToInsert);

    if (permissionsError) {
      throw permissionsError;
    }

    // 6. Enviar e-mail de convite
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/dashboard/access/invite/${access.invite_token}`;

    try {
      await sendInviteEmail({
        recipient: email,
        profileName: profile.name || profile.username,
        ownerEmail: user.email || "",
        inviteUrl,
      });
    } catch (emailError) {
      // Não falhar o convite se o e-mail não for enviado, mas logar
      console.error("Failed to send invite email:", emailError);
      await securityLogger.warn("Invite email failed", {
        accessId: access.id,
        error: emailError instanceof Error ? emailError.message : "Unknown error",
      });
    }

    await securityLogger.info("Access invite created", {
      profileId,
      invitedEmail: email,
      invitedUserId: invitedUser.id,
      permissions,
    });

    return NextResponse.json({
      success: true,
      accessId: access.id,
      inviteUrl,
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    await securityLogger.error("Failed to create access invite", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Erro ao criar convite" },
      { status: 500 }
    );
  }
}
