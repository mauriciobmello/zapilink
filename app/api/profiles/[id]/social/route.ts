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
    const { social_links } = body;

    const canEdit = await hasPermission(user.id, profileId, "social_links.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar links sociais" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ social_links })
      .eq("id", profileId)
      .select()
      .single();

    if (error) throw error;

    await securityLogger.info("Social links updated", {
      userId: user.id,
      profileId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating social links:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar links sociais" },
      { status: 500 }
    );
  }
}
