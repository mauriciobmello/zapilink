"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types/profile";
import { createBrowserClient } from "@/lib/supabase/client";
import { isValidHex } from "@/lib/theme";
import ColorPicker from "./ColorPicker";

interface ThemeSectionProps {
  profile: Profile;
}

export default function ThemeSection({ profile }: ThemeSectionProps) {
  const router = useRouter();
  const [themeColor, setThemeColor] = useState(profile.theme_color ?? "#7C3AED");
  const [themeAccent, setThemeAccent] = useState(profile.theme_accent ?? "#F97316");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify({ themeColor, themeAccent }));

  async function save() {
    // Validação
    const validationErrors: Record<string, string> = {};
    if (!isValidHex(themeColor)) {
      validationErrors.theme_color = "Cor inválida (use #RRGGBB).";
    }
    if (!isValidHex(themeAccent)) {
      validationErrors.theme_accent = "Cor inválida (use #RRGGBB).";
    }
    
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Verificar se houve mudanças
    const current = JSON.stringify({ themeColor, themeAccent });
    if (current === lastSavedRef.current) return;

    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ 
        theme_color: themeColor,
        theme_accent: themeAccent
      })
      .eq("id", profile.id);
    setSaving(false);

    if (error) {
      setErrors((prev) => ({ ...prev, general: error.message }));
      return;
    }

    lastSavedRef.current = current;
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save();
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [themeColor, themeAccent]);

  return (
    <div className="max-w-2xl">
      <section className="space-y-6 rounded-card border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-gray-900">Tema</h2>
        <ColorPicker
          label="Cor primária"
          value={themeColor}
          onChange={setThemeColor}
        />
        {errors.theme_color && (
          <p className="text-sm text-red-600">{errors.theme_color}</p>
        )}
        <ColorPicker
          label="Cor de destaque"
          value={themeAccent}
          onChange={setThemeAccent}
        />
        {errors.theme_accent && (
          <p className="text-sm text-red-600">{errors.theme_accent}</p>
        )}
      </section>

      {errors.general && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {errors.general}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-gray-400">
          {saving
            ? "Salvando automaticamente..."
            : savedAt
              ? `Salvo às ${savedAt}`
              : "Salvamento automático ativo"}
        </span>
      </div>
    </div>
  );
}
