"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/loyalty/customer";

interface LoyaltyRegisterFormProps {
  username: string;
  programName: string;
  primaryColor?: string;
}

export default function LoyaltyRegisterForm({
  username,
  programName,
  primaryColor = "#7C3AED",
}: LoyaltyRegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/loyalty/${username}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, consent }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível concluir o cadastro.");
        return;
      }
      setDone(data.message ?? "Cadastro concluído.");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-card bg-white p-6 text-center shadow-card">
        <h2 className="text-xl font-bold text-gray-900">Cadastro enviado</h2>
        <p className="mt-2 text-sm text-gray-600">{done}</p>
        <Link
          href={`/${username}/loyalty/progress`}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-card px-6 font-medium text-white shadow-card transition-colors hover:brightness-110"
          style={{ backgroundColor: primaryColor }}
        >
          Consultar meu progresso
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card bg-white p-6 shadow-card"
    >
      <h2 className="text-xl font-bold text-gray-900">{programName}</h2>
      <p className="mt-1 text-sm text-gray-500">
        Preencha seus dados para começar a acumular estrelas.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="loyalty-name"
            className="block text-sm font-medium text-gray-700"
          >
            Nome completo
          </label>
          <input
            id="loyalty-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={150}
            className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 text-gray-900 outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div>
          <label
            htmlFor="loyalty-email"
            className="block text-sm font-medium text-gray-700"
          >
            E-mail
          </label>
          <input
            id="loyalty-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 text-gray-900 outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div>
          <label
            htmlFor="loyalty-phone"
            className="block text-sm font-medium text-gray-700"
          >
            Telefone (com DDD)
          </label>
          <input
            id="loyalty-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            required
            className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 text-gray-900 outline-none focus:border-[#7C3AED]"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 h-4 w-4"
            required
          />
          <span>
            Autorizo o uso dos meus dados para participar do programa de
            fidelidade e receber avisos sobre meus benefícios.
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !consent}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-card px-4 font-medium text-white shadow-card transition-colors hover:brightness-110 disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}
      >
        {submitting ? "Enviando..." : "Participar do programa"}
      </button>
    </form>
  );
}
