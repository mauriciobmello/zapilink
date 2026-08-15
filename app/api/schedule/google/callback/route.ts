import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto";
import { securityLogger } from "@/lib/security-logger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Parâmetros OAuth ausentes." }, { status: 400 });
  }

  try {
    const user = await requireUser();
    const profileId = state;

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      await securityLogger.warn("Google OAuth callback - profile not found", {
        userId: user.id,
        profileId: profileId,
      });
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }

    const tokens = await exchangeCodeForTokens(code);
    const { google_email } = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    ).then((r) => r.json());

    const admin = createAdminClient();
    await admin.from("google_calendar_connections").upsert(
      {
        profile_id: profileId,
        google_email: google_email as string,
        access_token_encrypted: encryptToken(tokens.accessToken),
        refresh_token_encrypted: encryptToken(tokens.refreshToken),
        expires_at: tokens.expiresAt,
      },
      { onConflict: "profile_id" },
    );

    await securityLogger.info("Google Calendar connected successfully", {
      userId: user.id,
      profileId: profileId,
      googleEmail: google_email,
    });

    return NextResponse.redirect(
      `/dashboard/schedule?profileId=${profileId}&connected=1`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro no OAuth do Google.";
    await securityLogger.error("Google OAuth callback failed", {
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}