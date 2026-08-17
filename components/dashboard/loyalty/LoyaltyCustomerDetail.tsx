"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StarProgress from "@/components/loyalty/StarProgress";
import { formatPhone } from "@/lib/loyalty/customer";
import type {
  LoyaltyBenefitRedemption,
  LoyaltyCustomer,
  LoyaltyProgram,
  LoyaltyProgramMember,
  LoyaltyStarTransaction,
} from "@/types/loyalty";

interface LoyaltyCustomerDetailProps {
  profileId: string;
  program: LoyaltyProgram;
  customer: LoyaltyCustomer;
  member: LoyaltyProgramMember;
  starsCurrent: number;
  transactions: LoyaltyStarTransaction[];
  redemptions: LoyaltyBenefitRedemption[];
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LoyaltyCustomerDetail({
  profileId,
  program,
  customer,
  member,
  starsCurrent,
  transactions,
  redemptions,
}: LoyaltyCustomerDetailProps) {
  const router = useRouter();
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const benefitAvailable = starsCurrent >= program.stars_required;
  const reversedIds = new Set(
    transactions
      .filter((tx) => tx.reverses_transaction_id)
      .map((tx) => tx.reverses_transaction_id as string),
  );

  async function post(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, memberId: member.id, ...body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Operação não concluída.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Falha de conexão. Tente novamente.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAddStar() {
    const ok = await post("/api/loyalty/stars", {
      service_description: service,
      notes,
    });
    if (ok) {
      setService("");
      setNotes("");
      setMessage("Estrela adicionada.");
    }
  }

  async function handleReverse(transactionId: string) {
    const ok = await post("/api/loyalty/stars/reverse", {
      transactionId,
      reason,
    });
    if (ok) {
      setReversingId(null);
      setReason("");
      setMessage("Estrela estornada.");
    }
  }

  async function handleRedeem() {
    const ok = await post("/api/loyalty/redemptions", { notes });
    if (ok) {
      setNotes("");
      setMessage("Resgate registrado.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-card bg-white p-6 shadow-card">
        <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {formatPhone(customer.phone)} · {customer.email}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Ciclo {member.current_cycle} · desde{" "}
          {formatDateTime(member.joined_at)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <p className="text-3xl font-bold text-gray-900">
            {starsCurrent}/{program.stars_required}
          </p>
          <StarProgress
            current={starsCurrent}
            required={program.stars_required}
          />
        </div>

        {benefitAvailable && (
          <div className="mt-5 rounded-card bg-green-50 px-4 py-3">
            <p className="font-semibold text-green-800">
              Benefício disponível
            </p>
            <p className="mt-1 text-sm text-green-700">
              {program.benefit_description ?? "Benefício do programa"}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}

        <div className="mt-5 space-y-3">
          <input
            value={service}
            onChange={(event) => setService(event.target.value)}
            placeholder="Serviço (opcional)"
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observação (opcional)"
            className="h-12 w-full rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleAddStar}
              disabled={busy || benefitAvailable || member.status !== "active"}
              className="flex h-12 flex-1 items-center justify-center rounded-card bg-[#7C3AED] px-4 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
            >
              Adicionar 1 estrela
            </button>
            <button
              type="button"
              onClick={handleRedeem}
              disabled={busy || !benefitAvailable}
              className="flex h-12 flex-1 items-center justify-center rounded-card bg-[#F97316] px-4 font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
            >
              Registrar resgate
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-card bg-white p-6 shadow-card">
        <h3 className="font-semibold text-gray-900">Histórico de estrelas</h3>
        {transactions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            Nenhuma estrela registrada ainda.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isReversal = tx.stars < 0;
              const reversed = reversedIds.has(tx.id);
              const canReverse =
                !isReversal && !reversed && tx.cycle === member.current_cycle;
              return (
                <li key={tx.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {isReversal ? "Estorno" : "+1 estrela"}
                        {tx.service_description
                          ? ` · ${tx.service_description}`
                          : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ciclo {tx.cycle} · {formatDateTime(tx.granted_at)}
                        {reversed ? " · estornada" : ""}
                      </p>
                      {tx.notes && (
                        <p className="mt-1 text-xs text-gray-500">{tx.notes}</p>
                      )}
                    </div>
                    {canReverse && (
                      <button
                        type="button"
                        onClick={() => {
                          setReversingId(tx.id);
                          setReason("");
                        }}
                        className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Estornar
                      </button>
                    )}
                  </div>
                  {reversingId === tx.id && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Motivo do estorno (obrigatório)"
                        className="h-11 flex-1 rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]"
                      />
                      <button
                        type="button"
                        onClick={() => handleReverse(tx.id)}
                        disabled={busy || reason.trim().length < 3}
                        className="h-11 rounded-card bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-60"
                      >
                        Confirmar estorno
                      </button>
                      <button
                        type="button"
                        onClick={() => setReversingId(null)}
                        className="h-11 rounded-card border border-gray-200 px-4 text-sm font-medium text-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-card bg-white p-6 shadow-card">
        <h3 className="font-semibold text-gray-900">Resgates</h3>
        {redemptions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nenhum resgate ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {redemptions.map((redemption) => (
              <li key={redemption.id} className="py-3">
                <p className="text-sm font-medium text-gray-900">
                  {redemption.benefit_description ?? "Benefício resgatado"}
                </p>
                <p className="text-xs text-gray-500">
                  Ciclo {redemption.cycle} · {redemption.stars_used} estrelas ·{" "}
                  {formatDateTime(redemption.redeemed_at)}
                </p>
                {redemption.notes && (
                  <p className="mt-1 text-xs text-gray-500">
                    {redemption.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
