import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loyaltyErrorResponse, readJsonBody, readString } from "@/lib/loyalty/http";
import {
  logLoyaltyEvent,
  requireLoyaltyAdmin,
  requireMemberInProgram,
  rpcErrorStatus,
} from "@/lib/loyalty/server";
import { syncCrmLoyaltyPoints } from "@/lib/crm/sync";

export const dynamic = "force-dynamic";

/** Resgate é operação separada da conquista da meta. */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { userId, profileId, program } = await requireLoyaltyAdmin(
      readString(body, "profileId"),
      "loyalty.benefits.redeem",
    );

    const memberId = readString(body, "memberId");
    if (!memberId) {
      return NextResponse.json(
        { error: "Participação não informada." },
        { status: 400 },
      );
    }
    const member = await requireMemberInProgram(program.id, memberId);
    const notes = readString(body, "notes")?.trim() || null;

    const admin = createAdminClient();
    const { data: redemption, error } = await admin.rpc(
      "redeem_loyalty_benefit",
      {
        p_member_id: member.id,
        p_redeemed_by: userId,
        p_notes: notes,
      },
    );

    if (error || !redemption) {
      const message = error?.message ?? "Não foi possível registrar o resgate.";
      return NextResponse.json(
        { error: message },
        { status: rpcErrorStatus({ code: error?.code, message }) },
      );
    }

    await logLoyaltyEvent({
      event: "benefit.redeemed",
      actorUserId: userId,
      profileId,
      programId: program.id,
      customerId: member.customer_id,
      metadata: {
        member_id: member.id,
        redemption_id: redemption.id,
        cycle: redemption.cycle,
      },
    });

    try {
      const { data: balance } = await admin.rpc("loyalty_member_balance", {
        p_member_id: member.id,
      });
      await syncCrmLoyaltyPoints(
        profileId,
        member.customer_id,
        balance ?? 0,
      );
    } catch {
      // Sincronização com CRM não invalida a operação.
    }

    return NextResponse.json({ redemption });
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}
