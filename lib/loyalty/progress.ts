import type { BenefitState, LoyaltyStarTransaction } from "@/types/loyalty";

/** Saldo do ciclo atual, sempre derivado das transações. */
export function balanceForCycle(
  transactions: Pick<LoyaltyStarTransaction, "cycle" | "stars">[],
  cycle: number,
): number {
  return transactions
    .filter((tx) => tx.cycle === cycle)
    .reduce((total, tx) => total + tx.stars, 0);
}

export function benefitState(
  starsCurrent: number,
  starsRequired: number,
): BenefitState {
  return starsCurrent >= starsRequired ? "completed" : "progress";
}

export function progressPercent(
  starsCurrent: number,
  starsRequired: number,
): number {
  if (starsRequired <= 0) return 0;
  return Math.min(100, Math.round((starsCurrent / starsRequired) * 100));
}
