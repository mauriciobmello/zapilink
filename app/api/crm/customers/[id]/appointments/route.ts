import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCrmAdmin, CrmError } from "@/lib/crm/server";
import { crmErrorResponse } from "@/lib/crm/http";
import type { Booking } from "@/types/schedule";

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
    const { data: customer } = await admin
      .from("customers")
      .select("phone, email")
      .eq("id", id)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!customer) throw new CrmError("Cliente não encontrado.", 404);

    const filters: string[] = [];
    if (customer.phone) filters.push(`invitee_phone.eq.${customer.phone}`);
    if (customer.email) filters.push(`invitee_email.eq.${customer.email}`);
    if (filters.length === 0) {
      return NextResponse.json({ appointments: [] });
    }

    const { data, error } = await admin
      .from("bookings")
      .select("*")
      .eq("profile_id", profileId)
      .or(filters.join(","))
      .order("slot_date", { ascending: false });

    if (error) throw new CrmError(error.message, 500);
    return NextResponse.json({ appointments: (data ?? []) as Booking[] });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
