import { differenceInCalendarDays } from "date-fns";
import { customMetrics as customMetricsRepo } from "@/data/repo";
import type { CheckIn, CustomMetric } from "@/data/types";
import { journalToday, targetStreak } from "@/features/journal/checkin.utils";

/*
  Level-System / Auto-Progression: Hältst du ein Tagesziel eine ganze Woche
  (7 Tage in Folge), steigt das Ziel automatisch um eine Schrittweite und das
  Level um 1 – „100 Liegestütze eine Woche durchziehen → Ziel steigt".
*/

const LEVEL_DAYS = 7; // eine Woche konstant
const DEFAULT_STEP_RATIO = 0.1; // +10 % vom Ziel, wenn keine Schrittweite gesetzt

/** Schrittweite eines Ziel-Trackers (explizit oder 10 % vom Ziel, min. 1). */
export function stepFor(m: CustomMetric): number {
  if (m.targetStep && m.targetStep > 0) return Math.round(m.targetStep);
  return Math.max(1, Math.round((m.target ?? 0) * DEFAULT_STEP_RATIO));
}

export interface LevelUp {
  id: string;
  label: string;
  fromTarget: number;
  toTarget: number;
  level: number;
}

/**
 * Prüft alle Ziel-Tracker und erhöht fällige Ziele (Level-up). Gibt die
 * durchgeführten Level-ups zurück und persistiert sie. Idempotent über
 * `levelUpAt` (höchstens ein Level-up je Tracker pro Woche).
 */
export async function applyLevelUps(checkins: CheckIn[], metrics: CustomMetric[]): Promise<LevelUp[]> {
  const today = journalToday();
  const ups: LevelUp[] = [];

  for (const m of metrics) {
    if (m.kind !== "count" || m.target == null || m.target <= 0 || m.archived) continue;
    // Erst wieder nach einer Woche seit dem letzten Level-up erhöhen.
    if (m.levelUpAt && differenceInCalendarDays(new Date(`${today}T12:00:00`), new Date(`${m.levelUpAt}T12:00:00`)) < LEVEL_DAYS) continue;

    const streak = targetStreak(checkins, m.id, m.target);
    if (streak < LEVEL_DAYS) continue;

    const fromTarget = m.target;
    const toTarget = fromTarget + stepFor(m);
    const level = (m.level ?? 1) + 1;
    await customMetricsRepo.update(m.id, { target: toTarget, level, levelUpAt: today });
    ups.push({ id: m.id, label: m.label, fromTarget, toTarget, level });
  }
  return ups;
}
