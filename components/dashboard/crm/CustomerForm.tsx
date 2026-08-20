"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/crm/format";

interface CustomerFormProps {
  profileId: string;
}

export default function CustomerForm({ profileId }: CustomerFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [origin, setOrigin] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          name: name.trim(),
          phone,
          email: email.trim() || null,
          cpf: cpf.trim() || null,
          birthDate: birthDate || null,
          origin,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível cadastrar o cliente.");
        return;
      }
      router.push(
        `/dashboard/crm/customers/${data.customer.id}?profileId=${encodeURIComponent(profileId)}`,
      );
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      setPhone(formatPhone(digits));
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
          Nome completo *
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
          htmlFor="customer-phone"
          className="block text-sm font-medium text-gray-700"
        >
          Telefone *
        </label>
        <input
          id="customer-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => handlePhoneChange(event.target.value)}
          required
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
          className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="customer-cpf"
            className="block text-sm font-medium text-gray-700"
          >
            CPF
          </label>
          <input
            id="customer-cpf"
            value={cpf}
            onChange={(event) => setCpf(event.target.value)}
            className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div>
          <label
            htmlFor="customer-birth"
            className="block text-sm font-medium text-gray-700"
          >
            Data de nascimento
          </label>
          <input
            id="customer-birth"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="mt-1 h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="customer-origin"
          className="block text-sm font-medium text-gray-700"
        >
          Origem
        </label>
        <select
          id="customer-origin"
          value={origin}
          onChange={(event) => setOrigin(event.target.value)}
          className="mt-1 h-12 w-full rounded-card border border-gray-200 bg-white px-3 outline-none focus:border-[#7C3AED]"
        >
          <option value="manual">Cadastro manual</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="google">Google</option>
          <option value="site">Site</option>
          <option value="indication">Indicação</option>
          <option value="agenda">Agenda</option>
          <option value="fidelidade">Fidelidade</option>
          <option value="cupom">Cupom</option>
          <option value="importacao">Importação</option>
          <option value="outro">Outro</option>
        </select>
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
