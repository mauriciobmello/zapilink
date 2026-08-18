import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LoyaltyCustomer, LoyaltyProgram } from "@/types/loyalty";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Avisa o cliente que ele passou a participar do programa de fidelidade.
 * Falhas de envio não devem quebrar o cadastro: são apenas registradas.
 */
export async function sendLoyaltyWelcomeEmail(
  customer: LoyaltyCustomer,
  program: LoyaltyProgram,
): Promise<void> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("name, username")
    .eq("id", program.profile_id)
    .maybeSingle();

  const businessName = profile?.name || profile?.username || program.name;
  const progressUrl = profile?.username
    ? `${siteUrl()}/${profile.username}/loyalty/progress`
    : null;

  const lines = [
    `Olá, ${customer.name}!`,
    "",
    `Você agora participa do programa de fidelidade de ${businessName}.`,
    `Junte ${program.stars_required} ${
      program.stars_required === 1 ? "estrela" : "estrelas"
    } e ganhe ${program.benefit_description ?? "o benefício do programa"}.`,
  ];
  if (progressUrl) {
    lines.push("", `Consulte suas estrelas em: ${progressUrl}`);
  }

  try {
    await sendEmail({
      recipient: customer.email,
      subject: `Você está no programa de fidelidade de ${businessName}`,
      text: lines.join("\n"),
    });
  } catch (error) {
    console.error("[loyalty] falha ao enviar e-mail de boas-vindas", error);
  }
}
