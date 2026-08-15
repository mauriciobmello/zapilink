import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  console.log("Supabase server client initialization:", {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    cookiesCount: cookieStore.getAll().length,
  });

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = cookieStore.getAll();
          console.log("Cookies getAll:", cookies.length, "cookies");
          return cookies;
        },
        setAll(cookiesToSet) {
          try {
            console.log("Cookies setAll:", cookiesToSet.length, "cookies to set");
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch (error) {
            console.error("Error setting cookies:", error);
            // Called from a Server Component. Safe to ignore when the
            // middleware is refreshing user sessions.
          }
        },
      },
    },
  );
}
