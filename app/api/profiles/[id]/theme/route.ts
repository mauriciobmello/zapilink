import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/access/authorization";
import { securityLogger } from "@/lib/security-logger";

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

    const { id: profileId } = await params;
    const body = await request.json();
    const { theme, colors, highlight_color } = body;

    const canEdit = await hasPermission(user.id, profileId, "theme.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar o tema" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        theme,
        colors,
        highlight_color,
      })
      .eq("id", profileId)
      .select()
      .single();

    if (error) throw error;

    await securityLogger.info("Theme updated", {
      userId: user.id,
      profileId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating theme:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar tema" },
      { status: 500 }
    );
  }
}
