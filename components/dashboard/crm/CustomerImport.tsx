"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PreviewRow {
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  origin: string | null;
  city: string | null;
  profession: string | null;
  company: string | null;
  reason?: string;
}

interface CustomerImportProps {
  profileId: string;
}

export default function CustomerImport({ profileId }: CustomerImportProps) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [delimiter, setDelimiter] = useState(";");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    valid: PreviewRow[];
    duplicates: PreviewRow[];
    invalid: PreviewRow[];
  } | null>(null);

  function parseRows(): unknown[] {
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(delimiter);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? "").trim();
      });
      return row;
    });
  }

  async function handlePreview() {
    const rows = parseRows();
    if (rows.length === 0) {
      setError("Cole pelo menos uma linha de dados além do cabeçalho.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível gerar a pré-visualização.");
        return;
      }
      setPreview(data);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview || preview.valid.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, rows: preview.valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível importar.");
        return;
      }
      router.push(`/dashboard/crm/customers?profileId=${encodeURIComponent(profileId)}`);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  const hasIssues =
    (preview?.duplicates.length ?? 0) > 0 || (preview?.invalid.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-card bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">
          Importar clientes via CSV
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Cole abaixo as linhas do arquivo CSV. A primeira linha deve conter o cabeçalho.
        </p>

        <div className="mt-4 flex gap-3">
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            className="h-12 rounded-card border border-gray-200 bg-white px-3 outline-none focus:border-[#7C3AED]"
          >
            <option value=";">Ponto-e-vírgula (;)</option>
            <option value=",">Vírgula (,)</option>
            <option value="\t">Tab</option>
          </select>
          <button
            onClick={handlePreview}
            disabled={loading}
            className="h-12 rounded-card bg-[#7C3AED] px-4 font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Pré-visualizar"}
          </button>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`nome;telefone;email;cpf;nascimento;cidade\nJoão Silva;(21) 99999-9999;joao@email.com;12345678900;1990-01-15;Rio de Janeiro`}
          rows={10}
          className="mt-4 w-full rounded-card border border-gray-200 p-3 font-mono text-sm outline-none focus:border-[#7C3AED]"
        />

        {error && (
          <p className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {preview && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card bg-green-50 p-4 text-center shadow-card">
              <p className="text-2xl font-bold text-green-700">
                {preview.valid.length}
              </p>
              <p className="text-sm text-green-800">Prontos para importar</p>
            </div>
            <div className="rounded-card bg-yellow-50 p-4 text-center shadow-card">
              <p className="text-2xl font-bold text-yellow-700">
                {preview.duplicates.length}
              </p>
              <p className="text-sm text-yellow-800">Duplicados</p>
            </div>
            <div className="rounded-card bg-red-50 p-4 text-center shadow-card">
              <p className="text-2xl font-bold text-red-700">
                {preview.invalid.length}
              </p>
              <p className="text-sm text-red-800">Inválidos</p>
            </div>
          </div>

          {hasIssues && (
            <p className="text-sm text-gray-500">
              Apenas os {preview.valid.length} registros válidos serão importados.
            </p>
          )}

          {preview.valid.length > 0 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="h-12 w-full rounded-card bg-[#7C3AED] px-4 font-medium text-white hover:brightness-110 disabled:opacity-60"
            >
              {loading
                ? "Importando..."
                : `Importar ${preview.valid.length} cliente(s)`}
            </button>
          )}

          {preview.valid.length > 0 && (
            <div className="rounded-card bg-white p-4 shadow-card">
              <h3 className="font-semibold text-gray-900">
                Prontos para importar
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {preview.valid.map((row, i) => (
                  <li key={i}>
                    {row.name} · {row.phone ?? "—"} · {row.email ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.duplicates.length > 0 && (
            <div className="rounded-card bg-yellow-50 p-4 shadow-card">
              <h3 className="font-semibold text-yellow-900">Duplicados</h3>
              <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                {preview.duplicates.map((row, i) => (
                  <li key={i}>
                    {row.name} · {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.invalid.length > 0 && (
            <div className="rounded-card bg-red-50 p-4 shadow-card">
              <h3 className="font-semibold text-red-900">Inválidos</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-800">
                {preview.invalid.map((row, i) => (
                  <li key={i}>
                    {row.name || "Sem nome"} · {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
