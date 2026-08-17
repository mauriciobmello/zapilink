import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loyaltyErrorResponse, readJsonBody, readString } from "@/lib/loyalty/http";
import {
  logLoyaltyEvent,
  requireLoyaltyAdmin,
  requireMemberInProgram,
  rpcErrorStatus,
} from "@/lib/loyalty/server";

export const dynamic = "force-dynamic";

/** Adiciona exatamente uma estrela: a quantidade nunca vem do cliente. */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { userId, profileId, program } = await requireLoyaltyAdmin(
      readString(body, "profileId"),
      "loyalty.stars.add",
    );

    const memberId = readString(body, "memberId");
    if (!memberId) {
      return NextResponse.json(
        { error: "Participação não informada." },
        { status: 400 },
      );
    }
    const member = await requireMemberInProgram(program.id, memberId);
    if (member.status !== "active") {
      return NextResponse.json(
        { error: "Participação inativa." },
        { status: 409 },
      );
    }

    const service = readString(body, "service_description")?.trim() || null;
    const notes = readString(body, "notes")?.trim() || null;

    const admin = createAdminClient();
    const { data: transaction, error } = await admin.rpc("add_loyalty_star", {
      p_member_id: member.id,
      p_granted_by: userId,
      p_service_description: service,
      p_notes: notes,
    });

    if (error || !transaction) {
      const message = error?.message ?? "Não foi possível adicionar a estrela.";
      return NextResponse.json(
        { error: message },
        { status: rpcErrorStatus(message) },
      );
    }

    await logLoyaltyEvent({
      event: "star.added",
      actorUserId: userId,
      profileId,
      programId: program.id,
      customerId: member.customer_id,
      metadata: { member_id: member.id, transaction_id: transaction.id },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}
