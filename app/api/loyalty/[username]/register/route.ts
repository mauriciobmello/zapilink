import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCustomerInput } from "@/lib/loyalty/customer";
import { loyaltyErrorResponse, readJsonBody } from "@/lib/loyalty/http";
import {
  getActiveProgramByUsername,
  logLoyaltyEvent,
} from "@/lib/loyalty/server";
import type { LoyaltyCustomer } from "@/types/loyalty";

export const dynamic = "force-dynamic";

const CONSENT_VERSION = "1.0";

/**
 * Resposta neutra para qualquer desfecho de cadastro: impede descobrir se um
 * e-mail/telefone já participa do programa.
 */
const NEUTRAL_RESPONSE = {
  ok: true,
  message:
    "Tudo certo! Consulte seu progresso informando o mesmo e-mail e telefone.",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const body = await readJsonBody(request);

    const parsed = parseCustomerInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    if (body.consent !== true) {
      return NextResponse.json(
        { error: "É necessário aceitar o uso dos seus dados no programa." },
        { status: 400 },
      );
    }

    const context = await getActiveProgramByUsername(username);
    if (!context) {
      return NextResponse.json(
        { error: "Programa de fidelidade indisponível." },
        { status: 404 },
      );
    }
    const { profileId, program } = context;
    const { name, email, phone } = parsed.value;

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("loyalty_customers")
      .select("*")
      .eq("profile_id", profileId)
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(1)
      .maybeSingle();

    let customer = existing as LoyaltyCustomer | null;

    if (!customer) {
      const { data: created, error } = await admin
        .from("loyalty_customers")
        .insert({ profile_id: profileId, name, email, phone })
        .select()
        .single();
      if (error || !created) {
        // Corrida de cadastros simultâneos cai no índice único do perfil.
        return NextResponse.json(NEUTRAL_RESPONSE);
      }
      customer = created as LoyaltyCustomer;
      await logLoyaltyEvent({
        event: "customer.self_registered",
        profileId,
        programId: program.id,
        customerId: customer.id,
      });
    }

    const { data: member } = await admin
      .from("loyalty_program_members")
      .select("id")
      .eq("program_id", program.id)
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (!member) {
      const { data: createdMember } = await admin
        .from("loyalty_program_members")
        .insert({
          program_id: program.id,
          customer_id: customer.id,
          consent_at: new Date().toISOString(),
          consent_version: CONSENT_VERSION,
        })
        .select("id")
        .maybeSingle();
      if (createdMember) {
        await logLoyaltyEvent({
          event: "member.joined",
          profileId,
          programId: program.id,
          customerId: customer.id,
          metadata: { source: "public" },
        });
      }
    }

    return NextResponse.json(NEUTRAL_RESPONSE);
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}
