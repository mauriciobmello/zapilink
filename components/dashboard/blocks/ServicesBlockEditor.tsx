"use client";

import type { ServiceItem } from "@/types/block";
import { MAX_ITEMS, validateService } from "@/lib/blockUtils";
import { ArrowUpIcon, ArrowDownIcon, PlusIcon } from "@/components/icons";

interface ServicesBlockEditorProps {
  content: { items: ServiceItem[] };
  onChange: (content: { items: ServiceItem[] }) => void;
}

const inputClass =
  "h-10 w-full rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]";

export default function ServicesBlockEditor({
  content,
  onChange,
}: ServicesBlockEditorProps) {
  const items = Array.isArray(content?.items) ? content.items : [];
  const atLimit = items.length >= MAX_ITEMS;

  function update(index: number, patch: Partial<ServiceItem>) {
    onChange({
      items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange({ items: next });
  }

  function remove(index: number) {
    onChange({ items: items.filter((_, i) => i !== index) });
  }

  function add() {
    if (atLimit) return;
    onChange({
      items: [
        ...items,
        { id: crypto.randomUUID(), name: "", description: "" },
      ],
    });
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const errors = validateService(item);
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        return (
          <div
            key={item.id}
            className="space-y-2 rounded-card border border-gray-200 bg-gray-50 p-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={isFirst}
                  aria-label="Mover serviço para cima"
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={isLast}
                  aria-label="Mover serviço para baixo"
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  <ArrowDownIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={item.name}
                maxLength={100}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Nome do serviço"
                aria-label={`Nome do serviço ${index + 1}`}
                className={inputClass}
              />
              <input
                type="text"
                value={item.price ?? ""}
                onChange={(e) => update(index, { price: e.target.value })}
                placeholder="Preço (ex.: R$ 297)"
                aria-label={`Preço do serviço ${index + 1}`}
                className="h-10 w-32 shrink-0 rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remover serviço ${index + 1}`}
                className="h-10 w-10 shrink-0 rounded-card border border-gray-200 text-lg text-gray-500 transition-colors hover:border-red-300 hover:text-red-600"
              >
                −
              </button>
            </div>

            <textarea
              value={item.description}
              rows={2}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder="Descrição do serviço"
              aria-label={`Descrição do serviço ${index + 1}`}
              className="w-full rounded-card border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7C3AED]"
            />

            {Object.values(errors).map((message) => (
              <p key={message} className="text-xs text-red-600">
                {message}
              </p>
            ))}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        disabled={atLimit}
        className="flex h-10 items-center justify-center gap-1 rounded-card border border-dashed border-gray-300 px-4 text-sm font-medium text-gray-600 transition-colors hover:border-[#7C3AED] hover:text-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PlusIcon className="h-4 w-4" />
        Adicionar serviço
      </button>
      {atLimit && (
        <p className="text-xs text-gray-400">
          Limite de {MAX_ITEMS} itens por bloco.
        </p>
      )}
    </div>
  );
}