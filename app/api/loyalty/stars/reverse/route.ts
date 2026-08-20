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

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { userId, profileId, program } = await requireLoyaltyAdmin(
      readString(body, "profileId"),
      "loyalty.stars.reverse",
    );

    const memberId = readString(body, "memberId");
    const transactionId = readString(body, "transactionId");
    const reason = readString(body, "reason")?.trim() ?? "";
    if (!memberId || !transactionId) {
      return NextResponse.json(
        { error: "Estrela não informada." },
        { status: 400 },
      );
    }
    if (reason.length < 3) {
      return NextResponse.json(
        { error: "Informe o motivo do estorno." },
        { status: 400 },
      );
    }

    const member = await requireMemberInProgram(program.id, memberId);

    const admin = createAdminClient();
    const { data: original } = await admin
      .from("loyalty_star_transactions")
      .select("id")
      .eq("id", transactionId)
      .eq("program_member_id", member.id)
      .maybeSingle();
    if (!original) {
      return NextResponse.json(
        { error: "Estrela não encontrada." },
        { status: 404 },
      );
    }

    const { data: transaction, error } = await admin.rpc(
      "reverse_loyalty_star",
      {
        p_transaction_id: transactionId,
        p_granted_by: userId,
        p_reason: reason,
      },
    );

    if (error || !transaction) {
      const message = error?.message ?? "Não foi possível estornar a estrela.";
      return NextResponse.json(
        { error: message },
        { status: rpcErrorStatus({ code: error?.code, message }) },
      );
    }

    await logLoyaltyEvent({
      event: "star.reversed",
      actorUserId: userId,
      profileId,
      programId: program.id,
      customerId: member.customer_id,
      metadata: {
        member_id: member.id,
        reversed_transaction_id: transactionId,
        reason,
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

    return NextResponse.json({ transaction });
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}
