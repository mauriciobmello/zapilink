"use client";

import { useEffect, useRef, useState } from "react";
import type { Block, BlockType } from "@/types/block";
import type { Profile } from "@/types/profile";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  BLOCK_TYPE_LABELS,
  MAX_BLOCKS,
  emptyContentFor,
} from "@/lib/blockUtils";
import BlockCard, { type BlockStatus } from "./BlockCard";

interface BlockListEditorProps {
  profileId: string;
  profile: Profile;
  initialBlocks: Block[];
  onBlocksChange?: (blocks: Block[]) => void;
  canEdit?: boolean;
}

export default function BlockListEditor({
  profileId,
  profile,
  initialBlocks,
  onBlocksChange,
  canEdit = true,
}: BlockListEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, BlockStatus>>({});
  const [errorMsgs, setErrorMsgs] = useState<Record<string, string>>({});

  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
    onBlocksChange?.(blocks);
  }, [blocks, onBlocksChange]);

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function setStatus(id: string, status: BlockStatus) {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }

  async function persistContent(id: string) {
    const block = blocksRef.current.find((b) => b.id === id);
    if (!block) return;

    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("blocks")
      .update({
        title: block.title,
        content: block.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setStatus(id, "error");
      setErrorMsgs((prev) => ({ ...prev, [id]: error.message }));
      return;
    }

    setStatus(id, "saved");
    setTimeout(() => setStatus(id, "idle"), 1500);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? ({ ...b, ...patch, updated_at: new Date().toISOString() } as Block)
          : b,
      ),
    );
    setStatus(id, "saving");
    if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
    timersRef.current[id] = setTimeout(() => {
      void persistContent(id);
    }, 1500);
  }

  function retrySave(id: string) {
    setStatus(id, "saving");
    void persistContent(id);
  }

  async function addBlock(type: BlockType) {
    if (!canEdit || blocks.length >= MAX_BLOCKS) return;
    const position =
      blocks.length > 0
        ? Math.max(...blocks.map((b) => b.position)) + 1
        : 0;

    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("blocks")
      .insert({
        profile_id: profileId,
        type,
        position,
        is_visible: true,
        title: null,
        content: emptyContentFor(type),
      })
      .select()
      .single();

    if (error) {
      setErrorMsgs((prev) => ({
        ...prev,
        add: `Não foi possível adicionar o bloco: ${error.message}`,
      }));
      return;
    }

    const created = data as Block;
    setBlocks((prev) => [...prev, created]);
    setExpandedId(created.id);
  }

  async function deleteBlock(id: string) {
    if (!canEdit) return;
    if (!window.confirm("Excluir este bloco?")) return;

    const supabase = createBrowserClient();
    const { error } = await supabase.from("blocks").delete().eq("id", id);

    if (error) {
      setErrorMsgs((prev) => ({ ...prev, [id]: error.message }));
      return;
    }

    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
    delete timersRef.current[id];
  }

  async function toggleVisibility(id: string) {
    if (!canEdit) return;
    const block = blocksRef.current.find((b) => b.id === id);
    if (!block) return;
    const nextVisible = !block.is_visible;

    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_visible: nextVisible } : b)),
    );

    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("blocks")
      .update({ is_visible: nextVisible })
      .eq("id", id);

    if (error) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_visible: block.is_visible } : b)),
      );
      setStatus(id, "error");
      setErrorMsgs((prev) => ({ ...prev, [id]: error.message }));
    }
  }

  async function moveBlock(id: string, dir: -1 | 1) {
    const current = blocksRef.current;
    const index = current.findIndex((b) => b.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= current.length) return;

    const reordered = [...current];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    const renumbered = reordered.map((b, i) => ({ ...b, position: i }));

    const oldPositions = new Map(current.map((b) => [b.id, b.position]));
    const changed = renumbered.filter(
      (b) => oldPositions.get(b.id) !== b.position,
    );

    setBlocks(renumbered);

    const supabase = createBrowserClient();
    for (const block of changed) {
      const { error } = await supabase
        .from("blocks")
        .update({ position: block.position })
        .eq("id", block.id);
      if (error) {
        setBlocks(current);
        setStatus(id, "error");
        setErrorMsgs((prev) => ({ ...prev, [id]: error.message }));
        return;
      }
    }
  }

  const atBlockLimit = blocks.length >= MAX_BLOCKS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Blocos</h2>
        <div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                void addBlock(e.target.value as BlockType);
              }
            }}
            disabled={atBlockLimit || !canEdit}
            aria-label="Adicionar bloco"
            className="h-11 rounded-card border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none focus:border-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              + Adicionar bloco
            </option>
            {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((type) => (
              <option key={type} value={type}>
                {BLOCK_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {atBlockLimit && (
            <p className="mt-1 text-xs text-gray-400">
              Limite de {MAX_BLOCKS} blocos por perfil.
            </p>
          )}
        </div>
      </div>

      {errorMsgs.add && (
        <p role="alert" className="text-sm text-red-600">
          {errorMsgs.add}
        </p>
      )}

      {blocks.length === 0 ? (
        <div className="rounded-card border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-600">Nenhum bloco ainda.</p>
          <p className="mt-1 text-sm text-gray-400">
            Adicione botões, serviços ou uma FAQ para montar sua página.
          </p>
        </div>
      ) : (
        blocks.map((block, index) => (
          <BlockCard
            key={block.id}
            block={block}
            status={statuses[block.id] ?? "idle"}
            errorMsg={errorMsgs[block.id]}
            isExpanded={expandedId === block.id}
            canMoveUp={index > 0}
            canMoveDown={index < blocks.length - 1}
            onToggleExpand={() =>
              setExpandedId((prev) => (prev === block.id ? null : block.id))
            }
            onMoveUp={() => void moveBlock(block.id, -1)}
            onMoveDown={() => void moveBlock(block.id, 1)}
            onToggleVisibility={() => void toggleVisibility(block.id)}
            onDelete={() => void deleteBlock(block.id)}
            onRetry={() => retrySave(block.id)}
            onChange={(patch) => updateBlock(block.id, patch)}
          />
        ))
      )}
    </div>
  );
}