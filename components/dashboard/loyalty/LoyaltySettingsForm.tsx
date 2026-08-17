"use client";

import { useState } from "react";
import type { LoyaltyProgram } from "@/types/loyalty";

interface LoyaltySettingsFormProps {
  profileId: string;
  username: string;
  program: LoyaltyProgram;
}

export default function LoyaltySettingsForm({
  profileId,
  username,
  program,
}: LoyaltySettingsFormProps) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? "");
  const [rules, setRules] = useState(program.rules ?? "");
  const [starsRequired, setStarsRequired] = useState(
    String(program.stars_required),
  );
  const [benefit, setBenefit] = useState(program.benefit_description ?? "");
  const [resetOnRedeem, setResetOnRedeem] = useState(program.reset_on_redeem);
  const [isActive, setIsActive] = useState(program.is_active);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/loyalty/program", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          name,
          description,
          rules,
          stars_required: Number(starsRequired),
          benefit_description: benefit,
          reset_on_redeem: resetOnRedeem,
          is_active: isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      setMessage("Programa salvo.");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-card bg-white p-6 shadow-card"
    >
      <div>
        <label
          htmlFor="program-name"
          className="block text-sm font-medium text-gray-700"
        >
          Nome do programa
        </label>
        <input
          id="program-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={150}
          className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
      </div>

      <div>
        <label
          htmlFor="program-description"
          className="block text-sm font-medium text-gray-700"
        >
          Descrição
        </label>
        <textarea
          id="program-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-card border border-gray-200 p-3 outline-none focus:border-[#7C3AED]"
        />
      </div>

      <div>
        <label
          htmlFor="program-rules"
          className="block text-sm font-medium text-gray-700"
        >
          Regras
        </label>
        <textarea
          id="program-rules"
          value={rules}
          onChange={(event) => setRules(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-card border border-gray-200 p-3 outline-none focus:border-[#7C3AED]"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="program-stars"
            className="block text-sm font-medium text-gray-700"
          >
            Estrelas para o benefício
          </label>
          <input
            id="program-stars"
            type="number"
            min={1}
            max={100}
            value={starsRequired}
            onChange={(event) => setStarsRequired(event.target.value)}
            required
            className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div>
          <label
            htmlFor="program-benefit"
            className="block text-sm font-medium text-gray-700"
          >
            Benefício
          </label>
          <input
            id="program-benefit"
            value={benefit}
            onChange={(event) => setBenefit(event.target.value)}
            placeholder="Ex.: 1 corte grátis"
            className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={resetOnRedeem}
          onChange={(event) => setResetOnRedeem(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          Iniciar um novo ciclo automaticamente após o resgate (o histórico
          anterior é preservado).
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          Programa ativo e visível em{" "}
          <span className="font-medium">/{username}/loyalty</span>
        </span>
      </label>

      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex h-12 items-center justify-center rounded-card bg-[#7C3AED] px-6 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar programa"}
      </button>
    </form>
  );
}
