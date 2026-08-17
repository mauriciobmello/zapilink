import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loyaltyErrorResponse, readJsonBody, readString } from "@/lib/loyalty/http";
import { logLoyaltyEvent, requireLoyaltyAdmin } from "@/lib/loyalty/server";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { userId, profileId, program } = await requireLoyaltyAdmin(
      readString(body, "profileId"),
      "loyalty.settings.edit",
    );

    const name = readString(body, "name")?.trim() ?? "";
    if (name.length < 2 || name.length > 150) {
      return NextResponse.json(
        { error: "Informe o nome do programa." },
        { status: 400 },
      );
    }

    const starsRequired = Number(body.stars_required);
    if (
      !Number.isInteger(starsRequired) ||
      starsRequired < 1 ||
      starsRequired > 100
    ) {
      return NextResponse.json(
        { error: "A meta deve ser um número entre 1 e 100." },
        { status: 400 },
      );
    }

    const isActive = body.is_active === true;
    const benefit = readString(body, "benefit_description")?.trim() ?? "";
    if (isActive && benefit.length < 3) {
      return NextResponse.json(
        { error: "Descreva o benefício antes de ativar o programa." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from("loyalty_programs")
      .update({
        name,
        description: readString(body, "description")?.trim() || null,
        rules: readString(body, "rules")?.trim() || null,
        stars_required: starsRequired,
        benefit_description: benefit || null,
        reset_on_redeem: body.reset_on_redeem !== false,
        is_active: isActive,
      })
      .eq("id", program.id)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Não foi possível salvar o programa." },
        { status: 400 },
      );
    }

    await logLoyaltyEvent({
      event: "program.updated",
      actorUserId: userId,
      profileId,
      programId: program.id,
      metadata: { stars_required: starsRequired, is_active: isActive },
    });

    return NextResponse.json({ program: updated });
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}
