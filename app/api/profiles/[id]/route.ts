import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { resolveProfileAccess } from "@/lib/access/authorization";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id: profileId } = await params;

  const access = await resolveProfileAccess(user.id, profileId);
  if (!access || access.role !== "owner") {
    await securityLogger.warn("Unauthorized profile deletion attempt", {
      userId: user.id,
      profileId,
    });
    return NextResponse.json(
      { error: "Você não tem permissão para excluir este perfil" },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  // Verificar se o perfil pertence ao usuário
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    await securityLogger.warn("Profile deletion failed - profile not found or unauthorized", {
      userId: user.id,
      profileId: profileId,
    });
    return NextResponse.json(
      { error: "Perfil não encontrado ou você não tem permissão para excluí-lo." },
      { status: 404 }
    );
  }

  // Verificar se é o único perfil do usuário
  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id);

  if (allProfiles && allProfiles.length <= 1) {
    await securityLogger.warn("Profile deletion failed - last profile", {
      userId: user.id,
      profileId: profileId,
    });
    return NextResponse.json(
      { error: "Você não pode excluir seu único perfil." },
      { status: 400 }
    );
  }

  try {
    // Excluir blocos associados
    await admin.from("blocks").delete().eq("profile_id", profileId);

    // Excluir eventos de agenda associados
    await admin.from("schedule_events").delete().eq("profile_id", profileId);

    // Excluir regras de disponibilidade
    await admin.from("availability_rules").delete().eq("profile_id", profileId);

    // Excluir exceções de disponibilidade
    await admin.from("availability_exceptions").delete().eq("profile_id", profileId);

    // Excluir conexões do Google Calendar
    await admin.from("google_calendar_connections").delete().eq("profile_id", profileId);

    // Excluir bookings
    await admin.from("bookings").delete().eq("profile_id", profileId);

    // Excluir visualizações de página
    await admin.from("page_views").delete().eq("profile_id", profileId);

    // Excluir o perfil
    const { error: deleteError } = await admin
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (deleteError) {
      throw deleteError;
    }

    await securityLogger.info("Profile deleted successfully", {
      userId: user.id,
      profileId: profileId,
      username: profile.username,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    await securityLogger.error("Profile deletion failed", {
      userId: user.id,
      profileId: profileId,
      error: message,
    });
    return NextResponse.json(
      { error: "Não foi possível excluir o perfil. Tente novamente." },
      { status: 500 }
    );
  }
}
