import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, photo_url, theme_color, description")
    .eq("username", username)
    .maybeSingle();

  const displayName = profile?.name || username;
  const themeColor = profile?.theme_color || "#6200b2";
  const startUrl = `/${username}`;
  const scope = `/${username}`;

  const icons = [];

  if (profile?.photo_url) {
    icons.push({
      src: profile.photo_url,
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    });
    icons.push({
      src: profile.photo_url,
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    });
  } else {
    icons.push({
      src: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    });
    icons.push({
      src: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    });
  }

  const manifest = {
    name: displayName,
    short_name: displayName,
    description: profile?.description || `Página de ${displayName}`,
    start_url: startUrl,
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    orientation: "portrait-primary",
    scope,
    lang: "pt-BR",
    icons,
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
