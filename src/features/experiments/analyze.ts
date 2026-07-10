import { format, parseISO, subDays } from "date-fns";
import type { Experiment } from "@/data/types";
import { metricById } from "@/features/journal/checkin.metrics";
import { EXTRA_SIGNALS, type DayRow } from "@/features/journal/insights";
import { mean, welchT } from "@/features/journal/stats";

/*
  Auswertung eines Experiments: vergleicht die Kennzahlen WÄHREND des Zeitraums
  mit dem vergleichbar langen Zeitraum DAVOR (Baseline) – Vorher/Während-Analyse
  mit Welch-t-Test. So werden die Schlüsse belastbar, nicht nur Bauchgefühl.
*/

const CORE = ["mood", "energy", "focus", "productivity", "sleepQuality", "stress", "recovery"];

function higherIsBetter(id: string): boolean {
  const m = metricById(id);
  if (m) return m.higherIsBetter;
  const s = EXTRA_SIGNALS.find((e) => e.id === id);
  return s ? s.higherIsBetter : true;
}

export interface MetricEffect {
  id: string;
  baseMean: number;
  expMean: number;
  delta: number;
  p: number | null;
  nBase: number;
  nExp: number;
  improved: boolean;
  /** Statistisch belastbar (p < 0,1 und genug Daten)? */
  robust: boolean;
}

export interface ExperimentResult {
  effects: MetricEffect[];
  nBase: number;
  nExp: number;
}

export function analyzeExperiment(exp: Experiment, rows: DayRow[]): ExperimentResult {
  const baseWindow = Math.max(exp.durationDays, 7);
  const baseStart = format(subDays(parseISO(exp.startDate), baseWindow), "yyyy-MM-dd");
  const baseEnd = format(subDays(parseISO(exp.startDate), 1), "yyyy-MM-dd");
  const ids = [...new Set([...exp.watchMetrics, ...CORE])];

  const effects: MetricEffect[] = [];
  let nBaseTot = 0;
  let nExpTot = 0;

  for (const id of ids) {
    const baseVals: number[] = [];
    const expVals: number[] = [];
    for (const r of rows) {
      const v = r.values[id];
      if (v === undefined) continue;
      if (r.date >= baseStart && r.date <= baseEnd) baseVals.push(v);
      else if (r.date >= exp.startDate && r.date <= exp.endDate) expVals.push(v);
    }
    if (baseVals.length < 2 || expVals.length < 1) continue;
    const bm = mean(baseVals);
    const em = mean(expVals);
    const delta = em - bm;
    const t = welchT(expVals, baseVals);
    const p = t ? t.p : null;
    effects.push({
      id, baseMean: bm, expMean: em, delta, p,
      nBase: baseVals.length, nExp: expVals.length,
      improved: higherIsBetter(id) ? delta > 0 : delta < 0,
      robust: p != null && p < 0.1 && expVals.length >= 3 && baseVals.length >= 3,
    });
    nBaseTot = Math.max(nBaseTot, baseVals.length);
    nExpTot = Math.max(nExpTot, expVals.length);
  }

  effects.sort((a, b) => Number(b.robust) - Number(a.robust) || Math.abs(b.delta) - Math.abs(a.delta));
  return { effects, nBase: nBaseTot, nExp: nExpTot };
}
