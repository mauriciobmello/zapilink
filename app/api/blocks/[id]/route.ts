import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/access/authorization";
import { securityLogger } from "@/lib/security-logger";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { profile_id, title, content, is_visible, position } = body;

    const canEdit = await hasPermission(user.id, profile_id, "blocks.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar blocos" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("blocks")
      .update({
        title,
        content,
        is_visible,
        position,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("profile_id", profile_id)
      .select()
      .single();

    if (error) throw error;

    await securityLogger.info("Block updated", {
      userId: user.id,
      blockId: id,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating block:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar bloco" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId é obrigatório" },
        { status: 400 }
      );
    }

    const canEdit = await hasPermission(user.id, profileId, "blocks.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir blocos" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) throw error;

    await securityLogger.info("Block deleted", {
      userId: user.id,
      blockId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting block:", error);
    return NextResponse.json(
      { error: "Erro ao excluir bloco" },
      { status: 500 }
    );
  }
}
