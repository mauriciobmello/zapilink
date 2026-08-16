"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Block } from "@/types/block";
import type { Profile } from "@/types/profile";
import { createBrowserClient } from "@/lib/supabase/client";
import PhotoUploader from "./PhotoUploader";
import RichTextEditor from "./RichTextEditor";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

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

  return errors;
}

interface ProfileFormProps {
  initialData: Profile;
  initialBlocks?: Block[];
  canEdit?: boolean;
}

const inputClass =
  "h-11 w-full rounded-card border border-gray-200 px-4 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20";

export default function ProfileForm({ initialData, initialBlocks, canEdit = true }: ProfileFormProps) {
  console.log("[ProfileForm] canEdit:", canEdit);
  const router = useRouter();
  const [form, setForm] = useState<Profile>(initialData);
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
    });
  }

  const update = useCallback((patch: Partial<Profile>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  async function save() {
    if (!canEdit) {
      setErrors((prev) => ({ ...prev, general: "Você não tem permissão para editar este perfil." }));
      return;
    }

    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    if (serialize(form) === lastSavedRef.current) return;

    setSaving(true);
    const res = await fetch(`/api/profiles/${form.id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username,
        name: form.name,
        description: form.description,
        photo_url: form.photo_url,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      if (res.status === 409 || res.status === 400) {
        setErrors((prev) => ({
          ...prev,
          username: data.error || "Este username já está em uso.",
        }));
      } else if (res.status === 403) {
        setErrors((prev) => ({ ...prev, general: data.error || "Sem permissão." }));
      } else {
        setErrors((prev) => ({ ...prev, general: data.error || "Erro ao salvar." }));
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
            disabled={!canEdit}
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
            disabled={!canEdit}
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
            disabled={!canEdit}
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
            disabled={!canEdit}
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
            disabled={!canEdit}
          />
        </div>
      </section>

      {errors.general && (
        <p role="alert" className="text-sm text-red-600">
          {errors.general}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !canEdit}
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
              : canEdit ? "Salvamento automático ativo" : "Modo leitura"}
        </span>
      </div>
    </form>
  );
}
