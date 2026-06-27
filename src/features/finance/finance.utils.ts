import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { Transaction } from "@/data/types";

/** Vorschlags-Kategorien (frei erweiterbar durch eigene Eingabe). */
export const EXPENSE_CATEGORIES = [
  "Wohnen",
  "Lebensmittel",
  "Mobilität",
  "Freizeit",
  "Gesundheit",
  "Abos",
  "Business",
  "Sonstiges",
];

export const INCOME_CATEGORIES = [
  "Gehalt",
  "Business",
  "Investitionen",
  "Geschenk",
  "Sonstiges",
];

export const CHART_COLORS = [
  "#7c6cff",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#a855f7",
  "#64748b",
];

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
}

/** Summen für einen bestimmten Monat (yyyy-MM). */
export function summarizeMonth(txs: Transaction[], monthKey: string): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    if (!tx.date.startsWith(monthKey)) continue;
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  return { income, expense, balance: income - expense };
}

/** Monatlicher Einnahmen/Ausgaben-Verlauf für ein Diagramm (letzte n Monate). */
export function monthlySeries(txs: Transaction[], months = 6) {
  const now = new Date();
  const buckets: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = format(d, "yyyy-MM");
    buckets.push({ key, label: format(d, "MMM", { locale: de }), income: 0, expense: 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const tx of txs) {
    const key = tx.date.slice(0, 7);
    const bucket = index.get(key);
    if (!bucket) continue;
    if (tx.type === "income") bucket.income += tx.amount;
    else bucket.expense += tx.amount;
  }
  return buckets;
}

/** Ausgaben nach Kategorie für ein Donut-Diagramm (ein Monat). */
export function expensesByCategory(txs: Transaction[], monthKey: string) {
  const map = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "expense" || !tx.date.startsWith(monthKey)) continue;
    map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function monthLabel(monthKey: string): string {
  return format(parseISO(monthKey + "-01"), "MMMM yyyy", { locale: de });
}

export function currentMonthKey(): string {
  return format(new Date(), "yyyy-MM");
}
