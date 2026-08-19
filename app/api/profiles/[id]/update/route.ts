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
    const { username, name, description, photo_url, cover_url } = body;

    const canEdit = await hasPermission(user.id, profileId, "profile.edit");
    if (!canEdit) {
      await securityLogger.warn("Unauthorized profile update attempt", {
        userId: user.id,
        profileId,
      });
      return NextResponse.json(
        { error: "Você não tem permissão para editar este perfil" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .update({
        username,
        name,
        description,
        photo_url,
        cover_url,
      })
      .eq("id", profileId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Este username já está em uso" },
          { status: 409 }
        );
      }
      throw error;
    }

    await securityLogger.info("Profile updated", {
      userId: user.id,
      profileId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating profile:", error);
    await securityLogger.error("Failed to update profile", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    );
  }
}
