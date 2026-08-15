"use client";

import type { Block } from "@/types/block";
import type { Profile } from "@/types/profile";
import ProfilePage from "@/components/profile/ProfilePage";

interface PreviewPaneProps {
  profile: Profile;
  blocks: Block[];
  isDarkMode?: boolean;
}

export default function PreviewPane({
  profile,
  blocks,
  isDarkMode,
}: PreviewPaneProps) {
  return (
    <div className="rounded-card border border-gray-200 bg-white p-3 shadow-card">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Preview ao vivo
      </p>
      <div className="max-h-[75vh] overflow-y-auto rounded-card border border-gray-100">
        <ProfilePage profile={profile} blocks={blocks} />
      </div>
      {isDarkMode != null && (
        <p className="px-2 pt-2 text-xs text-gray-400">
          {isDarkMode ? "Tema escuro" : "Tema claro"}
        </p>
      )}
    </div>
  );
}