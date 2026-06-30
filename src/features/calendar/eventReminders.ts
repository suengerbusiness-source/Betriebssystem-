import type { CalendarEvent } from "@/data/types";
import { events as eventsRepo } from "@/data/repo";
import { getNtfyTopic } from "@/data/reminders";

/*
  Termin-Erinnerungen als echte Push (auch bei geschlossener App) über ntfy.
  ntfy kann Nachrichten ZEITVERSETZT zustellen (Header „At" = Unix-Zeit). Beim
  Speichern eines Termins mit Erinnerung planen wir die Push für
  (Beginn − X Minuten). ntfy.sh erlaubt anonym bis ~3 Tage Vorlauf – weiter
  entfernte Termine werden beim App-Start nachgeplant, sobald sie in Reichweite
  sind (siehe armDueReminders).
*/

const MAX_AHEAD_MS = 3 * 24 * 60 * 60 * 1000; // ntfy-Limit (anonym)
const appUrl = "https://suengerbusiness-source.github.io/Betriebssystem-/";

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Zielzeitpunkt (Unix-Sekunden) der Erinnerung oder null, wenn keine/zu spät. */
function reminderTarget(ev: CalendarEvent): number | null {
  if (!ev.reminderMinutes || ev.cancelled) return null;
  const startMs = new Date(ev.start).getTime();
  const targetMs = startMs - ev.reminderMinutes * 60_000;
  if (!Number.isFinite(targetMs)) return null;
  return Math.floor(targetMs / 1000);
}

/**
 * Erinnerung für einen Termin einplanen (sofern fällig & in Reichweite).
 * Gibt den geplanten Unix-Zeitpunkt zurück (für reminderScheduledFor) oder null.
 */
export async function armEventReminder(ev: CalendarEvent): Promise<number | null> {
  const topic = getNtfyTopic();
  const target = reminderTarget(ev);
  if (!topic || target === null) return null;

  const targetMs = target * 1000;
  const now = Date.now();
  if (targetMs <= now) return null; // in der Vergangenheit
  if (targetMs - now > MAX_AHEAD_MS) return null; // noch zu weit weg -> später nachplanen
  if (ev.reminderScheduledFor === target) return target; // schon geplant

  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: {
        Title: `Gleich: ${ev.title}`.slice(0, 100),
        Tags: "calendar",
        At: String(target),
        Click: appUrl,
      },
      body: `In ${ev.reminderMinutes} Min beginnt „${ev.title}" (${hhmm(ev.start)}).`,
    });
    return target;
  } catch {
    return null;
  }
}

/** Beim App-Start: Erinnerungen nachplanen, die jetzt in Reichweite gerückt sind. */
export async function armDueReminders(accountId: string): Promise<void> {
  const list = await eventsRepo.list(accountId);
  const now = Date.now();
  for (const ev of list) {
    const target = reminderTarget(ev);
    if (target === null) continue;
    const targetMs = target * 1000;
    if (targetMs <= now || targetMs - now > MAX_AHEAD_MS) continue;
    if (ev.reminderScheduledFor === target) continue;
    const done = await armEventReminder(ev);
    if (done) await eventsRepo.update(ev.id, { reminderScheduledFor: done });
  }
}
