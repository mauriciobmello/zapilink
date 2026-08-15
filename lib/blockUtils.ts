import type {
  Block,
  BlockType,
  ButtonItem,
  FAQItem,
  ServiceItem,
} from "@/types/block";

export const MAX_BLOCKS = 20;
export const MAX_ITEMS = 10;

const URL_REGEX = /^https?:\/\/.+/;
const PHONE_REGEX = /^\d{10,15}$/;

export function getBlockItems(block: Block): unknown[] {
  const items = (
    block as { content?: { items?: unknown } }
  ).content?.items;
  return Array.isArray(items) ? items : [];
}

export function isValidUrl(
  url: string | undefined | null,
): url is string {
  return typeof url === "string" && URL_REGEX.test(url.trim());
}

export function isValidPhone(
  phone: string | undefined | null,
): phone is string {
  return typeof phone === "string" && PHONE_REGEX.test(phone.trim());
}

export function buttonHref(button: ButtonItem): string | null {
  if (button.type === "whatsapp") {
    if (!isValidPhone(button.phone)) return null;
    return `https://wa.me/${button.phone.trim()}`;
  }
  if (!isValidUrl(button.link)) return null;
  return button.link.trim();
}

export function isCompleteButton(button: ButtonItem): boolean {
  return buttonHref(button) !== null;
}

export function emptyContentFor(type: BlockType): Block["content"] {
  return { items: [] };
}

export function validateButton(button: ButtonItem): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!button.label.trim()) {
    errors.label = "Rótulo obrigatório.";
  } else if (button.label.length > 60) {
    errors.label = "Máximo de 60 caracteres.";
  }
  if (button.type === "whatsapp") {
    if (!isValidPhone(button.phone)) {
      errors.phone = "Faltando telefone (somente dígitos, 10 a 15).";
    }
  } else if (!isValidUrl(button.link)) {
    errors.link = "Faltando link (http:// ou https://).";
  }
  return errors;
}

export function validateService(
  item: ServiceItem,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!item.name.trim()) {
    errors.name = "Nome obrigatório.";
  } else if (item.name.length > 100) {
    errors.name = "Máximo de 100 caracteres.";
  }
  return errors;
}

export function validateFAQ(item: FAQItem): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!item.question.trim()) {
    errors.question = "Pergunta obrigatória.";
  }
  if (!item.answer.trim()) {
    errors.answer = "Resposta obrigatória.";
  }
  return errors;
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  buttons: "Botões",
  services: "Serviços",
  faq: "FAQ",
};

export const BUTTON_TYPE_LABELS: Record<ButtonItem["type"], string> = {
  whatsapp: "WhatsApp",
  schedule: "Agendar",
  buy: "Comprar",
  pay: "Pagar",
};