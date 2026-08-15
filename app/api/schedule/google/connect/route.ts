import { NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google-calendar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const profileId = url.searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json(
      { error: "Parâmetro profileId ausente." },
      { status: 400 },
    );
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

  return NextResponse.redirect(buildGoogleAuthUrl(profileId));
}