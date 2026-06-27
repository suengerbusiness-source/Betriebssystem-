import { format } from "date-fns";
import type { Transaction } from "@/data/types";
import { summarizeMonth } from "@/features/finance/finance.utils";

/** Die n Monatsschlüssel (yyyy-MM) VOR dem angegebenen Monat, alt → neu. */
export function monthsBefore(month: string, n: number): string[] {
  const keys: string[] = [];
  const base = new Date(month + "-01");
  for (let i = n; i >= 1; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    keys.push(format(d, "yyyy-MM"));
  }
  return keys;
}

export interface Averages {
  income: number;
  expense: number;
  saldo: number;
  /** Anzahl der Monate mit Aktivität, über die gemittelt wurde. */
  activeMonths: number;
}

/**
 * Durchschnittliche Einnahmen/Ausgaben/Saldo über die gegebenen Monate.
 * Gemittelt wird nur über Monate mit Aktivität, damit leere Anfangsmonate
 * den Schnitt nicht verfälschen.
 */
export function averagesOver(txs: Transaction[], monthKeys: string[]): Averages {
  let income = 0;
  let expense = 0;
  let active = 0;
  for (const key of monthKeys) {
    const s = summarizeMonth(txs, key);
    if (s.income === 0 && s.expense === 0) continue;
    income += s.income;
    expense += s.expense;
    active += 1;
  }
  if (active === 0) return { income: 0, expense: 0, saldo: 0, activeMonths: 0 };
  return {
    income: income / active,
    expense: expense / active,
    saldo: (income - expense) / active,
    activeMonths: active,
  };
}

/** Prozentuale Abweichung von `value` gegenüber `base` (oder null). */
export function deltaPercent(value: number, base: number): number | null {
  if (!base) return null;
  return Math.round(((value - base) / Math.abs(base)) * 100);
}

/** Durchschnittliche Ausgaben je Kategorie über die gegebenen Monate. */
export function categoryAverages(
  txs: Transaction[],
  monthKeys: string[],
): { category: string; avg: number }[] {
  const active = new Set<string>();
  const totals = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const key = tx.date.slice(0, 7);
    if (!monthKeys.includes(key)) continue;
    active.add(key);
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }
  const months = Math.max(active.size, 1);
  return [...totals.entries()]
    .map(([category, sum]) => ({ category, avg: sum / months }))
    .sort((a, b) => b.avg - a.avg);
}
