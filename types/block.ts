export type BlockType = "buttons" | "services" | "faq";
export type ButtonType = "whatsapp" | "schedule" | "buy" | "pay";

export interface ButtonItem {
  id: string;
  type: ButtonType;
  label: string;
  link?: string;
  phone?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface BlockBase {
  id: string;
  profile_id: string;
  position: number;
  is_visible: boolean;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type Block =
  | (BlockBase & { type: "buttons"; content: { items: ButtonItem[] } })
  | (BlockBase & { type: "services"; content: { items: ServiceItem[] } })
  | (BlockBase & { type: "faq"; content: { items: FAQItem[] } });
