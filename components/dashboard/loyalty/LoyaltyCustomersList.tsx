"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/loyalty/customer";
import type { LoyaltyCustomerSummary } from "@/types/loyalty";

interface LoyaltyCustomersListProps {
  profileId: string;
  initialCustomers: LoyaltyCustomerSummary[];
}

export default function LoyaltyCustomersList({
  profileId,
  initialCustomers,
}: LoyaltyCustomersListProps) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] =
    useState<LoyaltyCustomerSummary[]>(initialCustomers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ profileId });
        if (term) params.set("search", term);
        const response = await fetch(`/api/loyalty/customers?${params}`);
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Não foi possível carregar os clientes.");
          return;
        }
        setCustomers(data.customers as LoyaltyCustomerSummary[]);
      } catch {
        setError("Falha de conexão.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [profileId, search]);

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
          placeholder="Buscar por nome, e-mail ou telefone"
          className="h-12 flex-1 rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
        <Link
          href={`/dashboard/loyalty/customers/new${query}`}
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
          {customers.map((item) => (
            <li key={item.member_id}>
              <Link
                href={`/dashboard/loyalty/customers/${item.member_id}${query}`}
                className="flex items-center justify-between gap-3 rounded-card bg-white p-4 shadow-card transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {item.customer.name}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {formatPhone(item.customer.phone)} · {item.customer.email}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-gray-900">
                    {item.stars_current}/{item.stars_required}
                  </p>
                  {item.benefit_state === "completed" && (
                    <span className="text-xs font-medium text-green-700">
                      Benefício disponível
                    </span>
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
