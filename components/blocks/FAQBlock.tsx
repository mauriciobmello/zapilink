"use client";

import { useState } from "react";
import type { Block, FAQItem } from "@/types/block";
import type { ProfileTheme } from "@/lib/profileTheme";
import { getBlockItems } from "@/lib/blockUtils";
import { ChevronDownIcon } from "@/components/icons";

interface FAQBlockProps {
  block: Block;
  theme: ProfileTheme;
}

export default function FAQBlock({ block, theme }: FAQBlockProps) {
  const items = getBlockItems(block) as FAQItem[];
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={`${block.id}-title`} className="px-4 py-4">
      <div className="mx-auto max-w-5xl">
        {block.title && (
          <h2
            id={`${block.id}-title`}
            className="mb-4 text-2xl font-bold text-gray-900"
          >
            {block.title}
          </h2>
        )}
        <div className="space-y-3">
          {items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-gray-900">
                    {item.question}
                  </span>
                  <span
                    className={`shrink-0 text-[var(--theme-primary)] transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </span>
                </button>
                <div
                  id={`faq-panel-${item.id}`}
                  role="region"
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-base text-gray-600">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}