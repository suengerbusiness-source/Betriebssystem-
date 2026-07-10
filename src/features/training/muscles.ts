import { startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import type { CheckIn, CustomMetric } from "@/data/types";

/*
  Muskel-Auslastung: bildet Übungen (count-Tracker mit Muskelgruppen) auf
  Muskelgruppen ab und summiert die Wiederholungen je Muskel über eine Woche.
  So entsteht der Graph „so sehr wurde dieser Muskel beansprucht".
*/

/** Auswählbare Muskelgruppen (feste, kuratierte Liste). */
export const MUSCLE_GROUPS = [
  "Brust",
  "Rücken",
  "Schultern",
  "Bizeps",
  "Trizeps",
  "Bauch",
  "Beine",
  "Po",
  "Ganzkörper",
  "Cardio",
] as const;

const WEEK_OPTS = { weekStartsOn: 1 as const };

export interface MuscleLoad {
  muscle: string;
  reps: number;
  /** Anteil am stärksten belasteten Muskel (0–1) für die Balkenlänge. */
  share: number;
}

/**
 * Wiederholungen je Muskelgruppe innerhalb der Woche um `ref`. Jede Übung
 * zählt ihre Wiederholungen auf jede ihrer Muskelgruppen.
 */
export function weeklyMuscleLoad(checkins: CheckIn[], metrics: CustomMetric[], ref = new Date()): MuscleLoad[] {
  const start = startOfWeek(ref, WEEK_OPTS);
  const end = endOfWeek(ref, WEEK_OPTS);
  const exercises = metrics.filter((m) => m.kind === "count" && (m.muscles?.length ?? 0) > 0);

  const totals = new Map<string, number>();
  for (const c of checkins) {
    const d = parseISO(`${c.date}T12:00:00`);
    if (!isWithinInterval(d, { start, end })) continue;
    for (const ex of exercises) {
      const reps = c.metrics?.[ex.id] ?? 0;
      if (reps <= 0) continue;
      for (const muscle of ex.muscles!) {
        totals.set(muscle, (totals.get(muscle) ?? 0) + reps);
      }
    }
  }

  const max = Math.max(1, ...totals.values());
  return [...totals.entries()]
    .map(([muscle, reps]) => ({ muscle, reps, share: reps / max }))
    .sort((a, b) => b.reps - a.reps);
}

/** Gesamt-Wiederholungen aller Übungen in der Woche um `ref`. */
export function weeklyTrainingVolume(checkins: CheckIn[], metrics: CustomMetric[], ref = new Date()): number {
  const start = startOfWeek(ref, WEEK_OPTS);
  const end = endOfWeek(ref, WEEK_OPTS);
  const exercises = metrics.filter((m) => m.kind === "count" && ((m.muscles?.length ?? 0) > 0 || m.target != null));
  let sum = 0;
  for (const c of checkins) {
    const d = parseISO(`${c.date}T12:00:00`);
    if (!isWithinInterval(d, { start, end })) continue;
    for (const ex of exercises) sum += c.metrics?.[ex.id] ?? 0;
  }
  return sum;
}
