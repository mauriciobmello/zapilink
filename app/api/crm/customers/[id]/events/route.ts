import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, CrmError } from "@/lib/crm/server";
import { crmErrorResponse } from "@/lib/crm/http";
import type { CustomerEvent } from "@/types/crm";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { profileId } = await requireCrmAdmin(
      searchParams.get("profileId"),
      "crm.view",
    );

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("customer_events")
      .select("*")
      .eq("customer_id", id)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) throw new CrmError(error.message, 500);
    return NextResponse.json({ events: (data ?? []) as CustomerEvent[] });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
