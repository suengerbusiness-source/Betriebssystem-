import type { CalendarEvent, CheckIn, Habit, HabitLog, Task, Transaction } from "@/data/types";

/*
  Nudge-Engine: leitet aus den vorhandenen Daten konkrete, anklickbare
  Erinnerungen ab („was ist heute dran?"). Reine, testbare Funktion – ohne
  Oberfläche, ohne Speicherzugriff.
*/

export type NudgeKind = "checkin" | "habits" | "tasks" | "payment" | "events" | "backup" | "screentime" | "coach";
export type NudgeSeverity = "info" | "due" | "high";

export interface Nudge {
  id: string;
  kind: NudgeKind;
  severity: NudgeSeverity;
  title: string;
  detail?: string;
  /** Zielroute beim Antippen. */
  to: string;
}

export interface NudgeInput {
  today: string; // yyyy-MM-dd (lokal)
  now: Date;
  checkins: CheckIn[];
  habits: Habit[];
  habitLogs: HabitLog[];
  tasks: Task[];
  transactions: Transaction[];
  events: CalendarEvent[];
  /** Zeitpunkt der letzten Datei-Sicherung (ISO) oder null. */
  lastBackup?: string | null;
  /** Bildschirmzeit heute erfasst? undefined = nutzt das Modul (noch) nicht. */
  screenLoggedToday?: boolean;
}

const SEVERITY_ORDER: Record<NudgeSeverity, number> = { high: 0, due: 1, info: 2 };

/** Coach-Sprüche für den Check-in – täglich wechselnd, aber stabil pro Tag. */
const COACH_CHECKIN = [
  "Zeig mir deinen Tag – 60 Sekunden, keine Ausreden.",
  "Kein Check-in, kein Fortschritt. Los.",
  "Schwacher Tag oder starker Tag? Beweis es.",
  "Disziplin schlägt Motivation. Trag es ein.",
  "Ich warte. Lass mich nicht warten.",
  "Andere reden, du lieferst. Check-in jetzt.",
];

/** Stabiler Tages-Index aus dem Datum (gleiche Auswahl den ganzen Tag). */
function daySeed(day: string): number {
  let s = 0;
  for (let i = 0; i < day.length; i++) s = (s + day.charCodeAt(i)) % 100000;
  return s;
}

function addDaysStr(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const eur = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function computeNudges(input: NudgeInput): Nudge[] {
  const { today, now, checkins, habits, habitLogs, tasks, transactions, events, lastBackup, screenLoggedToday } = input;
  const out: Nudge[] = [];
  const hour = now.getHours();

  // 1) Tagebuch-Check-in heute noch offen (abends dringlicher).
  if (!checkins.some((c) => c.date === today)) {
    out.push({
      id: "checkin",
      kind: "checkin",
      severity: hour >= 18 ? "high" : "info",
      title: "Check-in fällig – Coach wartet",
      detail: COACH_CHECKIN[daySeed(today) % COACH_CHECKIN.length],
      to: "/tagebuch",
    });
  }

  // 2) Offene Gewohnheiten heute.
  const doneHabitIds = new Set(habitLogs.filter((l) => l.date === today).map((l) => l.habitId));
  const openHabits = habits.filter((h) => !doneHabitIds.has(h.id));
  if (habits.length > 0 && openHabits.length > 0) {
    out.push({
      id: "habits",
      kind: "habits",
      severity: hour >= 20 ? "due" : "info",
      title: `${openHabits.length} ${openHabits.length === 1 ? "Gewohnheit" : "Gewohnheiten"} offen`,
      detail: openHabits.slice(0, 3).map((h) => h.title).join(", "),
      to: "/heute",
    });
  }

  // 3) Fällige / überfällige Aufgaben.
  const due = tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= today);
  if (due.length > 0) {
    const overdue = due.filter((t) => (t.dueDate ?? "") < today).length;
    out.push({
      id: "tasks",
      kind: "tasks",
      severity: overdue > 0 ? "high" : "due",
      title: `${due.length} ${due.length === 1 ? "Aufgabe" : "Aufgaben"} fällig`,
      detail: overdue > 0 ? `${overdue} davon überfällig` : "heute fällig",
      to: "/heute",
    });
  }

  // 4) Geplante Zahlungen in den nächsten 2 Tagen.
  const horizon = addDaysStr(today, 2);
  const upcoming = transactions
    .filter((t) => t.planned && t.date >= today && t.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const when = next.date === today ? "heute" : next.date === addDaysStr(today, 1) ? "morgen" : "übermorgen";
    out.push({
      id: "payment",
      kind: "payment",
      severity: next.date === today ? "high" : "due",
      title: upcoming.length === 1 ? "Geplante Zahlung fällig" : `${upcoming.length} geplante Zahlungen`,
      detail: `${next.category}: ${eur(next.amount)} ${when}`,
      to: "/finanzen",
    });
  }

  // 5) Termine heute (Info-Reminder, abgesagte ausgenommen).
  const todaysEvents = events.filter((e) => !e.cancelled && e.start.slice(0, 10) === today);
  if (todaysEvents.length > 0) {
    out.push({
      id: "events",
      kind: "events",
      severity: "info",
      title: `${todaysEvents.length} ${todaysEvents.length === 1 ? "Termin" : "Termine"} heute`,
      detail: todaysEvents.slice(0, 3).map((e) => e.title).join(", "),
      to: "/kalender",
    });
  }

  // 6) Bildschirmzeit heute noch nicht eingetragen (nur wer das Modul nutzt).
  if (screenLoggedToday === false && hour >= 17) {
    out.push({
      id: "screentime",
      kind: "screentime",
      severity: "info",
      title: "Bildschirmzeit eintragen",
      detail: "Kurz die heutige Social-Zeit festhalten – ehrlich bleiben.",
      to: "/bildschirmzeit",
    });
  }

  // 7) Backup-Erinnerung: nie gesichert oder älter als 14 Tage.
  if (checkins.length + transactions.length + tasks.length > 0) {
    const days = lastBackup ? Math.floor((now.getTime() - new Date(lastBackup).getTime()) / 86_400_000) : null;
    if (days === null || days >= 14) {
      out.push({
        id: "backup",
        kind: "backup",
        severity: "info",
        title: "Backup fällig",
        detail: days === null ? "Noch nie gesichert – sichere deine Daten." : `Letzte Sicherung vor ${days} Tagen.`,
        to: "/einstellungen",
      });
    }
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
