"use client";

import { useState } from "react";
import { formatPhone } from "@/lib/loyalty/customer";
import type { LoyaltyPublicProgress } from "@/types/loyalty";
import StarProgress from "./StarProgress";

interface LoyaltyProgressLookupProps {
  username: string;
  primaryColor?: string;
  accentColor?: string;
}

export default function LoyaltyProgressLookup({
  username,
  primaryColor = "#7C3AED",
  accentColor = "#F97316",
}: LoyaltyProgressLookupProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<LoyaltyPublicProgress | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setProgress(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/loyalty/${username}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível consultar seu progresso.");
        return;
      }
      setProgress(data.progress as LoyaltyPublicProgress);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const remaining = progress
    ? Math.max(progress.stars_required - progress.stars_current, 0)
    : 0;

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="rounded-card bg-white p-6 shadow-card"
      >
        <h2 className="text-xl font-bold text-gray-900">Minhas estrelas</h2>
        <p className="mt-1 text-sm text-gray-500">
          Informe o e-mail e o telefone usados no cadastro.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="progress-email"
              className="block text-sm font-medium text-gray-700"
            >
              E-mail
            </label>
            <input
              id="progress-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 text-gray-900 outline-none focus:border-[#7C3AED]"
            />
          </div>
          <div>
            <label
              htmlFor="progress-phone"
              className="block text-sm font-medium text-gray-700"
            >
              Telefone (com DDD)
            </label>
            <input
              id="progress-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              required
              className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 text-gray-900 outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-card px-4 font-medium text-white shadow-card transition-colors hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </form>

      {progress && (
        <div className="rounded-card bg-white p-6 text-center shadow-card">
          <p className="text-sm text-gray-500">Olá, {progress.first_name}!</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {progress.stars_current}/{progress.stars_required}
          </p>
          <div className="mt-4 flex justify-center">
            <StarProgress
              current={progress.stars_current}
              required={progress.stars_required}
              accentColor={accentColor}
            />
          </div>
          {progress.benefit_state === "completed" ? (
            <div className="mt-5 rounded-card bg-green-50 px-4 py-3">
              <p className="font-semibold text-green-800">
                Você conquistou seu benefício!
              </p>
              <p className="mt-1 text-sm text-green-700">
                {progress.benefit_description ??
                  "Fale com o estabelecimento para resgatar."}{" "}
                Apresente esta tela no atendimento para resgatar.
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-gray-600">
              Faltam {remaining} {remaining === 1 ? "estrela" : "estrelas"} para{" "}
              {progress.benefit_description ?? "seu benefício"}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
