"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/loyalty/customer";

interface LoyaltyCustomerFormProps {
  profileId: string;
}

export default function LoyaltyCustomerForm({
  profileId,
}: LoyaltyCustomerFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/loyalty/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, name, email, phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível cadastrar o cliente.");
        return;
      }
      router.push(
        `/dashboard/loyalty/customers/${data.member_id}?profileId=${encodeURIComponent(profileId)}`,
      );
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-card bg-white p-6 shadow-card"
    >
      <div>
        <label
          htmlFor="customer-name"
          className="block text-sm font-medium text-gray-700"
        >
          Nome completo
        </label>
        <input
          id="customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={150}
          className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
      </div>
      <div>
        <label
          htmlFor="customer-email"
          className="block text-sm font-medium text-gray-700"
        >
          E-mail
        </label>
        <input
          id="customer-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
      </div>
      <div>
        <label
          htmlFor="customer-phone"
          className="block text-sm font-medium text-gray-700"
        >
          Telefone (com DDD)
        </label>
        <input
          id="customer-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          required
          className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
      </div>

      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex h-12 items-center justify-center rounded-card bg-[#7C3AED] px-6 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
      >
        {saving ? "Cadastrando..." : "Cadastrar cliente"}
      </button>
    </form>
  );
}
