import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCustomerInput } from "@/lib/loyalty/customer";
import { sendLoyaltyWelcomeEmail } from "@/lib/loyalty/email";
import { loyaltyErrorResponse, readJsonBody } from "@/lib/loyalty/http";
import {
  listCustomerSummaries,
  logLoyaltyEvent,
  requireLoyaltyAdmin,
} from "@/lib/loyalty/server";
import { upsertCustomerFromEvent } from "@/lib/crm/sync";
import type { LoyaltyCustomer } from "@/types/loyalty";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { program } = await requireLoyaltyAdmin(
      url.searchParams.get("profileId"),
      "loyalty.customers.view",
    );
    const customers = await listCustomerSummaries(
      program,
      url.searchParams.get("search") ?? undefined,
    );
    return NextResponse.json({ customers });
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { userId, profileId, program } = await requireLoyaltyAdmin(
      typeof body.profileId === "string" ? body.profileId : null,
      "loyalty.customers.manage",
    );

    const parsed = parseCustomerInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
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

    if (customer) {
      const { data: member } = await admin
        .from("loyalty_program_members")
        .select("id")
        .eq("program_id", program.id)
        .eq("customer_id", customer.id)
        .maybeSingle();
      if (member) {
        return NextResponse.json(
          {
            error: "Este cliente já participa do programa.",
            member_id: member.id,
          },
          { status: 409 },
        );
      }
    } else {
      const { data: created, error } = await admin
        .from("loyalty_customers")
        .insert({ profile_id: profileId, name, email, phone })
        .select()
        .single();
      if (error || !created) {
        return NextResponse.json(
          { error: error?.message ?? "Não foi possível cadastrar o cliente." },
          { status: 400 },
        );
      }
      customer = created as LoyaltyCustomer;
    }

    const { data: member, error: memberError } = await admin
      .from("loyalty_program_members")
      .insert({ program_id: program.id, customer_id: customer.id })
      .select("id")
      .single();
    if (memberError || !member) {
      return NextResponse.json(
        {
          error:
            memberError?.message ??
            "Não foi possível incluir o cliente no programa.",
        },
        { status: 400 },
      );
    }

    await logLoyaltyEvent({
      event: "member.joined",
      actorUserId: userId,
      profileId,
      programId: program.id,
      customerId: customer.id,
      metadata: { source: "dashboard" },
    });

    try {
      const crmCustomerId = await upsertCustomerFromEvent({
        profileId,
        name,
        phone,
        email,
        source: "fidelidade",
      });
      if (crmCustomerId) {
        await admin.rpc("crm_register_event", {
          p_profile_id: profileId,
          p_customer_id: crmCustomerId,
          p_event_type: "loyalty.updated",
          p_source: "fidelidade",
          p_reference_id: customer.id,
          p_description: "Cliente adicionado ao programa de fidelidade",
        });
      }
    } catch {
      // Sincronização com CRM não invalida o cadastro de fidelidade.
    }

    await sendLoyaltyWelcomeEmail(customer, program);

    return NextResponse.json({ customer, member_id: member.id });
  } catch (error) {
    return loyaltyErrorResponse(error);
  }
}
