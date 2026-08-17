import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  firstName,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from "@/lib/loyalty/customer";
import { balanceForCycle, benefitState } from "@/lib/loyalty/progress";
import { loyaltyErrorResponse, readJsonBody } from "@/lib/loyalty/http";
import { getActiveProgramByUsername } from "@/lib/loyalty/server";
import type {
  LoyaltyProgramMember,
  LoyaltyPublicProgress,
  LoyaltyStarTransaction,
} from "@/types/loyalty";

export const dynamic = "force-dynamic";

/** Mesma resposta para dados inválidos e para participação inexistente. */
function notFound() {
  return NextResponse.json(
    { error: "Não encontramos uma participação com esses dados." },
    { status: 404 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const body = await readJsonBody(request);

    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    if (!isValidEmail(email) || !isValidPhone(phone)) {
      return notFound();
    }

    const context = await getActiveProgramByUsername(username);
    if (!context) return notFound();
    const { profileId, program } = context;

    const admin = createAdminClient();
    // E-mail e telefone precisam bater: reduz consulta por dado único vazado.
    const { data: customer } = await admin
      .from("loyalty_customers")
      .select("id, name")
      .eq("profile_id", profileId)
      .eq("email", email)
      .eq("phone", phone)
      .maybeSingle();
    if (!customer) return notFound();

    const { data: member } = await admin
      .from("loyalty_program_members")
      .select("*")
      .eq("program_id", program.id)
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (!member) return notFound();

    const typedMember = member as LoyaltyProgramMember;
    const { data: transactions } = await admin
      .from("loyalty_star_transactions")
      .select("cycle, stars")
      .eq("program_member_id", typedMember.id);

    const stars = balanceForCycle(
      (transactions ?? []) as Pick<LoyaltyStarTransaction, "cycle" | "stars">[],
      typedMember.current_cycle,
    );

    const progress: LoyaltyPublicProgress = {
      first_name: firstName(customer.name),
      stars_current: stars,
      stars_required: program.stars_required,
      benefit_state: benefitState(stars, program.stars_required),
      benefit_description: program.benefit_description,
    };

    return NextResponse.json({ progress });
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}
