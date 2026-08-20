"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface ModuleOption {
  id: string;
  label: string;
}

export default function ModulesSettingsPage() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    fetch(`/api/profiles/${profileId}/modules`)
      .then((res) => res.json())
      .then((data) => {
        setModules(data.available ?? []);
        setEnabled(data.enabled ?? []);
      })
      .catch(() => setError("Não foi possível carregar os módulos."))
      .finally(() => setLoading(false));
  }, [profileId]);

  function toggle(id: string) {
    setEnabled((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setEnabled(data.enabled ?? []);
      window.location.reload();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={profileId ? `/dashboard?profileId=${encodeURIComponent(profileId)}` : "/dashboard"}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Visão Geral
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Habilitar módulos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Escolha quais módulos aparecerão no painel deste perfil.
        </p>
      </div>

      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="space-y-4 rounded-card bg-white p-6 shadow-card">
          {modules.map((mod) => (
            <label
              key={mod.id}
              className="flex cursor-pointer items-center gap-3"
            >
              <input
                type="checkbox"
                checked={enabled.includes(mod.id)}
                onChange={() => toggle(mod.id)}
                className="h-5 w-5 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
              />
              <span className="font-medium text-gray-900">{mod.label}</span>
            </label>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 h-12 w-full rounded-card bg-[#7C3AED] px-4 font-medium text-white hover:brightness-110 disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      )}
    </div>
  );
}
