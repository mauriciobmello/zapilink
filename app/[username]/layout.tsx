import type { Metadata, Viewport } from "next";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, photo_url, theme_color, description")
    .eq("username", username)
    .maybeSingle();

  const displayName = profile?.name || username;
  const photoUrl = profile?.photo_url || "/icons/icon-192x192.png";

  return {
    title: `${displayName}`,
    description: profile?.description || `Página de ${displayName} no Zapilink`,
    manifest: `/${username}/manifest.json`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: displayName,
      startupImage: [photoUrl],
    },
    icons: {
      icon: photoUrl,
      apple: photoUrl,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Viewport> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme_color")
    .eq("username", username)
    .maybeSingle();

  return {
    themeColor: profile?.theme_color || "#6200b2",
  };
}

export default function UsernameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
