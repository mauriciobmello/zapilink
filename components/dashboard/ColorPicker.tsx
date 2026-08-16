"use client";

import { isValidHex } from "@/lib/theme";

const PRESETS = [
  "#7C3AED",
  "#F97316",
  "#0EA5E9",
  "#10B981",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#1F2937",
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
  label: string;
  disabled?: boolean;
}

export default function ColorPicker({
  value,
  onChange,
  label,
  disabled = false,
}: ColorPickerProps) {
  const hex = isValidHex(value) ? value : "#7C3AED";
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} (seletor)`}
          disabled={disabled}
          className="h-11 w-14 cursor-pointer rounded-card border border-gray-200 bg-white p-1 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          aria-label={`${label} (hex)`}
          disabled={disabled}
          className="h-11 w-36 rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED] disabled:opacity-50"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            disabled={disabled}
            aria-label={`Usar cor ${color}`}
            className="h-8 w-8 rounded-full border border-gray-200 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
