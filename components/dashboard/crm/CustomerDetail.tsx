"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone, formatCurrency } from "@/lib/crm/format";
import type { CustomerSummary, CustomerTag, CustomerNote, CustomerEvent } from "@/types/crm";
import type { CustomerLoyaltyInfo } from "@/lib/crm/server";
import type { Booking } from "@/types/schedule";

interface CustomerDetailProps {
  profileId: string;
  customer: CustomerSummary;
  loyalty: CustomerLoyaltyInfo | null;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

const TABS = ["Resumo", "Dados", "Fidelidade", "Agenda", "Histórico", "Observações"] as const;

const EVENT_ICONS: Record<string, string> = {
  customer_created: "👤",
  customer_updated: "✏️",
  appointment_created: "📅",
  appointment_completed: "✅",
  loyalty_updated: "⭐",
  coupon_redeemed: "🎟️",
  tag_added: "🏷️",
  tag_removed: "🏷️",
  note_created: "📝",
  purchase_completed: "🛒",
};

export default function CustomerDetail({
  profileId,
  customer,
  loyalty,
}: CustomerDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Resumo");
  const [loading, setLoading] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tags, setTags] = useState<CustomerTag[]>(customer.tags ?? []);
  const [allTags, setAllTags] = useState<CustomerTag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [newNote, setNewNote] = useState("");

  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [appointments, setAppointments] = useState<Booking[]>([]);

  useEffect(() => {
    if (activeTab === "Observações") loadNotes();
    if (activeTab === "Histórico") loadEvents();
    if (activeTab === "Agenda") loadAppointments();
  }, [activeTab, customer.id, profileId]);

  useEffect(() => {
    loadAllTags();
  }, [profileId]);

  async function loadAllTags() {
    try {
      const res = await fetch(`/api/crm/tags?profileId=${encodeURIComponent(profileId)}`);
      const data = await res.json();
      if (res.ok) setAllTags(data.tags ?? []);
    } catch {}
  }

  async function loadNotes() {
    try {
      const res = await fetch(
        `/api/crm/customers/${customer.id}/notes?profileId=${encodeURIComponent(profileId)}`,
      );
      const data = await res.json();
      if (res.ok) setNotes(data.notes ?? []);
    } catch {}
  }

  async function loadEvents() {
    try {
      const res = await fetch(
        `/api/crm/customers/${customer.id}/events?profileId=${encodeURIComponent(profileId)}`,
      );
      const data = await res.json();
      if (res.ok) setEvents(data.events ?? []);
    } catch {}
  }

  async function loadAppointments() {
    try {
      const res = await fetch(
        `/api/crm/customers/${customer.id}/appointments?profileId=${encodeURIComponent(profileId)}`,
      );
      const data = await res.json();
      if (res.ok) setAppointments(data.appointments ?? []);
    } catch {}
  }

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

  async function addTag(tagId: string) {
    if (tagLoading) return;
    setTagLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/customers/${customer.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, tagId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Não foi possível adicionar a tag.");
        return;
      }
      const tag = allTags.find((t) => t.id === tagId);
      if (tag) setTags((prev) => [...prev, tag]);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setTagLoading(false);
    }
  }

  async function removeTag(tagId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/crm/customers/${customer.id}/tags?profileId=${encodeURIComponent(profileId)}&tagId=${encodeURIComponent(tagId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Não foi possível remover a tag.");
        return;
      }
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch {
      setError("Falha de conexão.");
    }
  }

  async function createTag() {
    if (!newTagName.trim() || tagLoading) return;
    setTagLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, name: newTagName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a tag.");
        return;
      }
      setAllTags((prev) => [...prev, data.tag]);
      await addTag(data.tag.id);
      setNewTagName("");
    } catch {
      setError("Falha de conexão.");
    } finally {
      setTagLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/crm/customers/${customer.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, content: newNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível adicionar a observação.");
        return;
      }
      setNotes((prev) => [data.note, ...prev]);
      setNewNote("");
    } catch {
      setError("Falha de conexão.");
    }
  }

  const availableTags = allTags.filter((t) => !tags.some((ct) => ct.id === t.id));

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
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: tag.color ?? "#7C3AED",
                    color: "#fff",
                  }}
                  onClick={() => removeTag(tag.id)}
                  title="Clique para remover"
                >
                  {tag.name} ×
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value=""
                disabled={tagLoading}
                onChange={(e) => e.target.value && addTag(e.target.value)}
                className="h-9 rounded-card border border-gray-200 bg-white px-2 text-sm outline-none focus:border-[#7C3AED] disabled:opacity-60"
              >
                <option value="">+ Adicionar tag</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                disabled={tagLoading}
                placeholder="Nova tag"
                className="h-9 w-32 rounded-card border border-gray-200 px-2 text-sm outline-none focus:border-[#7C3AED] disabled:opacity-60"
              />
              <button
                onClick={createTag}
                disabled={tagLoading}
                className="h-9 rounded-card bg-[#7C3AED] px-3 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
              >
                Criar
              </button>
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
        <nav className="-mb-px flex flex-wrap gap-4 sm:gap-6" aria-label="Tabs">
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

      {activeTab === "Fidelidade" && (
        <LoyaltyTab customer={customer} loyalty={loyalty} />
      )}

      {activeTab === "Agenda" && (
        <AgendaTab appointments={appointments} />
      )}

      {activeTab === "Histórico" && (
        <HistoryTab events={events} />
      )}

      {activeTab === "Observações" && (
        <NotesTab
          notes={notes}
          newNote={newNote}
          setNewNote={setNewNote}
          onAdd={addNote}
        />
      )}
    </div>
  );
}

function LoyaltyTab({
  customer,
  loyalty,
}: {
  customer: CustomerSummary;
  loyalty: CustomerLoyaltyInfo | null;
}) {
  if (!loyalty || !loyalty.program) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-card">
        <p className="text-gray-500">
          Nenhum programa de fidelidade configurado para este negócio.
        </p>
      </div>
    );
  }

  if (!loyalty.customer) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-card">
        <p className="text-gray-500">
          Cliente ainda não participa do programa {loyalty.program.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card bg-white p-6 shadow-card">
        <h3 className="text-lg font-semibold text-gray-900">
          {loyalty.program.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {loyalty.program.description || "Sem descrição"}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Estrelas atuais</p>
            <p className="text-2xl font-bold text-[#7C3AED]">
              {loyalty.stars_current}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Meta</p>
            <p className="text-2xl font-bold text-gray-900">
              {loyalty.stars_required}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-2xl font-bold text-gray-900">
              {loyalty.benefit_state === "completed"
                ? "Benefício disponível"
                : "Em progresso"}
            </p>
          </div>
        </div>

        {loyalty.benefit_state === "completed" && (
          <div className="mt-4 rounded-card bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Próximo benefício:
            </p>
            <p className="text-green-900">
              {loyalty.program.benefit_description || "Benefício do programa"}
            </p>
          </div>
        )}

        {loyalty.last_transaction_at && (
          <p className="mt-4 text-sm text-gray-500">
            Última movimentação: {" "}
            {new Date(loyalty.last_transaction_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      {loyalty.redemptions.length > 0 && (
        <div className="rounded-card bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-gray-900">Resgates</h3>
          <ul className="mt-3 space-y-2">
            {loyalty.redemptions.map((redemption) => (
              <li
                key={redemption.id}
                className="flex items-center justify-between rounded-card bg-gray-50 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {redemption.benefit_description || "Benefício resgatado"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {redemption.stars_used} estrelas
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(redemption.redeemed_at).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AgendaTab({ appointments }: { appointments: Booking[] }) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-card">
        <p className="text-gray-500">Nenhum agendamento encontrado.</p>
      </div>
    );
  }

  const STATUS: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    declined: "Recusado",
  };

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <h3 className="text-lg font-semibold text-gray-900">Agendamentos</h3>
      <ul className="mt-3 space-y-2">
        {appointments.map((appointment) => (
          <li
            key={appointment.id}
            className="flex flex-col gap-1 rounded-card bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">
                {new Date(appointment.slot_date).toLocaleDateString("pt-BR")} ·{" "}
                {appointment.slot_start_time.slice(0, 5)}
              </p>
              <p className="text-sm text-gray-500">
                {appointment.invitee_name} · {appointment.invitee_email}
              </p>
            </div>
            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
              {STATUS[appointment.status] ?? appointment.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryTab({ events }: { events: CustomerEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-card">
        <p className="text-gray-500">Nenhum evento no histórico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex gap-3 rounded-card bg-white p-4 shadow-card"
        >
          <span className="text-xl">{EVENT_ICONS[event.event_type] ?? "•"}</span>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {event.description ?? event.event_type}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(event.created_at).toLocaleString("pt-BR")} ·{" "}
              <span className="capitalize">{event.source}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesTab({
  notes,
  newNote,
  setNewNote,
  onAdd,
}: {
  notes: CustomerNote[];
  newNote: string;
  setNewNote: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder="Adicionar observação interna"
          className="h-12 flex-1 rounded-card border border-gray-200 px-3 outline-none focus:border-[#7C3AED]"
        />
        <button
          onClick={onAdd}
          className="h-12 rounded-card bg-[#7C3AED] px-4 font-medium text-white hover:brightness-110"
        >
          Adicionar
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-card bg-white p-10 text-center shadow-card">
          <p className="text-gray-500">Nenhuma observação.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-card bg-white p-4 shadow-card"
            >
              <p className="whitespace-pre-wrap text-sm text-gray-900">
                {note.content}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {new Date(note.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
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
