import { sendEmail } from "@/lib/email";

export interface InviteEmailData {
  recipient: string;
  profileName: string;
  ownerEmail: string;
  inviteUrl: string;
}

export async function sendInviteEmail(data: InviteEmailData): Promise<void> {
  const { recipient, profileName, ownerEmail, inviteUrl } = data;

  const subject = `Você recebeu um convite para administrar ${profileName} no Zapilink`;

  const text = `Olá!

${ownerEmail} convidou você para administrar a página "${profileName}" no Zapilink.

Para aceitar o convite, acesse o link abaixo:
${inviteUrl}

Se você não esperava este convite, ignore este e-mail.

Equipe Zapilink`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #7C3AED;">Convite para administrar página</h2>
      <p>Olá!</p>
      <p><strong>${ownerEmail}</strong> convidou você para administrar a página <strong>${profileName}</strong> no Zapilink.</p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background-color: #7C3AED; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Aceitar convite</a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">
        Se você não esperava este convite, ignore este e-mail.<br/>
        Equipe Zapilink
      </p>
    </div>
  `;

  await sendEmail({
    recipient,
    subject,
    text,
    html,
  });
}
