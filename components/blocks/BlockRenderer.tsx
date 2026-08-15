import type { Block } from "@/types/block";
import type { ProfileTheme } from "@/lib/profileTheme";
import ButtonsBlock from "./ButtonsBlock";
import ServicesBlock from "./ServicesBlock";
import FAQBlock from "./FAQBlock";

interface BlockRendererProps {
  block: Block;
  theme: ProfileTheme;
  scheduleAgendaUrl?: string;
}

export default function BlockRenderer({
  block,
  theme,
  scheduleAgendaUrl,
}: BlockRendererProps) {
  switch (block.type) {
    case "buttons":
      return (
        <ButtonsBlock
          block={block}
          theme={theme}
          scheduleAgendaUrl={scheduleAgendaUrl}
        />
      );
    case "services":
      return <ServicesBlock block={block} theme={theme} />;
    case "faq":
      return <FAQBlock block={block} theme={theme} />;
    default:
      return null;
  }
}