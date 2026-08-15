"use client";

import type { SocialLink } from "@/types/profile";

const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "facebook",
  "twitter",
  "github",
  "site",
  "email",
];

interface SocialLinksInputProps {
  value: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}

export default function SocialLinksInput({
  value,
  onChange,
}: SocialLinksInputProps) {
  function update(index: number, patch: Partial<SocialLink>) {
    onChange(
      value.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, { platform: "instagram", url: "" }]);
  }

  return (
    <div className="space-y-3">
      {value.map((link, index) => (
        <div key={index} className="flex items-center gap-2">
          <select
            value={link.platform}
            onChange={(e) => update(index, { platform: e.target.value })}
            aria-label={`Plataforma do link ${index + 1}`}
            className="h-11 rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]"
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <input
            type="url"
            value={link.url}
            onChange={(e) => update(index, { url: e.target.value })}
            placeholder="https://..."
            aria-label={`URL do link ${index + 1}`}
            className="h-11 w-full rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label={`Remover link ${index + 1}`}
            className="h-11 w-11 shrink-0 rounded-card border border-gray-200 text-lg text-gray-500 transition-colors hover:border-red-300 hover:text-red-600"
          >
            −
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="h-11 rounded-card border border-dashed border-gray-300 px-4 text-sm font-medium text-gray-600 transition-colors hover:border-[#7C3AED] hover:text-[#7C3AED]"
      >
        + Adicionar link
      </button>
    </div>
  );
}
