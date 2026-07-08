import { addDays, format, parseISO } from "date-fns";
import { checkins as checkinsRepo } from "@/data/repo";
import { getNtfyTopic } from "@/data/reminders";
import { journalToday } from "./checkin.utils";

/*
  Tagebuch-Erinnerungen als echte Push – auch bei geschlossener App – über ntfy.

  Der Nutzer will die Erinnerung um 20:00 Uhr; ist der Check-in bis dahin nicht
  gemacht, kommt spätestens um 22:00 Uhr eine letzte Erinnerung. Weil eine reine
  In-App-Benachrichtigung nur feuert, wenn die App gerade offen ist (deshalb kamen
  die alten Erinnerungen erst nachts, sobald die App das nächste Mal geöffnet
  wurde), planen wir hier die Push ZEITVERSETZT bei ntfy ein (Header „At").

  Grenzen der 0-€-Architektur (ehrlich): ntfy kann anonym nur ~3 Tage im Voraus
  planen, und eine einmal eingeplante Push lässt sich nicht mehr zurückrufen.
  Deshalb planen wir Tage, an denen der Check-in bereits erledigt ist, gar nicht
  erst ein – die Erinnerung eines schon erledigten Tages kann in seltenen Fällen
  trotzdem noch eintreffen, wenn sie vor dem Eintrag geplant wurde.
*/

const MAX_AHEAD_MS = 3 * 24 * 60 * 60 * 1000; // ntfy-Limit (anonym)
const DAYS_AHEAD = 3; // heute + kommende Tage vorplanen (innerhalb des Limits)
const appUrl = "https://suengerbusiness-source.github.io/Betriebssystem-/";

/** Feste Erinnerungs-Zeitpunkte pro Tag. */
const SLOTS = [
  {
    hour: 20,
    tag: "memo",
    title: "Check-in fällig – Coach wartet",
    body: "Tag fast rum. 60 Sekunden Check-in – zeig mir, wie dein Tag wirklich war.",
  },
  {
    hour: 22,
    tag: "alarm_clock",
    title: "Letzte Erinnerung: Check-in",
    body: "Noch nicht eingetragen? Jetzt schnell, bevor der Tag vorbei ist. Keine Ausreden.",
  },
] as const;

const storageKey = (date: string, hour: number) => `lifeos.ciRem.${date}.${hour}`;

/**
 * Plant die Check-in-Erinnerungen (20:00 + 22:00) für heute und die nächsten
 * Tage bei ntfy ein – idempotent (jeder Slot wird höchstens einmal geplant) und
 * nur für Tage, an denen noch kein Check-in existiert.
 */
export async function armCheckinReminders(accountId: string): Promise<void> {
  const topic = getNtfyTopic();
  if (!topic) return;

  const list = await checkinsRepo.list(accountId);
  const done = new Set(list.map((c) => c.date));
  const now = Date.now();
  const base = journalToday(); // heutiger Tagebuch-Tag (läuft bis 2 Uhr)

  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const date = format(addDays(parseISO(base), offset), "yyyy-MM-dd");
    if (done.has(date)) continue; // Tag erledigt -> keine Erinnerung

    for (const slot of SLOTS) {
      const targetMs = new Date(`${date}T${String(slot.hour).padStart(2, "0")}:00:00`).getTime();
      if (!Number.isFinite(targetMs)) continue;
      if (targetMs <= now) continue; // Zeitpunkt schon vorbei
      if (targetMs - now > MAX_AHEAD_MS) continue; // noch außer Reichweite -> später
      const key = storageKey(date, slot.hour);
      if (localStorage.getItem(key)) continue; // schon geplant

      try {
        await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
          method: "POST",
          headers: {
            Title: slot.title,
            Tags: slot.tag,
            At: String(Math.floor(targetMs / 1000)),
            Click: appUrl,
          },
          body: slot.body,
        });
        localStorage.setItem(key, "1");
      } catch {
        /* Netzwerkfehler: beim nächsten App-Start erneut versuchen. */
      }
    }
  }
}
