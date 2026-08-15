import type { Block, ServiceItem } from "@/types/block";
import type { ProfileTheme } from "@/lib/profileTheme";
import { getBlockItems } from "@/lib/blockUtils";

interface ServicesBlockProps {
  block: Block;
  theme: ProfileTheme;
}

export default function ServicesBlock({ block, theme }: ServicesBlockProps) {
  const items = getBlockItems(block) as ServiceItem[];

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
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-card border border-gray-100 bg-white p-6 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.name}
                </h3>
                {item.price && (
                  <span className="shrink-0 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-accent)] px-3 py-1 text-sm font-semibold text-white">
                    {item.price}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-2 text-base text-gray-600">
                  {item.description}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}