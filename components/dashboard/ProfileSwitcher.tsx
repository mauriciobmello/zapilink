"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";
import { securityLogger } from "@/lib/security-logger";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export default function ProfileSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ready, setReady] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || cancelled) return;
      
      const { data: rows, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error loading profiles:", error);
        await securityLogger.error("Failed to load user profiles", {
          userId: data.user.id,
          error: error.message,
        });
      }
      
      if (!cancelled) {
        // Ensure client-side filtering as a security measure
        const userProfiles = (rows ?? []).filter(
          (profile: any) => profile.user_id === data.user.id
        );
        setProfiles(userProfiles as Profile[]);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function switchProfile(nextId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("profileId", nextId);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function createProfile() {
    if (!USERNAME_REGEX.test(username.trim())) {
      setError("Username deve ter 3-30 caracteres (letras, números e _).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Não foi possível criar o perfil.");
        return;
      }
      router.push(`/dashboard/edit?profileId=${data.id}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      <select
        aria-label="Selecionar perfil"
        value={profileId ?? profiles[0]?.id ?? ""}
        onChange={(e) => switchProfile(e.target.value)}
        disabled={!ready}
        className="h-10 max-w-[180px] rounded-card border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none focus:border-[#7C3AED]"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            @{p.username}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          setShowCreate((v) => !v);
          setError(null);
          if (createTimer.current) clearTimeout(createTimer.current);
        }}
        className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:border-[#7C3AED] hover:text-[#7C3AED]"
        title="Criar novo perfil"
      >
        + Novo
      </button>

      {showCreate && (
        <div className="absolute right-0 top-12 z-20 w-72 rounded-card border border-gray-100 bg-white p-4 shadow-cardHover">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Criar novo perfil
          </p>
          <input
            autoFocus
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
              if (createTimer.current) clearTimeout(createTimer.current);
              createTimer.current = setTimeout(() => setError(null), 500);
            }}
            placeholder="username"
            maxLength={30}
            className="h-10 w-full rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <button
            onClick={() => void createProfile()}
            disabled={creating}
            className="mt-3 w-full rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Criando..." : "Criar perfil"}
          </button>
        </div>
      )}
    </div>
  );
}