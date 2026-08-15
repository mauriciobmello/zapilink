"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  AvailabilityException,
  AvailabilityRule,
  ScheduleEvent,
} from "@/types/schedule";

const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Bahia",
  "America/Recife",
  "America/New_York",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "Europe/Lisbon",
  "Europe/London",
  "UTC",
];

const SECTIONS = [
  { id: "configuracao", label: "Configuração" },
  { id: "google-calendar", label: "Google Calendar" },
  { id: "regras-disponibilidade", label: "Regras de disponibilidade" },
  { id: "excecoes", label: "Exceções" },
  { id: "solicitacoes", label: "Solicitações" },
];

const inputClass =
  "h-11 w-full rounded-card border border-gray-200 px-4 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20";

interface ScheduleConfigProps {
  profileId: string;
  initialEvent: ScheduleEvent;
  initialRules: AvailabilityRule[];
  initialExceptions: AvailabilityException[];
  googleEmail: string | null;
  requestsSlot?: React.ReactNode;
}

export default function ScheduleConfig({
  profileId,
  initialEvent,
  initialRules,
  initialExceptions,
  googleEmail: initialGoogleEmail,
  requestsSlot,
}: ScheduleConfigProps) {
  const supabase = createBrowserClient();

  const [event, setEvent] = useState<ScheduleEvent>(initialEvent);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventMsg, setEventMsg] = useState<string | null>(null);

  const [rules, setRules] = useState<AvailabilityRule[]>(initialRules);
  const [exceptions, setExceptions] =
    useState<AvailabilityException[]>(initialExceptions);
  const [googleEmail, setGoogleEmail] = useState<string | null>(
    initialGoogleEmail,
  );
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    container.querySelectorAll("section[id]").forEach((section) => {
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, [requestsSlot]);

  function goToSection(id: string) {
    setActiveSection(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function persistEvent(e: React.FormEvent) {
    e.preventDefault();
    setSavingEvent(true);
    setEventMsg(null);
    const { data, error } = await supabase
      .from("schedule_events")
      .update({
        title: event.title,
        description: event.description,
        duration_minutes: event.duration_minutes,
        default_capacity: event.default_capacity,
        location: event.location,
        timezone: event.timezone,
        is_active: event.is_active,
      })
      .eq("profile_id", profileId)
      .select()
      .single();
    if (error) {
      setEventMsg(error.message);
    } else {
      setEvent(data);
      setEventMsg("Agenda salva com sucesso.");
    }
    setSavingEvent(false);
  }

  async function addRule() {
    const { data, error } = await supabase
      .from("availability_rules")
      .insert({
        profile_id: profileId,
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
      })
      .select()
      .single();
    if (!error && data) {
      setRules([...rules, data]);
    } else {
      console.error("Error adding rule:", error);
    }
  }

  async function saveRule(rule: AvailabilityRule) {
    const ruleToSave = {
      ...rule,
      profile_id: profileId,
    };
    const { error } = await supabase
      .from("availability_rules")
      .upsert(ruleToSave);
    if (!error) {
      setRules(rules.map((r) => (r.id === rule.id ? rule : r)));
    } else {
      console.error("Error saving rule:", error);
    }
  }

  async function deleteRule(id: string) {
    await supabase.from("availability_rules").delete().eq("id", id);
    setRules(rules.filter((r) => r.id !== id));
  }

  async function addException() {
    const { data, error } = await supabase
      .from("availability_exceptions")
      .insert({
        profile_id: profileId,
        date: new Date().toISOString().slice(0, 10),
        type: "blocked",
        start_time: null,
        end_time: null,
        capacity: null,
      })
      .select()
      .single();
    if (!error && data) {
      setExceptions([...exceptions, data]);
    } else {
      console.error("Error adding exception:", error);
    }
  }

  async function saveException(ex: AvailabilityException) {
    console.log("Saving exception:", ex);
    
    // Ensure profile_id is included
    const exceptionToSave = {
      ...ex,
      profile_id: profileId,
    };
    
    console.log("Exception to save (with profile_id):", exceptionToSave);
    
    const { data, error } = await supabase
      .from("availability_exceptions")
      .upsert(exceptionToSave)
      .select()
      .single();
    
    if (!error && data) {
      console.log("Exception saved successfully:", data);
      setExceptions(exceptions.map((x) => (x.id === ex.id ? data : x)));
    } else {
      console.error("Error saving exception:", error);
      console.error("Error details:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      alert(`Erro ao salvar exceção: ${error?.message || 'Erro desconhecido'}`);
    }
  }

  async function deleteException(id: string) {
    await supabase.from("availability_exceptions").delete().eq("id", id);
    setExceptions(exceptions.filter((x) => x.id !== id));
  }

  async function disconnectGoogle() {
    setGoogleMsg(null);
    const res = await fetch("/api/schedule/google/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    if (res.ok) {
      setGoogleEmail(null);
    } else {
      setGoogleMsg("Não foi possível desconectar.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
      <nav className="rounded-card bg-white p-3 shadow-card lg:sticky lg:top-6">
        <ul className="flex flex-wrap gap-1 lg:flex-col lg:flex-nowrap">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => goToSection(section.id)}
                className={`w-full rounded-card px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-[#7C3AED] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div ref={contentRef} className="space-y-8">
      <section
        id="configuracao"
        className="scroll-mt-6 rounded-card bg-white p-6 shadow-card"
      >
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Configurações do evento
        </h2>
        <form onSubmit={persistEvent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Título
              </label>
              <input
                className={inputClass}
                value={event.title}
                maxLength={255}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Local (opcional)
              </label>
              <input
                className={inputClass}
                value={event.location ?? ""}
                maxLength={255}
                onChange={(e) =>
                  setEvent({ ...event, location: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Descrição
            </label>
            <textarea
              className="w-full rounded-card border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
              value={event.description ?? ""}
              rows={3}
              onChange={(e) =>
                setEvent({ ...event, description: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Duração (min)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                className={inputClass}
                value={event.duration_minutes}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    duration_minutes: Number(e.target.value) || 60,
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Vagas por horário
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className={inputClass}
                value={event.default_capacity}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    default_capacity: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Fuso horário
              </label>
              <select
                className={inputClass}
                value={event.timezone}
                onChange={(e) =>
                  setEvent({ ...event, timezone: e.target.value })
                }
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={event.is_active}
              onChange={(e) =>
                setEvent({ ...event, is_active: e.target.checked })
              }
              className="h-5 w-5 rounded border-gray-300 accent-[#7C3AED]"
            />
            Agenda ativa (exibir página pública e botão de agendar)
          </label>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={savingEvent}
              className="rounded-card bg-[#7C3AED] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {savingEvent ? "Salvando..." : "Salvar alterações"}
            </button>
            {eventMsg && (
              <span className="text-sm text-gray-600">{eventMsg}</span>
            )}
          </div>
        </form>
      </section>

      <section
        id="google-calendar"
        className="scroll-mt-6 rounded-card bg-white p-6 shadow-card"
      >
        <h2 className="mb-4 text-lg font-bold text-gray-900">Google Calendar</h2>
        {googleEmail ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Conectado como <strong>{googleEmail}</strong>. Sua disponibilidade
              será cruzada com seus eventos e confirmações criam eventos no seu
              calendário.
            </div>
            <button
              onClick={disconnectGoogle}
              className="rounded-card border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-gray-600">
              Conecte para checar conflitos de agenda e criar eventos na
              aprovação.
            </p>
            <a
              href={`/api/schedule/google/connect?profileId=${profileId}`}
              className="inline-block rounded-card bg-white border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-card transition-colors hover:bg-gray-50"
            >
              Conectar com Google Calendar
            </a>
          </div>
        )}
        {googleMsg && <p className="mt-2 text-sm text-red-600">{googleMsg}</p>}
      </section>

      <section
        id="regras-disponibilidade"
        className="scroll-mt-6 rounded-card bg-white p-6 shadow-card"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Regras de disponibilidade
          </h2>
          <button
            onClick={addRule}
            className="rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Regra
          </button>
        </div>
        {rules.length === 0 && (
          <p className="text-sm text-gray-500">
            Nenhuma regra definida. Adicione regras para liberar horários.
          </p>
        )}
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center gap-3 rounded-card bg-gray-50 p-3"
            >
              <select
                className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm"
                value={rule.day_of_week}
                onChange={(e) =>
                  saveRule({
                    ...rule,
                    day_of_week: Number(e.target.value) as AvailabilityRule["day_of_week"],
                  })
                }
              >
                {DAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm"
                value={rule.start_time}
                onChange={(e) =>
                  saveRule({ ...rule, start_time: e.target.value })
                }
              />
              <span className="text-gray-400">até</span>
              <input
                type="time"
                className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm"
                value={rule.end_time}
                onChange={(e) =>
                  saveRule({ ...rule, end_time: e.target.value })
                }
              />
              <button
                onClick={() => deleteRule(rule.id)}
                className="ml-auto rounded-card px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      <section
        id="excecoes"
        className="scroll-mt-6 rounded-card bg-white p-6 shadow-card"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Exceções</h2>
          <button
            onClick={addException}
            className="rounded-card bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Exceção
          </button>
        </div>
        {exceptions.length === 0 && (
          <p className="text-sm text-gray-500">
            Nenhuma exceção. Use exceções para bloquear datas ou ajustar vagas
            específicas.
          </p>
        )}
        <div className="space-y-2">
          {exceptions.map((ex) => (
            <div
              key={ex.id}
              className="flex flex-wrap items-center gap-3 rounded-card bg-gray-50 p-3"
            >
              <input
                type="date"
                className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm"
                value={ex.date}
                onChange={(e) =>
                  saveException({ ...ex, date: e.target.value })
                }
              />
              <select
                className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm"
                value={ex.type}
                onChange={(e) =>
                  saveException({
                    ...ex,
                    type: e.target.value as AvailabilityException["type"],
                    start_time: e.target.value === "blocked" ? ex.start_time : null,
                    end_time: e.target.value === "blocked" ? ex.end_time : null,
                    capacity: e.target.value === "capacity_override" ? ex.capacity : null,
                  })
                }
              >
                <option value="blocked">Bloquear</option>
                <option value="capacity_override">Ajustar vagas</option>
              </select>
              <>
                <input
                  type="time"
                  className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm"
                  value={ex.start_time ?? ""}
                  onChange={(e) =>
                    saveException({ ...ex, start_time: e.target.value || null })
                  }
                />
                <span className="text-gray-400">até</span>
                <input
                  type="time"
                  className="h-10 rounded-card border border-gray-200 bg-white px-3 text-sm"
                  value={ex.end_time ?? ""}
                  onChange={(e) =>
                    saveException({ ...ex, end_time: e.target.value || null })
                  }
                />
              </>
              {ex.type === "capacity_override" && (
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="h-10 w-28 rounded-card border border-gray-200 bg-white px-3 text-sm"
                  value={ex.capacity ?? ""}
                  placeholder="Vagas"
                  onChange={(e) =>
                    saveException({
                      ...ex,
                      capacity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              )}
              <button
                onClick={() => deleteException(ex.id)}
                className="ml-auto rounded-card px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {requestsSlot}
      </div>
    </div>
  );
}