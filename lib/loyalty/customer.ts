const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Mantém somente dígitos; a formatação é responsabilidade da interface. */
export function normalizePhone(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= 255 && EMAIL_REGEX.test(email);
}

export function isValidPhone(phone: string): boolean {
  return phone.length >= 10 && phone.length <= 15;
}

export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

export function firstName(name: string): string {
  return normalizeName(name).split(" ")[0] ?? "";
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
}

export type CustomerInputResult =
  | { ok: true; value: CustomerInput }
  | { ok: false; error: string };

export function parseCustomerInput(body: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}): CustomerInputResult {
  const name = normalizeName(body.name);
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);

  if (name.length < 2 || name.length > 150) {
    return { ok: false, error: "Informe o nome completo." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (!isValidPhone(phone)) {
    return { ok: false, error: "Informe um telefone válido com DDD." };
  }

  return { ok: true, value: { name, email, phone } };
}
