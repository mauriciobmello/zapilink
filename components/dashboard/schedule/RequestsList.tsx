"use client";

import { useState } from "react";
import type { Booking, BookingStatus } from "@/types/schedule";
import { type Section } from "./ScheduleLayout";

interface RequestsListProps {
  bookings: Booking[];
  eventTitle: string;
  activeSection: Section;
}

function formatDateTime(booking: Booking): string {
  const [y, m, d] = booking.slot_date.split("-");
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  const date = dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${date} · ${booking.slot_start_time.slice(0, 5)}`;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  declined: "Recusado",
};

const STATUS_CLASSES: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export default function RequestsList({ bookings, eventTitle, activeSection }: RequestsListProps) {
  const [list, setList] = useState<Booking[]>(bookings);
  const [error, setError] = useState<string | null>(null);

  async function decide(booking: Booking, action: "approve" | "decline") {
    setError(null);
    const res = await fetch(
      `/api/schedule/respond/${booking.approval_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Não foi possível atualizar a solicitação.");
      return;
    }
    setList(
      list.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              status: action === "approve" ? "approved" : "declined",
              decided_at: new Date().toISOString(),
            }
          : b,
      ),
    );
  }

  if (activeSection !== "requests") {
    return null;
  }

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Solicitações</h2>
      {error && (
        <div className="mb-4 rounded-card bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {list.length === 0 && (
        <p className="text-sm text-gray-500">
          Nenhuma solicitação para {eventTitle} ainda.
        </p>
      )}
      <div className="space-y-3">
        {list.map((booking) => (
          <div
            key={booking.id}
            className="flex flex-wrap items-center gap-3 rounded-card bg-gray-50 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {booking.invitee_name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[booking.status]}`}
                >
                  {STATUS_LABELS[booking.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {formatDateTime(booking)} · {booking.invitee_email}
                {booking.invitee_phone && ` · ${booking.invitee_phone}`}
              </p>
            </div>
            {booking.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => decide(booking, "approve")}
                  className="rounded-card bg-green-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => decide(booking, "decline")}
                  className="rounded-card border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Recusar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}