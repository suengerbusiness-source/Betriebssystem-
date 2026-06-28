import { addDays, format } from "date-fns";
import type { CheckIn } from "@/data/types";
import { CHECKIN_METRICS, normalizeMetric } from "./checkin.metrics";

/** Heutiges Datum als yyyy-MM-dd (lokal). */
export function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Tages-Score 0–100: Mittel der normalisierten, gut-orientierten Metriken.
 * Bewusst eine grobe, motivierende Kennzahl – die eigentliche Aussagekraft
 * liefert später die Korrelations-Analyse, nicht dieser Mittelwert.
 */
export function wellbeingScore(metrics: Record<string, number>): number | null {
  let sum = 0;
  let n = 0;
  for (const d of CHECKIN_METRICS) {
    const v = metrics[d.id];
    if (v === undefined || Number.isNaN(v)) continue;
    sum += normalizeMetric(d, v);
    n += 1;
  }
  if (n === 0) return null;
  return Math.round((sum / n) * 100);
}

/**
 * Strähne aufeinanderfolgender Check-in-Tage bis heute. Ist heute noch offen,
 * läuft die Strähne bis gestern weiter (verloren erst nach einem ganzen
 * verpassten Tag) – analog zu den Gewohnheiten.
 */
export function checkinStreak(dates: Set<string>, today = new Date()): number {
  let streak = 0;
  let cursor = today;
  if (!dates.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!dates.has(dateKey(cursor))) return 0;
  }
  while (dates.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Durchschnitt je Metrik über die gegebenen Check-ins (für Ø-Hinweise/Prefill). */
export function metricAverages(checkins: CheckIn[]): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const c of checkins) {
    for (const d of CHECKIN_METRICS) {
      const v = c.metrics?.[d.id];
      if (v === undefined || Number.isNaN(v)) continue;
      sums[d.id] = (sums[d.id] ?? 0) + v;
      counts[d.id] = (counts[d.id] ?? 0) + 1;
    }
  }
  const avg: Record<string, number> = {};
  for (const id of Object.keys(sums)) avg[id] = sums[id] / counts[id];
  return avg;
}
