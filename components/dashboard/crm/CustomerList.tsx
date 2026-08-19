"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/crm/format";
import type { CustomerSummary } from "@/types/crm";

interface CustomerListProps {
  profileId: string;
  initialCustomers: CustomerSummary[];
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-700",
};

export default function CustomerList({
  profileId,
  initialCustomers,
}: CustomerListProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [customers, setCustomers] = useState<CustomerSummary[]>(initialCustomers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ profileId });
        const term = search.trim();
        if (term) params.set("search", term);
        if (status) params.set("status", status);
        const response = await fetch(`/api/crm/customers?${params}`);
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Não foi possível carregar os clientes.");
          return;
        }
        setCustomers(data.customers as CustomerSummary[]);
      } catch {
        setError("Falha de conexão.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [profileId, search, status]);

  const query = useMemo(
    () => `?profileId=${encodeURIComponent(profileId)}`,
    [profileId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, telefone ou e-mail"
          className="h-12 flex-1 rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-12 rounded-card border border-gray-200 bg-white px-3 outline-none focus:border-[#7C3AED]"
        >
          <option value="">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="archived">Arquivados</option>
        </select>
        <Link
          href={`/dashboard/crm/customers/new${query}`}
          className="flex h-12 items-center justify-center rounded-card bg-[#7C3AED] px-4 font-medium text-white transition-colors hover:brightness-110"
        >
          Novo cliente
        </Link>
      </div>

      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {customers.length === 0 && !loading ? (
        <div className="rounded-card bg-white p-10 text-center shadow-card">
          <p className="text-gray-500">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/dashboard/crm/customers/${customer.id}${query}`}
                className="flex items-center justify-between gap-3 rounded-card bg-white p-4 shadow-card transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-gray-900">
                      {customer.name}
                    </p>
                    {customer.is_vip && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-gray-500">
                    {formatPhone(customer.phone)}
                    {customer.phone && customer.email && " · "}
                    {customer.email}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
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
                <div className="shrink-0 text-right">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[customer.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {STATUS_LABEL[customer.status] ?? customer.status}
                  </span>
                  {customer.last_interaction_at && (
                    <p className="mt-1 text-xs text-gray-500">
                      Última interação: {new Date(customer.last_interaction_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
