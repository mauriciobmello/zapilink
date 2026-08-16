import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "token é obrigatório" }, { status: 400 });
    }

    const supabase = createAdminClient();

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

    // Buscar permissões
    const { data: permissions } = await supabase
      .from("profile_access_permissions")
      .select("permission")
      .eq("profile_access_id", access.id);

    return NextResponse.json({
      access,
      permissions: permissions?.map((p: any) => p.permission) || [],
      profileName: access.profiles?.name || access.profiles?.username,
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json(
      { error: "Erro ao carregar convite" },
      { status: 500 }
    );
  }
}
