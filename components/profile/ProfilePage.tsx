"use client";

import type { CSSProperties } from "react";
import type { Block, ButtonItem } from "@/types/block";
import type { Profile } from "@/types/profile";
import { getProfileTheme } from "@/lib/profileTheme";
import { CalendarIcon } from "@/components/icons";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import ProfileHeader from "./ProfileHeader";
import BlockRenderer from "@/components/blocks/BlockRenderer";

interface ProfilePageProps {
  profile: Profile;
  blocks: Block[];
  scheduleAgendaUrl?: string;
}

function hasScheduleButton(blocks: Block[]): boolean {
  return blocks.some(
    (block) =>
      block.type === "buttons" &&
      ((block.content?.items ?? []) as ButtonItem[]).some(
        (item) => item.type === "schedule",
      ),
  );
}

export default function ProfilePage({
  profile,
  blocks,
  scheduleAgendaUrl,
}: ProfilePageProps) {
  const theme = getProfileTheme(profile);
  const visibleBlocks = blocks.filter((block) => block.is_visible);

  const style = {
    ...theme.background,
    color: theme.textColor,
    "--theme-primary": theme.primary,
    "--theme-accent": theme.accent,
  } as CSSProperties;

  return (
    <main className="min-h-screen" style={style}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ProfileHeader profile={profile} theme={theme} />
        {scheduleAgendaUrl && !hasScheduleButton(visibleBlocks) && (
          <section aria-label="Agendar" className="px-4 py-4">
            <div className="mx-auto max-w-5xl">
              <a
                href={scheduleAgendaUrl}
                className="flex h-12 items-center justify-center gap-2 rounded-card bg-[var(--theme-primary)] px-4 font-medium text-white shadow-card transition-colors hover:brightness-110"
              >
                <CalendarIcon className="h-5 w-5 shrink-0" />
                <span>Agendar</span>
              </a>
            </div>
          </section>
        )}
        {visibleBlocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            theme={theme}
            scheduleAgendaUrl={scheduleAgendaUrl}
          />
        ))}
        <footer className="px-4 py-10 text-center">
          <a
            href="/"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Criado com ZAPILINK
          </a>
        </footer>
      </div>
      <InstallPrompt appName={profile.name || "Zapilink"} />
    </main>
  );
}