import Link from "next/link";
import StarProgress from "./StarProgress";
import type { LoyaltyProgram } from "@/types/loyalty";

interface LoyaltyProgramCardProps {
  username: string;
  program: LoyaltyProgram;
  primaryColor?: string;
  accentColor?: string;
}

export default function LoyaltyProgramCard({
  username,
  program,
  primaryColor = "#7C3AED",
  accentColor = "#F97316",
}: LoyaltyProgramCardProps) {
  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <h2 className="text-xl font-bold text-gray-900">{program.name}</h2>
      {program.description && (
        <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
          {program.description}
        </p>
      )}

      <div className="mt-5">
        <p className="text-sm font-medium text-gray-700">
          Junte {program.stars_required}{" "}
          {program.stars_required === 1 ? "estrela" : "estrelas"} e ganhe:
        </p>
        <p className="mt-1 text-base font-semibold" style={{ color: primaryColor }}>
          {program.benefit_description ?? "Benefício exclusivo"}
        </p>
        <div className="mt-3">
          <StarProgress
            current={0}
            required={program.stars_required}
            accentColor={accentColor}
            size={24}
          />
        </div>
      </div>

      {program.rules && (
        <div className="mt-5 rounded-card bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Regras
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
            {program.rules}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/${username}/loyalty/register`}
          className="flex h-12 flex-1 items-center justify-center rounded-card px-4 font-medium text-white shadow-card transition-colors hover:brightness-110"
          style={{ backgroundColor: primaryColor }}
        >
          Quero participar
        </Link>
        <Link
          href={`/${username}/loyalty/progress`}
          className="flex h-12 flex-1 items-center justify-center rounded-card border border-gray-200 px-4 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Consultar minhas estrelas
        </Link>
      </div>
    </div>
  );
}
