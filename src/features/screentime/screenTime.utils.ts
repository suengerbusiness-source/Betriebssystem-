import type { ScreenTimeLog } from "@/data/types";

/*
  Hilfsfunktionen für die Bildschirmzeit. Das Tageslimit (Social-Minuten) liegt
  lokal in localStorage – es ist eine persönliche Zielvorgabe, kein Datensatz.
*/
const LIMIT_KEY = "lifeos.socialLimit";
const DEFAULT_LIMIT = 60;

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getSocialLimit(): number {
  try {
    const v = Number(localStorage.getItem(LIMIT_KEY));
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_LIMIT;
  } catch {
    return DEFAULT_LIMIT;
  }
}

export function setSocialLimit(min: number): void {
  try { localStorage.setItem(LIMIT_KEY, String(Math.max(1, Math.round(min)))); } catch { /* egal */ }
}

/** Minuten menschlich: 90 -> „1 h 30 min". */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h} h`;
  return `${h} h ${r} min`;
}

/** Gesamt-Bildschirmzeit eines Tages (iPhone + iPad). */
export function totalScreen(log?: ScreenTimeLog): number {
  if (!log) return 0;
  return (log.iphoneMin ?? 0) + (log.ipadMin ?? 0);
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Strähne aufeinanderfolgender Tage (bis heute/gestern), an denen die Social-Zeit
 * erfasst wurde UND ≤ Limit lag. Bricht beim ersten Tag über Limit oder ohne
 * Eintrag ab (gestern zählt noch, wenn heute offen ist).
 */
export function underLimitStreak(logs: ScreenTimeLog[], limit: number, today = todayKey()): number {
  const byDate = new Map(logs.filter((l) => l.socialMin != null).map((l) => [l.date, l.socialMin as number]));
  let cursor = today;
  if (!byDate.has(cursor)) cursor = shift(cursor, -1); // heute noch offen -> ab gestern
  let streak = 0;
  while (byDate.has(cursor) && (byDate.get(cursor) as number) <= limit) {
    streak += 1;
    cursor = shift(cursor, -1);
  }
  return streak;
}
