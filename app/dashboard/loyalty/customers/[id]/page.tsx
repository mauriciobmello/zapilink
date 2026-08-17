import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import LoyaltyCustomerDetail from "@/components/dashboard/loyalty/LoyaltyCustomerDetail";
import { createAdminClient } from "@/lib/supabase/admin";
import { balanceForCycle } from "@/lib/loyalty/progress";
import {
  memberRedemptions,
  memberTransactions,
  requireLoyaltyProfilePage,
} from "@/lib/loyalty/server";
import type { LoyaltyCustomer, LoyaltyProgramMember } from "@/types/loyalty";

export const dynamic = "force-dynamic";

export default async function LoyaltyCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { profile, program } = await requireLoyaltyProfilePage(
    user.id,
    query.profileId,
    "loyalty.customers.view",
  );

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("loyalty_program_members")
    .select("*")
    .eq("id", id)
    .eq("program_id", program.id)
    .maybeSingle();
  if (!member) notFound();

  const typedMember = member as LoyaltyProgramMember;
  const { data: customer } = await admin
    .from("loyalty_customers")
    .select("*")
    .eq("id", typedMember.customer_id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!customer) notFound();

  const [transactions, redemptions] = await Promise.all([
    memberTransactions(typedMember.id),
    memberRedemptions(typedMember.id),
  ]);

  const starsCurrent = balanceForCycle(transactions, typedMember.current_cycle);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/dashboard/loyalty/customers?profileId=${encodeURIComponent(profile.id)}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Clientes
      </Link>

      <LoyaltyCustomerDetail
        profileId={profile.id}
        program={program}
        customer={customer as LoyaltyCustomer}
        member={typedMember}
        starsCurrent={starsCurrent}
        transactions={transactions}
        redemptions={redemptions}
      />
    </div>
  );
}
