"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone, formatCurrency } from "@/lib/crm/format";
import type { CustomerSummary } from "@/types/crm";

interface CustomerDetailProps {
  profileId: string;
  customer: CustomerSummary;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

const TABS = ["Resumo", "Dados"] as const;

export default function CustomerDetail({
  profileId,
  customer,
}: CustomerDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Resumo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInactivate() {
    if (!confirm("Deseja inativar este cliente?")) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/customers/${customer.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível inativar o cliente.");
        return;
      }
      router.push(`/dashboard/crm/customers?profileId=${encodeURIComponent(profileId)}`);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-card bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatPhone(customer.phone)}
              {customer.email && ` · ${customer.email}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {customer.is_vip && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  VIP
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${customer.status === "active" ? "bg-green-100 text-green-700" : customer.status === "inactive" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}
              >
                {STATUS_LABEL[customer.status] ?? customer.status}
              </span>
              {customer.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: tag.color ?? "#7C3AED",
                    color: "#fff",
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleInactivate}
            disabled={loading}
            className="rounded-card border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            {loading ? "Processando..." : "Inativar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${activeTab === tab ? "border-[#7C3AED] text-[#7C3AED]" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Resumo" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total gasto" value={formatCurrency(customer.total_spent)} />
          <MetricCard label="Ticket médio" value={formatCurrency(customer.average_ticket)} />
          <MetricCard label="Compras" value={customer.purchase_count.toString()} />
          <MetricCard label="Agendamentos" value={customer.appointment_count.toString()} />
          <MetricCard label="Frequência" value={`${customer.purchase_frequency.toFixed(1)}x/mês`} />
          <MetricCard label="Fidelidade" value={`${customer.loyalty_points} pontos`} />
          <MetricCard label="Última interação" value={formatDate(customer.last_interaction_at)} />
          <MetricCard label="Cliente desde" value={formatDate(customer.created_at)} />
        </div>
      )}

      {activeTab === "Dados" && (
        <div className="rounded-card bg-white p-6 shadow-card">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DataItem label="Nome" value={customer.name} />
            <DataItem label="Telefone" value={formatPhone(customer.phone)} />
            <DataItem label="E-mail" value={customer.email} />
            <DataItem label="CPF" value={customer.cpf} />
            <DataItem label="Nascimento" value={formatDate(customer.birth_date)} />
            <DataItem label="Gênero" value={customer.gender} />
            <DataItem label="Origem" value={customer.origin} />
            <DataItem label="Cidade" value={customer.city} />
            <DataItem label="Profissão" value={customer.profession} />
            <DataItem label="Empresa" value={customer.company} />
          </dl>
          {customer.notes && (
            <div className="mt-4">
              <dt className="text-sm font-medium text-gray-500">Observações</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                {customer.notes}
              </dd>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function DataItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}
