import type { KeyResult } from "@/data/types";

/** Fortschritt eines Key Results in % (0–100), robust gegen Start=Ziel. */
export function krProgress(kr: KeyResult): number {
  const span = kr.targetValue - kr.startValue;
  if (span === 0) return kr.currentValue >= kr.targetValue ? 100 : 0;
  const p = ((kr.currentValue - kr.startValue) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}

/** Zielfortschritt = Durchschnitt der Key-Result-Fortschritte. */
export function goalProgress(krs: KeyResult[]): number {
  if (krs.length === 0) return 0;
  return Math.round(krs.reduce((s, k) => s + krProgress(k), 0) / krs.length);
}

export function currentYear(): string {
  return String(new Date().getFullYear());
}

export function currentQuarterPeriod(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

/** Die vier Quartals-Perioden eines Jahres. */
export function quartersOf(year: string): string[] {
  return [1, 2, 3, 4].map((q) => `${year}-Q${q}`);
}

/** "2026" -> "2026"; "2026-Q2" -> "Q2 2026". */
export function periodLabel(period: string): string {
  const m = period.match(/^(\d{4})-Q([1-4])$/);
  if (m) return `Q${m[2]} ${m[1]}`;
  return period;
}

export function yearOfPeriod(period: string): string {
  return period.slice(0, 4);
}
