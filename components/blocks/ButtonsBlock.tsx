import type { ReactElement } from "react";
import type { Block, ButtonItem, ButtonType } from "@/types/block";
import type { ProfileTheme } from "@/lib/profileTheme";
import { buttonHref, getBlockItems, isCompleteButton } from "@/lib/blockUtils";
import {
  WhatsAppIcon,
  CalendarIcon,
  ShoppingBagIcon,
  CreditCardIcon,
} from "@/components/icons";

const buttonIcons: Record<ButtonType, ReactElement> = {
  whatsapp: <WhatsAppIcon className="h-5 w-5 shrink-0" />,
  schedule: <CalendarIcon className="h-5 w-5 shrink-0" />,
  buy: <ShoppingBagIcon className="h-5 w-5 shrink-0" />,
  pay: <CreditCardIcon className="h-5 w-5 shrink-0" />,
};

const buttonClasses: Record<ButtonType, string> = {
  whatsapp: "bg-green-500 text-white hover:bg-green-400",
  schedule:
    "bg-[var(--theme-primary)] text-white hover:brightness-110",
  buy: "bg-[var(--theme-accent)] text-white hover:brightness-110",
  pay: "bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-accent)] text-white hover:opacity-90",
};

interface ButtonsBlockProps {
  block: Block;
  theme: ProfileTheme;
  scheduleAgendaUrl?: string;
}

export default function ButtonsBlock({
  block,
  theme,
  scheduleAgendaUrl,
}: ButtonsBlockProps) {
  const items = getBlockItems(block) as ButtonItem[];
  const validItems = items.filter(
    (item) =>
      item.type in buttonIcons &&
      (isCompleteButton(item) ||
        (item.type === "schedule" && scheduleAgendaUrl)),
  );

  if (validItems.length === 0) {
    return null;
  }

  return (
    <section aria-label={block.title ?? "Ações rápidas"} className="px-4 py-4">
      <div className="mx-auto max-w-5xl">
        {block.title && (
          <h2 className="mb-4 text-center text-xl font-bold text-gray-900">
            {block.title}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {validItems.map((button) => {
            const isAgenda =
              button.type === "schedule" && scheduleAgendaUrl !== undefined;
            const href = isAgenda
              ? scheduleAgendaUrl
              : buttonHref(button)!;
            return (
              <a
                key={button.id}
                href={href}
                target={isAgenda ? undefined : "_blank"}
                rel={isAgenda ? undefined : "noopener noreferrer"}
                className={`flex h-12 items-center justify-center gap-2 rounded-card px-4 font-medium shadow-card transition-colors ${buttonClasses[button.type]}`}
              >
                {buttonIcons[button.type]}
                <span className="truncate">{button.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}