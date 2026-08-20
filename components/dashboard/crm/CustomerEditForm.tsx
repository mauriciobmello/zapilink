"use client";

import { useState } from "react";
import { formatPhone, normalizePhone } from "@/lib/crm/format";
import type { CustomerSummary } from "@/types/crm";

interface CustomerEditFormProps {
  profileId: string;
  customer: CustomerSummary;
  onSaved: (customer: CustomerSummary) => void;
  onCancel: () => void;
}

export default function CustomerEditForm({
  profileId,
  customer,
  onSaved,
  onCancel,
}: CustomerEditFormProps) {
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ? formatPhone(customer.phone) : "",
    email: customer.email ?? "",
    cpf: customer.cpf ?? "",
    birthDate: customer.birth_date ?? "",
    gender: customer.gender ?? "",
    origin: customer.origin ?? "manual",
    city: customer.city ?? "",
    profession: customer.profession ?? "",
    company: customer.company ?? "",
    notes: customer.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origins = [
    { value: "manual", label: "Cadastro manual" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "instagram", label: "Instagram" },
    { value: "google", label: "Google" },
    { value: "site", label: "Site" },
    { value: "indicacao", label: "Indicação" },
    { value: "agenda", label: "Agenda" },
    { value: "fidelidade", label: "Fidelidade" },
    { value: "cupom", label: "Cupom" },
    { value: "importacao", label: "Importação" },
    { value: "outro", label: "Outro" },
  ];

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      setForm((f) => ({ ...f, phone: formatPhone(digits) }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/crm/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          name: form.name,
          phone: form.phone ? normalizePhone(form.phone) : null,
          email: form.email || null,
          cpf: form.cpf || null,
          birthDate: form.birthDate || null,
          gender: form.gender || null,
          origin: form.origin,
          city: form.city || null,
          profession: form.profession || null,
          company: form.company || null,
          notes: form.notes || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar.");
        return;
      }
      onSaved(data.customer as CustomerSummary);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-card bg-white p-6 shadow-card"
    >
      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="Telefone">
          <input
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="CPF">
          <input
            value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="Data de nascimento">
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, birthDate: e.target.value }))
            }
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="Gênero">
          <select
            value={form.gender}
            onChange={(e) =>
              setForm((f) => ({ ...f, gender: e.target.value }))
            }
            className="h-12 w-full rounded-card border border-gray-200 bg-white px-3 outline-none focus:border-[#7C3AED]"
          >
            <option value="">—</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="non_binary">Não-binário</option>
            <option value="other">Outro</option>
            <option value="prefer_not_to_say">Prefiro não informar</option>
          </select>
        </Field>
        <Field label="Origem">
          <select
            value={form.origin}
            onChange={(e) =>
              setForm((f) => ({ ...f, origin: e.target.value }))
            }
            className="h-12 w-full rounded-card border border-gray-200 bg-white px-3 outline-none focus:border-[#7C3AED]"
          >
            {origins.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cidade">
          <input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="Profissão">
          <input
            value={form.profession}
            onChange={(e) =>
              setForm((f) => ({ ...f, profession: e.target.value }))
            }
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="Empresa">
          <input
            value={form.company}
            onChange={(e) =>
              setForm((f) => ({ ...f, company: e.target.value }))
            }
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
        </Field>
      </div>

      <Field label="Observações">
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={4}
          className="w-full rounded-card border border-gray-200 p-3 outline-none focus:border-[#7C3AED]"
        />
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-card bg-[#7C3AED] px-6 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-12 rounded-card border border-gray-200 bg-white px-6 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
