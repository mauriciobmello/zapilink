import type { CSSProperties } from "react";
import type { Profile } from "@/types/profile";
import { DEFAULT_THEME, isValidHex } from "@/lib/theme";

export interface ProfileTheme {
  background: CSSProperties;
  textColor: string;
  primary: string;
  accent: string;
  isLight: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function getProfileTheme(
  profile: Pick<Profile, "theme_color" | "theme_accent">,
): ProfileTheme {
  const primary = isValidHex(profile.theme_color)
    ? profile.theme_color
    : DEFAULT_THEME.primary;
  const accent = isValidHex(profile.theme_accent)
    ? profile.theme_accent
    : DEFAULT_THEME.accent;

  const primaryRgb = hexToRgb(primary)!;
  const accentRgb = hexToRgb(accent)!;

  const background: CSSProperties = {
    backgroundColor: "#ffffff",
    backgroundImage: `linear-gradient(180deg, rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.06) 0%, rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.06) 100%)`,
  };

  const luminance =
    (0.299 * primaryRgb.r + 0.587 * primaryRgb.g + 0.114 * primaryRgb.b) / 255;

  return {
    background,
    textColor: luminance > 0.5 ? "#1F2937" : "#F9FAFB",
    primary,
    accent,
    isLight: luminance > 0.5,
  };
}
