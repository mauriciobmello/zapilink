import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const profileId = body?.profileId as string | undefined;
  if (!profileId) {
    return NextResponse.json({ error: "Parâmetro profileId ausente." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  const admin = createAdminClient();
  await admin
    .from("google_calendar_connections")
    .delete()
    .eq("profile_id", profileId);

  return NextResponse.json({ ok: true });
}