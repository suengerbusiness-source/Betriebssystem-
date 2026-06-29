import type { CheckIn, HabitLog, Transaction } from "@/data/types";
import { CHECKIN_METRICS, metricById } from "./checkin.metrics";
import { pearson } from "./checkin.analysis";

/*
  „Muster & Erkenntnisse" – wertet die Tagebuch-Daten zusammen mit verlässlich
  datierten Alltags-/Geld-Signalen aus und erzeugt KLARTEXT-Aussagen:
  „Wenn X hoch war, war Y im Schnitt +Z."

  Reine, testbare Funktionen ohne Oberfläche. Externe Signale (Gewohnheiten,
  Ausgaben) docken über buildDataset an – die Produktivität selbst kommt aus dem
  täglich selbst bewerteten Check-in (zuverlässiger als geschätzte Aufgaben-Tage).
*/

export interface SignalDescriptor {
  id: string;
  label: string;
  higherIsBetter: boolean;
  /** Menschlich lesbarer Wert. */
  format: (v: number) => string;
}

/** Zusätzliche, sicher tagesdatierte Signale neben den Check-in-Metriken. */
export const EXTRA_SIGNALS: SignalDescriptor[] = [
  { id: "habitsDone", label: "Gewohnheiten erfüllt", higherIsBetter: true, format: (v) => `${Math.round(v)}` },
  { id: "spending", label: "Ausgaben", higherIsBetter: false, format: (v) => `${Math.round(v)} €` },
];

/** Die „Ergebnis"-Kennzahlen, die man verbessern möchte (alle 1–10-Skalen). */
const OUTCOME_IDS = ["mood", "energy", "productivity", "focus", "meaning", "recovery"];

export interface DayRow {
  date: string;
  values: Record<string, number>;
}

export function buildDataset(checkins: CheckIn[], habitLogs: HabitLog[], txs: Transaction[]): DayRow[] {
  const habitByDay = new Map<string, number>();
  for (const h of habitLogs) habitByDay.set(h.date, (habitByDay.get(h.date) ?? 0) + 1);

  const spendByDay = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || t.planned) continue;
    spendByDay.set(t.date, (spendByDay.get(t.date) ?? 0) + t.amount);
  }

  return checkins
    .map((c) => {
      const values: Record<string, number> = {};
      for (const m of CHECKIN_METRICS) {
        const v = c.metrics?.[m.id];
        if (v !== undefined && !Number.isNaN(v)) values[m.id] = v;
      }
      if (habitByDay.has(c.date)) values.habitsDone = habitByDay.get(c.date)!;
      if (spendByDay.has(c.date)) values.spending = spendByDay.get(c.date)!;
      return { date: c.date, values };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function labelOf(id: string): string {
  return metricById(id)?.label ?? EXTRA_SIGNALS.find((s) => s.id === id)?.label ?? id;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export interface Lever {
  outcome: string;
  driver: string;
  /** Differenz des Ergebnis-Mittelwerts (hohe vs. niedrige Driver-Tage). */
  delta: number;
  highMean: number;
  lowMean: number;
  n: number;
}

/**
 * „Hebel": Für jedes Ergebnis (Stimmung, Energie, …) werden die Tage am Median
 * jedes möglichen Einflussfaktors in „hoch/niedrig" geteilt und die Ergebnis-
 * Mittelwerte verglichen. Liefert nur deutliche, gut belegte Effekte.
 */
export function leverInsights(rows: DayRow[], opts: { minSamples?: number; minDelta?: number } = {}): Lever[] {
  const minSamples = opts.minSamples ?? 6;
  const minDelta = opts.minDelta ?? 0.7; // auf der 1–10-Skala spürbar
  const driverIds = [...CHECKIN_METRICS.map((m) => m.id), ...EXTRA_SIGNALS.map((s) => s.id)];
  const out: Lever[] = [];

  for (const outcome of OUTCOME_IDS) {
    for (const driver of driverIds) {
      if (driver === outcome) continue;
      const pairs = rows
        .filter((r) => r.values[outcome] !== undefined && r.values[driver] !== undefined)
        .map((r) => ({ o: r.values[outcome], d: r.values[driver] }));
      if (pairs.length < minSamples) continue;

      const med = median(pairs.map((p) => p.d));
      const high = pairs.filter((p) => p.d > med).map((p) => p.o);
      const low = pairs.filter((p) => p.d < med).map((p) => p.o);
      if (high.length < 3 || low.length < 3) continue;

      const highMean = mean(high);
      const lowMean = mean(low);
      const delta = highMean - lowMean;
      if (Math.abs(delta) < minDelta) continue;
      out.push({ outcome, driver, delta, highMean, lowMean, n: pairs.length });
    }
  }

  // Stärkste Effekte zuerst, je Ergebnis höchstens 2 (Vielfalt statt Wiederholung).
  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const perOutcome = new Map<string, number>();
  const result: Lever[] = [];
  for (const l of out) {
    const c = perOutcome.get(l.outcome) ?? 0;
    if (c >= 2) continue;
    perOutcome.set(l.outcome, c + 1);
    result.push(l);
  }
  return result;
}

export interface Pair {
  a: string;
  b: string;
  r: number;
  n: number;
}

/** Paarweise Korrelationen über den kombinierten Datensatz (inkl. Extra-Signale). */
export function correlations(rows: DayRow[], opts: { minSamples?: number; minAbsR?: number } = {}): Pair[] {
  const minSamples = opts.minSamples ?? 6;
  const minAbsR = opts.minAbsR ?? 0.35;
  const keys = [...CHECKIN_METRICS.map((m) => m.id), ...EXTRA_SIGNALS.map((s) => s.id)];
  const out: Pair[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of rows) {
        const va = r.values[keys[i]];
        const vb = r.values[keys[j]];
        if (va === undefined || vb === undefined) continue;
        xs.push(va);
        ys.push(vb);
      }
      if (xs.length < minSamples) continue;
      const r = pearson(xs, ys);
      if (r === null || Math.abs(r) < minAbsR) continue;
      out.push({ a: keys[i], b: keys[j], r, n: xs.length });
    }
  }
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

export interface DayScore {
  date: string;
  score: number;
}

/** Bestätigte Tage nach Wohlbefinden-Score (für „beste/schwächste Tage"). */
export function rankedDays(rows: DayRow[]): DayScore[] {
  const scaleMetrics = CHECKIN_METRICS.filter((m) => m.kind === "scale");
  const scored: DayScore[] = [];
  for (const r of rows) {
    let sum = 0;
    let n = 0;
    for (const m of scaleMetrics) {
      const v = r.values[m.id];
      if (v === undefined) continue;
      const norm = m.higherIsBetter ? (v - m.min) / (m.max - m.min) : 1 - (v - m.min) / (m.max - m.min);
      sum += norm;
      n += 1;
    }
    if (n > 0) scored.push({ date: r.date, score: Math.round((sum / n) * 100) });
  }
  return scored.sort((a, b) => b.score - a.score);
}
