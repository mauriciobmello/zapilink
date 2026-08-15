import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/crypto";

const SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function redirectUri(): string {
  return `${baseUrl()}/api/schedule/google/callback`;
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltam GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId } = oauthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function tokenEndpoint(body: Record<string, string>): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const { clientId, clientSecret } = oauthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    ...body,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token do Google falhou: ${res.status} ${text}`);
  }
  return res.json();
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
  const data = await tokenEndpoint({
    code,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  if (!data.refresh_token) {
    throw new Error("O Google não retornou refresh_token (consent offline).");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const data = await tokenEndpoint({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function getConnectionAccessToken(profileId: string): Promise<{
  accessToken: string;
  googleEmail: string;
} | null> {
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("google_calendar_connections")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!conn) return null;

  const refreshToken = decryptToken(conn.refresh_token_encrypted);
  let accessToken = decryptToken(conn.access_token_encrypted);
  let expiresAt = conn.expires_at;

  if (!expiresAt || new Date(expiresAt).getTime() - Date.now() < 60_000) {
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    expiresAt = refreshed.expiresAt;
    await admin
      .from("google_calendar_connections")
      .update({
        access_token_encrypted: encryptToken(refreshed.accessToken),
        expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.id);
  }

  return { accessToken, googleEmail: conn.google_email };
}

export async function fetchBusyIntervals(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<{ start: Date; end: Date }[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "UTC",
        items: [{ id: "primary" }],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`freeBusy falhou: ${res.status}`);
  }
  const data = await res.json();
  const busy: { start: Date; end: Date }[] = [];
  for (const cal of Object.values(data.calendars ?? {})) {
    for (const slot of (cal as { busy?: unknown[] }).busy ?? []) {
      const { start, end } = slot as { start?: string; end?: string };
      if (start && end) busy.push({ start: new Date(start), end: new Date(end) });
    }
  }
  return busy;
}

export async function createCalendarEvent(
  accessToken: string,
  input: {
    summary: string;
    description: string | null;
    location: string | null;
    startIso: string;
    endIso: string;
    attendeeEmail: string;
  },
): Promise<string> {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start: { dateTime: input.startIso, timeZone: "UTC" },
    end: { dateTime: input.endIso, timeZone: "UTC" },
    attendees: [{ email: input.attendeeEmail }],
  };
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`events.insert falhou: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.id as string;
}