"use client";

import { useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 1500 * 1024;

interface PhotoUploaderProps {
  userId: string;
  photoUrl: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export default function PhotoUploader({
  userId,
  photoUrl,
  onChange,
  disabled = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Imagem muito grande. O tamanho máximo é de 1500KB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setError(`Não foi possível enviar a imagem: ${uploadError.message}`);
        return;
      }
      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setError("Falha ao enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Foto do perfil"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
            Sem foto
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className="h-11 rounded-card border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:border-[#7C3AED] disabled:opacity-50"
        >
          {uploading ? "Enviando..." : "Enviar imagem"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-gray-400">Tamanho máximo: 1500KB.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}