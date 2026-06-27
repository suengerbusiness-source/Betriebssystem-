import { addDays, format } from "date-fns";

/** Heutiges Datum als yyyy-MM-dd (lokal). */
export function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Aktuelle Streak einer Gewohnheit: aufeinanderfolgende erledigte Tage bis
 * heute. Ist heute noch offen, zählt die Strähne bis gestern weiter (man
 * „verliert" sie erst nach einem komplett verpassten Tag).
 */
export function computeStreak(doneDates: Set<string>, today = new Date()): number {
  let streak = 0;
  let cursor = today;
  // Startpunkt: heute, falls erledigt – sonst gestern.
  if (!doneDates.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!doneDates.has(dateKey(cursor))) return 0;
  }
  while (doneDates.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
