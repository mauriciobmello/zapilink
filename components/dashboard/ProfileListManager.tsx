"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/types/profile";
import { securityLogger } from "@/lib/security-logger";

interface ProfileListManagerProps {
  profiles: Profile[];
  currentProfileId: string;
  onProfileDeleted: (profileId: string) => void;
}

export default function ProfileListManager({
  profiles,
  currentProfileId,
  onProfileDeleted,
}: ProfileListManagerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

  async function handleCreateProfile() {
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
      // Redirect to edit page with new profile
      window.location.href = `/dashboard/edit?profileId=${data.id}`;
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(profileId: string) {
    setDeletingId(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Não foi possível excluir o perfil.");
      }

      await securityLogger.info("Profile deleted successfully", {
        profileId: profileId,
      });

      onProfileDeleted(profileId);
    } catch (error) {
      console.error("Erro ao excluir perfil:", error);
      await securityLogger.error("Failed to delete profile", {
        profileId: profileId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      alert("Não foi possível excluir o perfil. Tente novamente.");
    } finally {
      setDeletingId(null);
      setShowConfirm(null);
    }
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-card border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Meus Perfis
        </h2>
        <p className="mt-2 text-gray-600">
          Você ainda não tem perfis. Crie seu primeiro perfil!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-gray-100 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Meus Perfis ({profiles.length})
        </h2>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setError(null);
            setUsername("");
          }}
          className="rounded-card border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-[#7C3AED] hover:text-[#7C3AED]"
        >
          + Novo
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Criar novo perfil
          </p>
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            placeholder="username"
            maxLength={30}
            className="h-10 w-full rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void handleCreateProfile()}
              disabled={creating}
              className="rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Criando..." : "Criar perfil"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setError(null);
                setUsername("");
              }}
              disabled={creating}
              className="rounded-card border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              profile.id === currentProfileId
                ? "border-[#7C3AED] bg-purple-50"
                : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#F97316] text-white text-sm font-bold">
                {profile.name
                  ? profile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : profile.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {profile.name || "Sem nome"}
                </p>
                <p className="text-sm text-gray-500">@{profile.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile.id === currentProfileId && (
                <span className="text-xs font-medium text-[#7C3AED]">
                  Atual
                </span>
              )}
              <Link
                href={`/dashboard/edit?profileId=${profile.id}`}
                className="rounded-card border border-[#7C3AED] bg-purple-50 px-3 py-1.5 text-sm font-medium text-[#7C3AED] transition-colors hover:bg-purple-100"
              >
                Editar
              </Link>
              <button
                onClick={() => {
                  if (profile.id === currentProfileId && profiles.length === 1) {
                    alert("Você não pode excluir seu único perfil.");
                    return;
                  }
                  setShowConfirm(profile.id);
                }}
                disabled={deletingId === profile.id}
                className="rounded-card border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {deletingId === profile.id ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showConfirm && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">
            Tem certeza que deseja excluir este perfil?
          </p>
          <p className="mt-1 text-sm text-red-700">
            Esta ação não pode ser desfeita. Todos os dados associados a este perfil serão perdidos.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleDelete(showConfirm)}
              disabled={deletingId === showConfirm}
              className="rounded-card bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === showConfirm ? "Excluindo..." : "Sim, excluir"}
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              disabled={deletingId === showConfirm}
              className="rounded-card border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
