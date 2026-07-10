import { differenceInCalendarDays, format } from "date-fns";
import type { ActivityLog, CheckIn } from "@/data/types";
import { CHECKIN_METRICS } from "./checkin.metrics";

/*
  Nutzungs-Zusammenfassung: verdichtet die gesammelten Verhaltens-Daten
  (Uhrzeiten, Häufigkeit, Gründlichkeit, Engagement) zu ein paar Kennzahlen.
*/

export interface UsageSummary {
  /** Typische Check-in-Uhrzeit (Stunde) oder null. */
  avgHour: number | null;
  /** Ø Gründlichkeit (Anteil beantworteter Skalen, %). */
  thoroughness: number | null;
  /** Ø Speicherungen je aktivem Tag (Wiederholungen). */
  editsPerActiveDay: number | null;
  /** App-Öffnungen in den letzten 7 Tagen. */
  opens7: number;
  /** Tage mit Check-in in den letzten 30 Tagen. */
  activeDays30: number;
  /** Anzahl erfasster Check-ins gesamt. */
  total: number;
}

const SCALE_IDS = CHECKIN_METRICS.filter((m) => m.kind === "scale").map((m) => m.id);

export function usageSummary(checkins: CheckIn[], activity: ActivityLog[], now = new Date()): UsageSummary {
  const total = checkins.length;

  const hours = checkins.map((c) => new Date(c.createdAt).getHours());
  const avgHour = hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null;

  const completes = checkins.map((c) => {
    const answered = SCALE_IDS.filter((id) => c.metrics?.[id] !== undefined).length;
    return SCALE_IDS.length ? (answered / SCALE_IDS.length) * 100 : 0;
  });
  const thoroughness = completes.length ? Math.round(completes.reduce((a, b) => a + b, 0) / completes.length) : null;

  const saves = activity.filter((a) => a.type === "checkin_save");
  const saveDays = new Set(saves.map((a) => (typeof a.meta?.date === "string" ? a.meta.date : format(new Date(a.at), "yyyy-MM-dd"))));
  const editsPerActiveDay = saveDays.size ? Math.round((saves.length / saveDays.size) * 10) / 10 : null;

  const opens7 = activity.filter((a) => a.type === "app_open" && differenceInCalendarDays(now, new Date(a.at)) < 7).length;

  const activeDays30 = new Set(
    checkins.filter((c) => differenceInCalendarDays(now, new Date(`${c.date}T12:00:00`)) < 30).map((c) => c.date),
  ).size;

  return { avgHour, thoroughness, editsPerActiveDay, opens7, activeDays30, total };
}
