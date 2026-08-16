"use client";

import type { ReactNode } from "react";

interface ScheduleLayoutProps {
  children: ReactNode;
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

type Section = "config" | "google" | "rules" | "exceptions" | "requests";

const SECTION_LABELS: Record<Section, string> = {
  config: "Configuração",
  google: "Google Calendar",
  rules: "Regras de disponibilidade",
  exceptions: "Exceções",
  requests: "Solicitações",
};

export default function ScheduleLayout({ children, activeSection, onSectionChange }: ScheduleLayoutProps) {
  return (
    <div className="flex gap-6">
      {/* Coluna 1 - Menu Lateral */}
      <aside className="w-64 flex-shrink-0">
        <nav className="rounded-card bg-white p-4 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Menu
          </h2>
          <ul className="space-y-1">
            {(Object.keys(SECTION_LABELS) as Section[]).map((section) => (
              <li key={section}>
                <button
                  onClick={() => onSectionChange(section)}
                  className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                    activeSection === section
                      ? "bg-[#7C3AED] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {SECTION_LABELS[section]}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Coluna 2 - Conteúdo */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

export { type Section };
