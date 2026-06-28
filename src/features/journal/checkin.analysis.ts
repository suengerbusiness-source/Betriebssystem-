import type { CheckIn } from "@/data/types";
import { CHECKIN_METRICS, metricById } from "./checkin.metrics";

/*
  Analyse-Fundament des Tagebuchs.

  Diese Datei ist die „Andock-Stelle" für wissenschaftliche bzw. KI-gestützte
  Auswertungen. Sie kennt keine konkrete Oberfläche – sie liefert reine,
  testbare Funktionen über den Check-in-Daten:

    1. Externe Tages-Signale registrieren (Erweiterungs-Slot): Andere Module
       (Aufgaben, Finanzen, Zeiterfassung …) können pro Tag eigene Kennzahlen
       beisteuern, ohne dass die Analyse sie einzeln kennen muss.
    2. buildSeries(): baut die Tages-Matrix (pro Tag alle Kennzahlen).
    3. pearson() / topCorrelations(): erkennt Zusammenhänge (z. B. Sport →
       Produktivität, Stress → Stillstand).

  Eine spätere, vollständige Analyse-/KI-Schicht setzt nur hier an und muss die
  Datenhaltung nicht anfassen.
*/

/* ----------------------- Erweiterungs-Slot ----------------------- */

export interface DailySignalProvider {
  /** Stabiler Schlüssel der Kennzahl. */
  id: string;
  label: string;
  /** Höherer Wert = „besser"? (für spätere Darstellung). */
  higherIsBetter?: boolean;
  /** Liefert je Tag (yyyy-MM-dd) einen numerischen Wert. */
  values: (checkins: CheckIn[]) => Map<string, number>;
}

const providers: DailySignalProvider[] = [];

/** Externe Tages-Kennzahl andocken (z. B. „erledigte Aufgaben pro Tag"). */
export function registerSignalProvider(provider: DailySignalProvider): void {
  if (!providers.some((p) => p.id === provider.id)) providers.push(provider);
}

export function signalProviders(): DailySignalProvider[] {
  return providers.slice();
}

/** Anzeigename einer Kennzahl (Metrik oder externes Signal). */
export function labelFor(key: string): string {
  return (
    metricById(key)?.label ??
    providers.find((p) => p.id === key)?.label ??
    key
  );
}

/** Alle aktuell auswertbaren Kennzahl-Schlüssel (Metriken + externe Signale). */
export function analysisKeys(): string[] {
  return [...CHECKIN_METRICS.map((m) => m.id), ...providers.map((p) => p.id)];
}

/* ----------------------- Tages-Matrix ----------------------- */

export interface DataPoint {
  date: string;
  values: Record<string, number>;
}

/** Pro Tag alle Metrik- und Signalwerte – die Grundlage jeder Auswertung. */
export function buildSeries(checkins: CheckIn[]): DataPoint[] {
  const byDate = new Map<string, Record<string, number>>();
  for (const c of checkins) {
    const values: Record<string, number> = {};
    for (const m of CHECKIN_METRICS) {
      const v = c.metrics?.[m.id];
      if (v !== undefined && !Number.isNaN(v)) values[m.id] = v;
    }
    byDate.set(c.date, values);
  }
  // Externe Signale einmischen.
  for (const p of providers) {
    const map = p.values(checkins);
    for (const [date, v] of map) {
      if (Number.isNaN(v)) continue;
      const row = byDate.get(date) ?? {};
      row[p.id] = v;
      byDate.set(date, row);
    }
  }
  return [...byDate.entries()]
    .map(([date, values]) => ({ date, values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ----------------------- Korrelation ----------------------- */

/** Pearson-Korrelation zweier gleich langer Reihen; null bei zu wenig Varianz. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null; // konstante Reihe -> kein Zusammenhang messbar
  return sxy / Math.sqrt(sxx * syy);
}

export interface Correlation {
  a: string;
  b: string;
  /** Korrelationskoeffizient (-1 … 1). */
  r: number;
  /** Anzahl der gepaarten Tage, auf denen der Wert beruht. */
  n: number;
}

/**
 * Paarweise Korrelationen aller Kennzahlen, stärkste zuerst. Gewertet wird nur,
 * wo an genügend gemeinsamen Tagen beide Werte vorliegen.
 */
export function topCorrelations(
  checkins: CheckIn[],
  opts: { minSamples?: number; minAbsR?: number } = {},
): Correlation[] {
  const minSamples = opts.minSamples ?? 5;
  const minAbsR = opts.minAbsR ?? 0.3;
  const series = buildSeries(checkins);
  const keys = analysisKeys();
  const out: Correlation[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i];
      const b = keys[j];
      const xs: number[] = [];
      const ys: number[] = [];
      for (const point of series) {
        const va = point.values[a];
        const vb = point.values[b];
        if (va === undefined || vb === undefined) continue;
        xs.push(va);
        ys.push(vb);
      }
      if (xs.length < minSamples) continue;
      const r = pearson(xs, ys);
      if (r === null || Math.abs(r) < minAbsR) continue;
      out.push({ a, b, r, n: xs.length });
    }
  }
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

/** Stärke-Wort zu einem Korrelationswert (für die Anzeige). */
export function correlationStrength(r: number): string {
  const a = Math.abs(r);
  if (a >= 0.6) return "starker";
  if (a >= 0.4) return "deutlicher";
  return "leichter";
}
