"use client";

import { useState } from "react";

interface ModuleOption {
  id: string;
  label: string;
}

interface ModulesSettingsFormProps {
  profileId: string;
  available: ModuleOption[];
  enabled: string[];
}

export default function ModulesSettingsForm({
  profileId,
  available,
  enabled: initialEnabled,
}: ModulesSettingsFormProps) {
  const [enabled, setEnabled] = useState<string[]>(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSaved(false);
    setEnabled((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
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
      setSaved(true);
      window.location.reload();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-card bg-white p-6 shadow-card">
      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">
          Configurações salvas.
        </p>
      )}

      {available.map((mod) => (
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
  );
}
