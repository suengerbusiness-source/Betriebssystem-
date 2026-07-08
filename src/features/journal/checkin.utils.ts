import { addDays, format, subHours } from "date-fns";
import type { CheckIn } from "@/data/types";
import { activeMetrics, CHECKIN_METRICS, normalizeMetric, type MetricDescriptor } from "./checkin.metrics";

/**
 * Der „Tag" des Tagebuchs endet nicht um Mitternacht, sondern erst um 2 Uhr
 * nachts. Wer um 1 Uhr noch wach ist und eincheckt, bucht den Eintrag also
 * noch auf den gestrigen Kalendertag. Technisch: wir rechnen die Uhrzeit einfach
 * um 2 Stunden zurück und nehmen davon das Kalenderdatum.
 */
export const DAY_CUTOFF_HOURS = 2;

/** Aktueller Zeitpunkt im Tagebuch-Bezug (2 Stunden zurückversetzt). */
export function journalNow(now: Date = new Date()): Date {
  return subHours(now, DAY_CUTOFF_HOURS);
}

/** Heutiger Tagebuch-Tag als yyyy-MM-dd – läuft bis 2 Uhr nachts weiter. */
export function journalToday(now: Date = new Date()): string {
  return format(journalNow(now), "yyyy-MM-dd");
}

/** Heutiges Kalenderdatum als yyyy-MM-dd (lokal, ohne Tagebuch-Versatz). */
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
    // Nur die subjektiven 1–10-Skalen fließen in den Score (Schlafdauer/Sport
    // sind faktische Mengen und würden den Mittelwert verzerren).
    if (d.kind !== "scale") continue;
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
export function checkinStreak(dates: Set<string>, today = journalNow()): number {
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
export function metricAverages(
  checkins: CheckIn[],
  metrics: MetricDescriptor[] = activeMetrics(),
): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const c of checkins) {
    for (const d of metrics) {
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
