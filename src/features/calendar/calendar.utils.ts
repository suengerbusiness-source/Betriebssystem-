import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarEvent, RecurrenceRule } from "@/data/types";
import type { Birthday } from "@/data/types";

export type CalendarView = "month" | "week" | "day";

const WEEK_OPTS = { weekStartsOn: 1 as const }; // Montag

/** Alle sichtbaren Tage einer Monatsansicht (inkl. Rand-Tage). */
export function monthGridDays(cursor: Date): Date[] {
  const start = startOfWeek(startOfMonth(cursor), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(cursor), WEEK_OPTS);
  return eachDayOfInterval({ start, end });
}

/** Die sieben Tage der Woche um `cursor`. */
export function weekDays(cursor: Date): Date[] {
  const start = startOfWeek(cursor, WEEK_OPTS);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Fällt ein Termin auf einen bestimmten Tag? Deckt einmalige (auch mehrtägige)
 * Termine sowie Wiederholungen (täglich/wöchentlich, inkl. „alle 2 Wochen im
 * Wechsel") ab. Wird beim Rendern je Tag ausgewertet – nichts wird materialisiert.
 */
export function occursOnDay(e: CalendarEvent, day: Date): boolean {
  const d = startOfDay(day);
  const startDay = startOfDay(parseISO(e.start));
  if (d < startDay) return false; // vor dem ersten Termin

  if (!e.recurrence) {
    // Einmalig – aber evtl. mehrtägig (z. B. Urlaub von … bis …).
    const endDay = startOfDay(parseISO(e.end));
    return d >= startDay && d <= endDay;
  }

  const rec = e.recurrence;
  if (rec.until && d > startOfDay(parseISO(`${rec.until}T23:59:59`))) return false;
  const interval = rec.interval > 0 ? rec.interval : 1;

  if (rec.freq === "daily") {
    return differenceInCalendarDays(d, startDay) % interval === 0;
  }
  // weekly
  const weekdays = rec.weekdays?.length ? rec.weekdays : [startDay.getDay()];
  if (!weekdays.includes(d.getDay())) return false;
  const weeks = differenceInCalendarWeeks(d, startDay, { weekStartsOn: 1 });
  return weeks % interval === 0;
}

/** Events eines bestimmten Tages (inkl. Wiederholungen), nach Startzeit sortiert. */
export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((e) => occursOnDay(e, day))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Kurzbeschreibung einer Wiederholung (für Chips/Anzeige). */
export function recurrenceLabel(rec?: RecurrenceRule): string | null {
  if (!rec) return null;
  if (rec.freq === "daily") return rec.interval > 1 ? `alle ${rec.interval} Tage` : "täglich";
  const days = (rec.weekdays ?? []).slice().sort().map((w) => WEEKDAY_SHORT[w]).join(", ");
  const base = rec.interval > 1 ? "alle 2 Wochen" : "wöchentlich";
  return days ? `${base} (${days})` : base;
}

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Geburtstage, die auf einen Tag fallen (jährlich wiederkehrend). */
export function birthdaysOnDay(list: Birthday[], day: Date): Birthday[] {
  const m = day.getMonth() + 1;
  const d = day.getDate();
  return list.filter((b) => b.month === m && b.day === d);
}

/** Alter, das an diesem Tag erreicht wird (oder null ohne Geburtsjahr). */
export function ageOn(b: Birthday, day: Date): number | null {
  return b.year ? day.getFullYear() - b.year : null;
}

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Kombiniert ein Datum (yyyy-MM-dd) und eine Zeit (HH:mm) zu ISO. */
export function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time || "00:00"}`).toISOString();
}
