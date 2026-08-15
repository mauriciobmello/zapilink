import type { Block, BlockType } from "@/types/block";
import {
  BLOCK_TYPE_LABELS,
  getBlockItems,
} from "@/lib/blockUtils";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
} from "@/components/icons";
import ButtonsBlockEditor from "./ButtonsBlockEditor";
import ServicesBlockEditor from "./ServicesBlockEditor";
import FAQBlockEditor from "./FAQBlockEditor";

export type BlockStatus = "idle" | "saving" | "saved" | "error";

interface BlockCardProps {
  block: Block;
  status: BlockStatus;
  errorMsg?: string;
  isExpanded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onChange: (patch: Partial<Block>) => void;
}

export default function BlockCard({
  block,
  status,
  errorMsg,
  isExpanded,
  canMoveUp,
  canMoveDown,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDelete,
  onRetry,
  onChange,
}: BlockCardProps) {
  const itemCount = getBlockItems(block).length;
  const typeLabel =
    BLOCK_TYPE_LABELS[block.type as BlockType] ?? "Desconhecido";

  return (
    <div
      className={`rounded-card border bg-white shadow-card transition-colors ${
        isExpanded ? "border-[#7C3AED]/40" : "border-gray-100"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <div className="flex">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Mover bloco para cima"
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Mover bloco para baixo"
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            <ArrowDownIcon className="h-4 w-4" />
          </button>
        </div>

        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
          {typeLabel}
        </span>
        <span className="text-xs text-gray-400">
          {itemCount} {itemCount === 1 ? "item" : "itens"}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {status === "saving" && (
            <span className="text-xs text-gray-400">Salvando…</span>
          )}
          {status === "saved" && (
            <span className="text-xs font-medium text-green-600">Salvo</span>
          )}
          {status === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-medium text-red-600 underline"
            >
              Tentar novamente
            </button>
          )}

          <button
            type="button"
            onClick={onToggleVisibility}
            aria-label={
              block.is_visible ? "Ocultar bloco" : "Mostrar bloco"
            }
            className={`p-1.5 ${
              block.is_visible
                ? "text-gray-500 hover:text-[#7C3AED]"
                : "text-gray-300 hover:text-gray-500"
            }`}
          >
            {block.is_visible ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeOffIcon className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? "Recolher bloco" : "Expandir bloco"}
            aria-expanded={isExpanded}
            className={`p-1.5 text-gray-500 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            aria-label="Excluir bloco"
            className="p-1.5 text-gray-400 transition-colors hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <p className="px-3 pb-2 text-xs text-red-600">{errorMsg}</p>
      )}

      {isExpanded && (
        <div className="space-y-4 border-t border-gray-100 p-4">
          <div>
            <label
              htmlFor={`block-title-${block.id}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Título do bloco
            </label>
            <input
              id={`block-title-${block.id}`}
              type="text"
              maxLength={255}
              value={block.title ?? ""}
              onChange={(e) =>
                onChange({ title: e.target.value === "" ? null : e.target.value })
              }
              placeholder="Título (opcional)"
              className="h-10 w-full rounded-card border border-gray-200 px-3 text-sm outline-none focus:border-[#7C3AED]"
            />
          </div>

          {block.type === "buttons" && (
            <ButtonsBlockEditor
              content={block.content}
              onChange={(content) => onChange({ content })}
            />
          )}
          {block.type === "services" && (
            <ServicesBlockEditor
              content={block.content}
              onChange={(content) => onChange({ content })}
            />
          )}
          {block.type === "faq" && (
            <FAQBlockEditor
              content={block.content}
              onChange={(content) => onChange({ content })}
            />
          )}
          {block.type !== "buttons" &&
            block.type !== "services" &&
            block.type !== "faq" && (
              <p className="text-sm text-gray-500">
                Tipo de bloco desconhecido ({(block as { type: string }).type})
                . Nenhum editor disponível.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
