import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/access/authorization";
import { securityLogger } from "@/lib/security-logger";
import type { BlockType } from "@/types/block";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { profile_id, type, position } = body as {
      profile_id: string;
      type: BlockType;
      position: number;
    };

    const canEdit = await hasPermission(user.id, profile_id, "blocks.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Você não tem permissão para adicionar blocos" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("blocks")
      .insert({
        profile_id,
        type,
        position,
        is_visible: true,
        title: null,
        content: null,
      })
      .select()
      .single();

    if (error) throw error;

    await securityLogger.info("Block created", {
      userId: user.id,
      profileId: profile_id,
      blockId: data.id,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating block:", error);
    return NextResponse.json(
      { error: "Erro ao criar bloco" },
      { status: 500 }
    );
  }
}
