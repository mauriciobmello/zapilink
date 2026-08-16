"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AvailableSlot } from "@/types/schedule";
import ScheduleCalendar from "./ScheduleCalendar";
import type { Profile } from "@/types/profile";

interface BookingFormProps {
  username: string;
  profile: Profile;
  event: {
    title: string;
    description: string | null;
    duration_minutes: number;
  };
}

interface AvailabilityResponse {
  slots: AvailableSlot[];
  event: { title: string; description: string | null } | null;
}

function formatDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt
    .toLocaleDateString("pt-BR", { weekday: "long" })
    .replace("-feira", "");
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${weekday} - ${dd}/${mm}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return `${h}h${m}`;
}

export default function BookingForm({ username, profile, event }: BookingFormProps) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<AvailableSlot | null>(null);

  const primaryColor = profile.theme_color || "#7C3AED";

  useEffect(() => {
    fetch(`/api/schedule/${username}/availability`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: AvailabilityResponse) => {
        setSlots(data.slots ?? []);
        if (data.slots.length > 0) {
          setSelectedDate(data.slots[0].date);
        }
      })
      .catch(() => setLoadError("Não foi possível carregar os horários."))
      .finally(() => setLoading(false));
  }, [username]);

  const grouped = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const slot of slots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0] < b[0] ? -1 : 1,
    );
  }, [slots]);

  const selectedSlots = useMemo(
    () => grouped.find(([date]) => date === selectedDate)?.[1] ?? [],
    [grouped, selectedDate],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const slot = selectedSlots.find((s) => s.start_time === selectedTime);
      if (!slot) return;

      setSubmitting(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/schedule/${username}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_date: slot.date,
            slot_start_time: slot.start_time,
            slot_end_time: slot.end_time,
            name,
            email,
            phone,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data?.error ?? "Não foi possível reservar.");
          return;
        }
        setSuccess(slot);
      } catch {
        setMessage("Erro de conexão. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
    },
    [selectedSlots, selectedTime, username, name, email, phone],
  );

  if (success) {
    const [y, m, d] = success.date.split("-").map(Number);
    const successDate = new Date(y, m - 1, d);
    const weekday = successDate.toLocaleDateString("pt-BR", {
      weekday: "long",
    });
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");

    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-page px-4">
        <div className="w-full max-w-md rounded-card bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitação enviada!</h1>
          <p className="mt-3 text-gray-600">
            Agendamos as <strong>{formatTime(success.start_time)}</strong> do dia{" "}
            <strong>
              {dd}/{mm} ({weekday})
            </strong>
            . Aguarde a confirmação no seu e-mail <strong>{email}</strong>.
          </p>
          <button
            onClick={() => {
              setSuccess(null);
              setSelectedTime(null);
              setMessage(null);
            }}
            className="mt-6 rounded-card px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            Agendar outro horário
          </button>
          <a
            href={`/${username}`}
            className="mt-3 block rounded-card border border-gray-200 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Voltar para a página
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-page px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          {event.description && (
            <p className="mt-2 text-gray-500">{event.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-400">
            Duração: {event.duration_minutes} min
          </p>
        </div>

        {loading && (
          <div className="rounded-card bg-white p-8 text-center text-gray-500 shadow-card">
            Carregando horários...
          </div>
        )}

        {loadError && (
          <div className="rounded-card bg-red-50 p-8 text-center text-red-600 shadow-card">
            {loadError}
          </div>
        )}

        {!loading && !loadError && grouped.length === 0 && (
          <div className="rounded-card bg-white p-8 text-center text-gray-500 shadow-card">
            Nenhum horário disponível no momento.
          </div>
        )}

        {!loading && !loadError && grouped.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <ScheduleCalendar
              slots={slots}
              primaryColor={primaryColor}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              selectedDate={selectedDate}
            />

            {selectedDate && (
              <div className="rounded-card bg-white p-6 shadow-card">
                <h2 className="mb-3 text-sm font-semibold text-gray-500">
                  Horários disponíveis para {formatDateShort(selectedDate)}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {selectedSlots.map((slot) => (
                    <button
                      key={`${slot.date}|${slot.start_time}`}
                      type="button"
                      onClick={() => slot.remaining_capacity > 0 && setSelectedTime(slot.start_time)}
                      disabled={slot.remaining_capacity <= 0}
                      className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
                        selectedTime === slot.start_time
                          ? "bg-[var(--theme-primary,#7C3AED)] text-white"
                          : slot.remaining_capacity <= 0
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-card bg-white p-6 shadow-card">
              <h2 className="mb-3 text-sm font-semibold text-gray-500">
                Seus dados
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full rounded-card border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-[#7C3AED]"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-card border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-[#7C3AED]"
                />
                <input
                  type="tel"
                  placeholder="Telefone (opcional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-card border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>

            {message && (
              <div className="rounded-card bg-red-50 p-4 text-sm text-red-600">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedTime || submitting}
              className="w-full rounded-card px-6 py-4 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? "Enviando..." : "Solicitar horário"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}