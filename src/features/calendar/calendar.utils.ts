import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Birthday, CalendarEvent } from "@/data/types";

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

/** Events eines bestimmten Tages, nach Startzeit sortiert. */
export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((e) => isSameDay(parseISO(e.start), day))
    .sort((a, b) => a.start.localeCompare(b.start));
}

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
