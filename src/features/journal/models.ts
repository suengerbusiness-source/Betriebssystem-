import { parseISO } from "date-fns";
import { EXTRA_SIGNALS, OUTCOME_IDS, type DayRow } from "./insights";
import { activeMetrics, type MetricDescriptor } from "./checkin.metrics";
import { mean, pearson, ridgeRegression } from "./stats";

/*
  Höhere Modelle: statt nur paarweise zu korrelieren, modellieren wir mehrere
  Treiber GEMEINSAM (Ridge-Regression) – so trennt die App echte, unabhängige
  Treiber von Scheinzusammenhängen (Störgrößen). Dazu Wochentag-Muster.
*/

export interface DriverModel {
  outcome: string;
  drivers: { id: string; coef: number }[];
  r2: number;
  n: number;
  k: number;
}

/** Ergebnis-Kennzahl mit der besten Datenlage wählen. */
export function pickOutcome(rows: DayRow[]): string | null {
  let best: string | null = null;
  let bestN = 0;
  for (const id of OUTCOME_IDS) {
    const n = rows.filter((r) => r.values[id] !== undefined).length;
    if (n > bestN) { bestN = n; best = id; }
  }
  return bestN >= 10 ? best : null;
}

/**
 * Treiber-Modell für ein Ergebnis: wählt die aussichtsreichsten Kandidaten
 * (univariates Screening) und schätzt ihren UNABHÄNGIGEN Beitrag per Ridge-
 * Regression (um Störgrößen bereinigt). Liefert nach Wichtigkeit sortierte
 * Treiber + erklärte Varianz, oder null bei zu wenig Daten.
 */
export function driverModel(rows: DayRow[], outcome: string, metrics: MetricDescriptor[] = activeMetrics()): DriverModel | null {
  const candidates = [...metrics.map((m) => m.id), ...EXTRA_SIGNALS.map((s) => s.id)].filter((id) => id !== outcome);

  const scored = candidates
    .map((id) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of rows) {
        const a = r.values[id];
        const b = r.values[outcome];
        if (a === undefined || b === undefined) continue;
        xs.push(a); ys.push(b);
      }
      const rr = pearson(xs, ys);
      return { id, absr: rr == null ? 0 : Math.abs(rr), n: xs.length };
    })
    .filter((c) => c.n >= 8 && c.absr >= 0.15)
    .sort((a, b) => b.absr - a.absr);

  let picks = scored.slice(0, 6).map((c) => c.id);
  const buildCC = (ids: string[]) => {
    const X: number[][] = [];
    const y: number[] = [];
    for (const r of rows) {
      if (r.values[outcome] === undefined) continue;
      if (ids.some((id) => r.values[id] === undefined)) continue;
      X.push(ids.map((id) => r.values[id]));
      y.push(r.values[outcome]);
    }
    return { X, y };
  };

  while (picks.length >= 2) {
    const { X, y } = buildCC(picks);
    if (y.length >= picks.length + 4) {
      const res = ridgeRegression(X, y, 1);
      if (res) {
        const drivers = picks.map((id, i) => ({ id, coef: res.coefs[i] })).sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));
        return { outcome, drivers, r2: res.r2, n: res.n, k: picks.length };
      }
    }
    picks = picks.slice(0, -1); // schwächsten Kandidaten entfernen, erneut versuchen
  }
  return null;
}

export interface WeekdayEffect {
  outcome: string;
  best: { day: number; mean: number; n: number };
  worst: { day: number; mean: number; n: number };
  byDay: { day: number; mean: number; n: number }[];
}

export const WEEKDAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/** Wochentag-Muster eines Ergebnisses (deutlichster Unterschied). */
export function weekdayEffect(rows: DayRow[], outcome: string): WeekdayEffect | null {
  const byDay = new Map<number, number[]>();
  for (const r of rows) {
    const v = r.values[outcome];
    if (v === undefined) continue;
    const d = parseISO(`${r.date}T12:00:00`).getDay();
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(v);
  }
  const stats = [...byDay.entries()].filter(([, vs]) => vs.length >= 2).map(([day, vs]) => ({ day, mean: mean(vs), n: vs.length }));
  if (stats.length < 3) return null;
  const best = stats.reduce((a, b) => (b.mean > a.mean ? b : a));
  const worst = stats.reduce((a, b) => (b.mean < a.mean ? b : a));
  if (best.mean - worst.mean < 0.8) return null; // kein deutlicher Wochentag-Effekt
  return { outcome, best, worst, byDay: stats.sort((a, b) => a.day - b.day) };
}
