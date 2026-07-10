import type { CalendarEvent, Habit, HabitLog, Task } from "@/data/types";
import type { CoachTip } from "@/features/coach/coach";
import type { TrackerStreak } from "@/features/journal/checkin.utils";
import { occursOnDay } from "@/features/calendar/calendar.utils";

/*
  Focus-Engine: bündelt alles Handlungsrelevante zu EINER nach Dringlichkeit
  sortierten Liste – „Was ist JETZT dran?". Zeit-bewusst (morgens/tags/abends),
  damit oben immer der eine wichtigste nächste Schritt steht.
*/

export type FocusKind = "checkin" | "target" | "coach" | "task" | "event" | "habit";

export interface FocusItem {
  id: string;
  kind: FocusKind;
  title: string;
  reason?: string;
  action: string;
  to: string;
  /** 0–100, höher = jetzt dringender. */
  urgency: number;
  /** Bei Coach-Hinweisen: Schweregrad, für die Färbung. */
  severity?: CoachTip["severity"];
}

export interface FocusInput {
  now: Date;
  today: string;
  checkedInToday: boolean;
  streaks: TrackerStreak[];
  tasks: Task[];
  events: CalendarEvent[];
  habits: Habit[];
  habitLogs: HabitLog[];
  coachTips: CoachTip[];
}

const SEVERITY_URGENCY: Record<CoachTip["severity"], number> = { alert: 88, warn: 70, info: 42, good: 30 };

export function buildFocus(input: FocusInput): FocusItem[] {
  const { now, today, checkedInToday, streaks, tasks, events, habits, habitLogs, coachTips } = input;
  const hour = now.getHours();
  const evening = hour >= 18;
  const lateEvening = hour >= 21;
  const items: FocusItem[] = [];

  // Welche Themen deckt der Coach schon ab? -> Doppelungen vermeiden.
  const coachText = coachTips.map((t) => t.title.toLowerCase()).join(" | ");

  // 1) Abend-Check-in.
  if (!checkedInToday) {
    const urgency = lateEvening ? 97 : evening ? 90 : hour >= 12 ? 45 : 22;
    items.push({
      id: "focus-checkin",
      kind: "checkin",
      title: "Tages-Check-in machen",
      reason: evening ? "Dein Tag ist fast rum – halt ihn fest (Datenbasis, Prognose, Coach)." : "Über den Tag füllbar – abends die Bewertungen.",
      action: "Jetzt eintragen",
      to: "/tagebuch",
      urgency,
    });
  }

  // 2) Offene Tagesziele (Übungen) – Strähne schützen.
  for (const s of streaks) {
    if (s.reachedToday) continue;
    const remaining = Math.max(0, s.target - s.todayValue);
    const streakBoost = s.streak > 0 ? 24 + Math.min(s.streak, 20) : 0;
    const timeBoost = lateEvening ? 34 : evening ? 20 : hour >= 12 ? 8 : 0;
    // Nicht doppelt zeigen, wenn der Coach die Übung schon anmahnt.
    if (coachText.includes(s.label.toLowerCase())) continue;
    items.push({
      id: `focus-target-${s.id}`,
      kind: "target",
      title: s.streak > 0 ? `${s.label}: ${s.streak}-Tage-Strähne halten` : `${s.label} heute schaffen`,
      reason: s.streak > 0 ? `Noch ${remaining}${s.unit ? " " + s.unit : ""} bis zum Ziel – sonst reißt deine Strähne.` : `Noch ${remaining}${s.unit ? " " + s.unit : ""} bis zum Tagesziel ${s.target}.`,
      action: "Eintragen",
      to: "/tagebuch",
      urgency: 40 + streakBoost + timeBoost,
    });
  }

  // 3) Coach-Hinweise (bereits smart & begründet).
  for (const t of coachTips) {
    items.push({
      id: `focus-${t.id}`,
      kind: "coach",
      title: t.title,
      reason: t.message,
      action: t.action ?? "Ansehen",
      to: t.to ?? "/erkenntnisse",
      urgency: SEVERITY_URGENCY[t.severity] + Math.min(t.score / 100, 6),
      severity: t.severity,
    });
  }

  // 4) Termin steht gleich an (nächste 3 Std.).
  const soon = events
    .filter((e) => !e.cancelled && occursOnDay(e, now))
    .map((e) => ({ e, mins: minutesUntil(e.start, now) }))
    .filter((x) => x.mins >= -10 && x.mins <= 180)
    .sort((a, b) => a.mins - b.mins)[0];
  if (soon) {
    items.push({
      id: `focus-event-${soon.e.id}`,
      kind: "event",
      title: soon.mins <= 0 ? `Jetzt: ${soon.e.title}` : `In ${soon.mins} Min: ${soon.e.title}`,
      reason: soon.e.allDay ? "Heute" : `Beginn ${hhmm(soon.e.start)}`,
      action: "Zum Kalender",
      to: "/kalender",
      urgency: soon.mins <= 30 ? 90 : 74,
    });
  }

  // 5) Überfällige & heute fällige Aufgaben.
  const overdue = tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today);
  const dueToday = tasks.filter((t) => !t.done && (t.dueDate === today || t.scheduledFor === today));
  if (overdue.length > 0) {
    items.push({
      id: "focus-overdue",
      kind: "task",
      title: `${overdue.length} überfällige ${overdue.length === 1 ? "Aufgabe" : "Aufgaben"}`,
      reason: overdue.slice(0, 3).map((t) => t.title).join(", "),
      action: "Abarbeiten",
      to: "/heute",
      urgency: 82 + Math.min(overdue.length, 6),
    });
  } else if (dueToday.length > 0) {
    items.push({
      id: "focus-due",
      kind: "task",
      title: `${dueToday.length} ${dueToday.length === 1 ? "Aufgabe" : "Aufgaben"} heute fällig`,
      reason: dueToday.slice(0, 3).map((t) => t.title).join(", "),
      action: "Erledigen",
      to: "/heute",
      urgency: 54,
    });
  }

  // 6) Offene Gewohnheiten.
  const doneHabitIds = new Set(habitLogs.filter((l) => l.date === today).map((l) => l.habitId));
  const openHabits = habits.filter((h) => !doneHabitIds.has(h.id));
  if (openHabits.length > 0) {
    items.push({
      id: "focus-habits",
      kind: "habit",
      title: `${openHabits.length} ${openHabits.length === 1 ? "Gewohnheit" : "Gewohnheiten"} offen`,
      reason: openHabits.slice(0, 3).map((h) => h.title).join(", "),
      action: "Abhaken",
      to: "/heute",
      urgency: evening ? 50 : 36,
    });
  }

  return items.sort((a, b) => b.urgency - a.urgency);
}

function minutesUntil(iso: string, now: Date): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
}
function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
