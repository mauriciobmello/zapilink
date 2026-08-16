"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types/profile";
import { createBrowserClient } from "@/lib/supabase/client";
import SocialLinksInput from "./SocialLinksInput";

interface SocialLinksSectionProps {
  profile: Profile;
}

const URL_REGEX = /^https?:\/\/.+\..+/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SocialLinksSection({ profile }: SocialLinksSectionProps) {
  const router = useRouter();
  const [socialLinks, setSocialLinks] = useState(profile.social_links ?? []);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(socialLinks));

  async function save() {
    // Validação
    const validationErrors: Record<string, string> = {};
    socialLinks.forEach((link, index) => {
      if (!link.url) return;
      const isEmail = link.platform === "email";
      const valid = isEmail
        ? /^mailto:/i.test(link.url) || EMAIL_REGEX.test(link.url)
        : URL_REGEX.test(link.url);
      if (!valid) {
        validationErrors[`link-${index}`] = `URL inválida em "${link.platform}".`;
      }
    });
    
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Verificar se houve mudanças
    if (JSON.stringify(socialLinks) === lastSavedRef.current) return;

    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ social_links: socialLinks })
      .eq("id", profile.id);
    setSaving(false);

    if (error) {
      setErrors((prev) => ({ ...prev, general: error.message }));
      return;
    }

    lastSavedRef.current = JSON.stringify(socialLinks);
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
  }, [socialLinks]);

  return (
    <div className="max-w-2xl">
      <section className="space-y-4 rounded-card border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-gray-900">Links sociais</h2>
        <SocialLinksInput
          value={socialLinks}
          onChange={setSocialLinks}
        />
        {Object.keys(errors)
          .filter((key) => key.startsWith("link-"))
          .map((key) => (
            <p key={key} className="text-sm text-red-600">
              {errors[key]}
            </p>
          ))}
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
