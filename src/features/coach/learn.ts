import { differenceInCalendarDays, format } from "date-fns";
import type { CoachTip } from "./coach";

/*
  Selbst-Lernen (lokal): der Coach beobachtet, worauf du reagierst.
  - „acted" (Tipp befolgt/angetippt) -> Typ wird höher gewichtet.
  - „dismissed" (weggeklickt) -> Typ wird heruntergewichtet und kurz pausiert
    (Cooldown), damit es dich nicht weiter nervt.
  Über die Zeit rücken die Hinweise, auf die du wirklich reagierst, nach oben;
  die, die du ignorierst, verschwinden. Alles im localStorage, rein lokal.
*/

export interface LearnEntry {
  shown: number;
  acted: number;
  dismissed: number;
  lastDismiss?: string; // yyyy-MM-dd
  lastShown?: string;
}
export type CoachLearnState = Record<string, LearnEntry>;

const KEY = "lifeos.coachLearn";
const today = () => format(new Date(), "yyyy-MM-dd");

export function loadLearn(): CoachLearnState {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as CoachLearnState; } catch { return {}; }
}
function saveLearn(s: CoachLearnState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* egal */ }
}
function entry(s: CoachLearnState, k: string): LearnEntry {
  return s[k] ?? (s[k] = { shown: 0, acted: 0, dismissed: 0 });
}

/** Nutzer-Reaktion auf einen Hinweis festhalten. */
export function recordFeedback(learnKey: string, action: "act" | "dismiss"): void {
  const s = loadLearn();
  const e = entry(s, learnKey);
  if (action === "act") e.acted += 1;
  else { e.dismissed += 1; e.lastDismiss = today(); }
  saveLearn(s);
}

/** Anzeigen zählen – höchstens einmal pro Tag je Typ. */
export function recordShown(learnKeys: string[]): void {
  const s = loadLearn();
  const t = today();
  let changed = false;
  for (const k of learnKeys) {
    const e = entry(s, k);
    if (e.lastShown !== t) { e.shown += 1; e.lastShown = t; changed = true; }
  }
  if (changed) saveLearn(s);
}

/** Gelerntes Gewicht (>1 = wichtiger, <1 = unwichtiger). */
export function weightFor(e?: LearnEntry): number {
  if (!e) return 1;
  const net = e.acted - e.dismissed;
  return Math.max(0.3, Math.min(1.6, 1 + 0.12 * net));
}

/** Cooldown in Tagen nach einem Wegklicken (Alarme kürzer). */
function cooldownDays(t: CoachTip): number {
  return t.severity === "alert" ? 1 : 3;
}

/**
 * Wendet das Gelernte an: passt die Ränge an und blendet kürzlich weggeklickte
 * Typen für einen Cooldown aus. Ergebnis neu sortiert.
 */
export function applyLearning(tips: CoachTip[], state: CoachLearnState = loadLearn(), ref = new Date()): CoachTip[] {
  const t = format(ref, "yyyy-MM-dd");
  return tips
    .filter((tip) => {
      const e = state[tip.learnKey];
      if (!e?.lastDismiss) return true;
      const since = differenceInCalendarDays(new Date(`${t}T12:00:00`), new Date(`${e.lastDismiss}T12:00:00`));
      return since > cooldownDays(tip); // innerhalb des Cooldowns ausblenden
    })
    .map((tip) => ({ ...tip, score: tip.score * weightFor(state[tip.learnKey]) }))
    .sort((a, b) => b.score - a.score);
}

/** Gesamtzahl erfasster Reaktionen (für „lernt aus X Reaktionen"). */
export function feedbackCount(state: CoachLearnState = loadLearn()): number {
  return Object.values(state).reduce((n, e) => n + e.acted + e.dismissed, 0);
}
