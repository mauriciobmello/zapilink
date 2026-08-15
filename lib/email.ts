export interface SchedulingEmail {
  recipient: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailAdapter {
  send(message: SchedulingEmail): Promise<void>;
}

class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: SchedulingEmail): Promise<void> {
    console.log(
      `[EMAIL:${message.recipient}] ${message.subject}\n${message.text}`,
    );
  }
}

class ResendEmailAdapter implements EmailAdapter {
  private apiKey: string;
  private from: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? "";
    this.from = process.env.SCHEDULE_EMAIL_FROM ?? "";
  }

  async send(message: SchedulingEmail): Promise<void> {
    if (!this.apiKey) {
      console.warn(
        "[EMAIL] RESEND_API_KEY não configurada. E-mail não enviado.",
      );
      console.log(
        `[EMAIL:${message.recipient}] ${message.subject}\n${message.text}`,
      );
      return;
    }

    if (!this.from) {
      throw new Error(
        "SCHEDULE_EMAIL_FROM não configurada. Use um domínio verificado no Resend ou onboarding@resend.dev para testes.",
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.recipient],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend erro ${res.status}: ${body}`);
    }
  }
}

const adapter: EmailAdapter = process.env.RESEND_API_KEY
  ? new ResendEmailAdapter()
  : new ConsoleEmailAdapter();

export async function sendEmail(message: SchedulingEmail): Promise<void> {
  await adapter.send(message);
}