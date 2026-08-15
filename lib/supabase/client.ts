"use client";

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("Supabase client initialization:", {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "missing",
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "missing",
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Variáveis de ambiente do Supabase não encontradas:", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    });
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY. Verifique as variáveis de ambiente no Dokploy."
    );
  }

  const client = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
  console.log("Supabase client created successfully");
  return client;
}