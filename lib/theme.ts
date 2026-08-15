export interface Theme {
  primary: string;
  accent: string;
}

export const DEFAULT_THEME: Theme = {
  primary: "#7C3AED",
  accent: "#F97316",
};

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(color: string | null | undefined): color is string {
  return typeof color === "string" && HEX_REGEX.test(color);
}

export function toTheme(
  primary?: string | null,
  accent?: string | null,
): Theme {
  return {
    primary: primary && isValidHex(primary) ? primary : DEFAULT_THEME.primary,
    accent: accent && isValidHex(accent) ? accent : DEFAULT_THEME.accent,
  };
}
