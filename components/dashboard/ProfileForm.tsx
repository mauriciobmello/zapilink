"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Block } from "@/types/block";
import type { Profile } from "@/types/profile";
import { createBrowserClient } from "@/lib/supabase/client";
import { isValidHex } from "@/lib/theme";
import ColorPicker from "./ColorPicker";
import SocialLinksInput from "./SocialLinksInput";
import PreviewPane from "./PreviewPane";
import PhotoUploader from "./PhotoUploader";
import RichTextEditor from "./RichTextEditor";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const URL_REGEX = /^https?:\/\/.+\..+/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePlatform(platform: string): string {
  const map: Record<string, string> = {
    instagram: "instagram",
    youtube: "youtube",
    tiktok: "tiktok",
    linkedin: "linkedin",
    facebook: "facebook",
    twitter: "twitter",
    github: "github",
    site: "site",
    website: "site",
    email: "email",
  };
  return map[platform.toLowerCase()] ?? platform.toLowerCase();
}

function validate(data: Profile): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!USERNAME_REGEX.test(data.username)) {
    errors.username =
      "O username deve ter 3-30 caracteres (letras, números e _).";
  }
  if (data.name && data.name.length > 100) {
    errors.name = "Máximo de 100 caracteres.";
  }
  if (data.description && data.description.length > 500) {
    errors.description = "Máximo de 500 caracteres.";
  }
  if (!isValidHex(data.theme_color)) {
    errors.theme_color = "Cor inválida (use #RRGGBB).";
  }
  if (!isValidHex(data.theme_accent)) {
    errors.theme_accent = "Cor inválida (use #RRGGBB).";
  }
  data.social_links.forEach((link, index) => {
    if (!link.url) return;
    const isEmail = link.platform === "email";
    const valid = isEmail
      ? /^mailto:/i.test(link.url) || EMAIL_REGEX.test(link.url)
      : URL_REGEX.test(link.url);
    if (!valid) {
      errors[`link-${index}`] = `URL inválida em "${link.platform}".`;
    }
  });

  return errors;
}

interface ProfileFormProps {
  initialData: Profile;
  initialBlocks?: Block[];
}

const inputClass =
  "h-11 w-full rounded-card border border-gray-200 px-4 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20";

export default function ProfileForm({ initialData, initialBlocks }: ProfileFormProps) {
  const router = useRouter();
  const normalizedInitial: Profile = {
    ...initialData,
    social_links: (initialData.social_links ?? []).map((link) => ({
      ...link,
      platform: normalizePlatform(link.platform),
    })),
  };
  const [form, setForm] = useState<Profile>(normalizedInitial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(serialize(initialData));

  function serialize(data: Profile) {
    return JSON.stringify({
      username: data.username,
      name: data.name,
      description: data.description,
      photo_url: data.photo_url,
      theme_color: data.theme_color,
      theme_accent: data.theme_accent,
      social_links: data.social_links,
    });
  }

  const update = useCallback((patch: Partial<Profile>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  async function save() {
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    if (serialize(form) === lastSavedRef.current) return;

    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: form.username,
        name: form.name,
        description: form.description,
        photo_url: form.photo_url,
        theme_color: form.theme_color,
        theme_accent: form.theme_accent,
        social_links: form.social_links,
      })
      .eq("id", form.id);
    setSaving(false);

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        setErrors((prev) => ({
          ...prev,
          username: "Este username já está em uso.",
        }));
      } else {
        setErrors((prev) => ({ ...prev, general: error.message }));
      }
      return;
    }

    lastSavedRef.current = serialize(form);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useEffect(() => {
    const username = form.username;
    if (username === initialData.username) return;
    if (!USERNAME_REGEX.test(username)) return;

    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/username/check?username=${encodeURIComponent(
          username,
        )}&current=${encodeURIComponent(initialData.username)}`,
      );
      const data = await res.json();
      if (!data.available) {
        setErrors((prev) => ({
          ...prev,
          username: "Este username já está em uso.",
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.username;
          return next;
        });
      }
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.username, initialData.username]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_480px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-8"
        noValidate
      >
        <section className="space-y-4 rounded-card border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-gray-900">Informações básicas</h2>

          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nome
            </label>
            <input
              id="name"
              type="text"
              maxLength={100}
              value={form.name ?? ""}
              onChange={(e) => update({ name: e.target.value })}
              className={inputClass}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              maxLength={30}
              value={form.username}
              onChange={(e) => update({ username: e.target.value })}
              className={inputClass}
              aria-invalid={Boolean(errors.username)}
            />
            {errors.username ? (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                Sua página pública: /{form.username || "..."}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Descrição
            </label>
            <RichTextEditor
              content={form.description ?? ""}
              onChange={(content) => update({ description: content })}
              maxLength={500}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="photo_url"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Foto do perfil
            </label>
            <PhotoUploader
              userId={form.user_id}
              photoUrl={form.photo_url}
              onChange={(photo_url) => update({ photo_url })}
            />
            <label
              htmlFor="photo_url"
              className="mb-1 mt-3 block text-xs text-gray-500"
            >
              ou insira a URL da foto
            </label>
            <input
              id="photo_url"
              type="url"
              value={form.photo_url ?? ""}
              onChange={(e) => update({ photo_url: e.target.value })}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-card border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-gray-900">Links sociais</h2>
          <SocialLinksInput
            value={form.social_links}
            onChange={(social_links) => update({ social_links })}
          />
          {Object.keys(errors)
            .filter((key) => key.startsWith("link-"))
            .map((key) => (
              <p key={key} className="text-sm text-red-600">
                {errors[key]}
              </p>
            ))}
        </section>

        <section className="space-y-6 rounded-card border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-gray-900">Tema</h2>
          <ColorPicker
            label="Cor primária"
            value={form.theme_color}
            onChange={(theme_color) => update({ theme_color })}
          />
          {errors.theme_color && (
            <p className="text-sm text-red-600">{errors.theme_color}</p>
          )}
          <ColorPicker
            label="Cor de destaque"
            value={form.theme_accent}
            onChange={(theme_accent) => update({ theme_accent })}
          />
          {errors.theme_accent && (
            <p className="text-sm text-red-600">{errors.theme_accent}</p>
          )}
        </section>

        {errors.general && (
          <p role="alert" className="text-sm text-red-600">
            {errors.general}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-card bg-gradient-to-br from-[#7C3AED] to-[#F97316] px-6 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <Link
            href="/dashboard/preview"
            className="h-12 rounded-card border border-gray-200 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:border-[#7C3AED]"
          >
            Preview completo
          </Link>
          <span className="text-sm text-gray-400">
            {saving
              ? "Salvando automaticamente..."
              : savedAt
                ? `Salvo às ${savedAt}`
                : "Salvamento automático ativo"}
          </span>
        </div>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-8">
          <PreviewPane profile={form} blocks={initialBlocks ?? []} />
        </div>
      </aside>
    </div>
  );
}
