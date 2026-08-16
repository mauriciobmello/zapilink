import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { securityLogger } from "@/lib/security-logger";
import type { Permission } from "@/types/access";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: accessId } = await params;
    const { permissions } = await request.json() as { permissions: Permission[] };

    const supabase = createAdminClient();

    // Verificar se o convite pertence a um perfil do usuário logado
    const { data: access } = await supabase
      .from("profile_access")
      .select("profile_id, owner_user_id")
      .eq("id", accessId)
      .single();

    if (!access || access.owner_user_id !== user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar este acesso" },
        { status: 403 }
      );
    }

    // Remover permissões antigas
    const { error: deleteError } = await supabase
      .from("profile_access_permissions")
      .delete()
      .eq("profile_access_id", accessId);

    if (deleteError) throw deleteError;

    // Inserir novas permissões
    if (permissions && permissions.length > 0) {
      const { error: insertError } = await supabase
        .from("profile_access_permissions")
        .insert(
          permissions.map((permission) => ({
            profile_access_id: accessId,
            permission,
          }))
        );

      if (insertError) throw insertError;
    }

    await securityLogger.info("Access permissions updated", {
      accessId,
      permissions,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating access permissions:", error);
    await securityLogger.error("Failed to update access permissions", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Erro ao atualizar permissões" },
      { status: 500 }
    );
  }
}
