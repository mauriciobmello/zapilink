import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? "";
  const current = request.nextUrl.searchParams.get("current") ?? "";

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  if (username === current) {
    return NextResponse.json({ available: true });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
