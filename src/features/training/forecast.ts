import type { UserProfile } from "@/data/types";
import type { MetricDescriptor } from "@/features/journal/checkin.metrics";
import { lagLevers, type DayRow } from "@/features/journal/insights";

/*
  Das Profil fließt aktiv in die Prognose ein: aus Fokus-Bereichen, Zielen und
  Kontext werden „Schwerpunkt-Themen" (Metrik-IDs) abgeleitet. Vorhersagen, die
  einen dieser Schwerpunkte betreffen, werden bevorzugt und markiert – so ist die
  Prognose auf das abgestimmt, was der Person wichtig ist.
*/
const KEYWORD_TOPICS: { re: RegExp; ids: string[] }[] = [
  { re: /schlaf|einschlaf|aufsteh|müde|mude|erhol|regenerat/i, ids: ["sleepHours", "sleepQuality", "recovery", "bedtime", "wakeTime"] },
  { re: /energie|energy|kraftlos|antrieb|motivat/i, ids: ["energy", "motivation"] },
  { re: /stress|druck|angespannt|überlast|uberlast/i, ids: ["stress"] },
  { re: /fokus|konzentr|ablenk/i, ids: ["focus"] },
  { re: /produktiv|arbeit|leistung|business|umsatz|content|video|dreh|schnitt/i, ids: ["productivity", "screenProductive", "earnedMoney"] },
  { re: /stimmung|laune|glück|gluck|zufrieden|mental/i, ids: ["mood", "meaning"] },
  { re: /sinn|erfüll|erfull|purpose/i, ids: ["meaning"] },
  { re: /social|handy|bildschirm|screen|tiktok|instagram|scroll|konsum/i, ids: ["socialMin", "socialShare", "screenTotal", "screenPassive"] },
  { re: /koffein|kaffee|caffe/i, ids: ["caffeine"] },
  { re: /protein|ernähr|ernahr|essen|nutrition|shake/i, ids: ["nutrition"] },
  { re: /kraft|training|muskel|sport|fitness|gym|liege|klimm|curl|squat|situp|bizeps/i, ids: ["sport"] },
  { re: /sozial|freund|beziehung|kontakt/i, ids: ["social"] },
];

/** Schwerpunkt-Themen (Metrik-IDs) aus dem Profil ableiten. */
export function profileTopics(profile: UserProfile | undefined, metrics: MetricDescriptor[]): Set<string> {
  const ids = new Set<string>();
  if (!profile) return ids;
  const text = [profile.about, profile.goals, profile.context, ...(profile.focus ?? [])].filter(Boolean).join(" \n ").toLowerCase();
  if (!text.trim()) return ids;
  for (const { re, ids: topicIds } of KEYWORD_TOPICS) {
    if (re.test(text)) topicIds.forEach((id) => ids.add(id));
  }
  // Eigene Tracker, deren Name im Profiltext auftaucht (z. B. Ziel „100 Klimmzüge").
  for (const m of metrics) {
    if (m.custom && m.label && text.includes(m.label.toLowerCase())) ids.add(m.id);
  }
  return ids;
}

/*
  „Palantir"-Prognose: nutzt die gelernten zeitversetzten Muster (gestern → heute)
  und die heutigen Werte, um eine vorsichtige Vorhersage für morgen zu treffen –
  z. B. „viel Social heute → morgen wahrscheinlich weniger Energie".
  Bewusst als Hypothese formuliert, nicht als Gewissheit.
*/

export interface Prediction {
  outcome: string;
  driver: string;
  /** Erwartete Veränderung des morgigen Ergebnisses (Skalenpunkte). */
  effect: number;
  /** War der heutige Treiber hoch (true) oder niedrig (false)? */
  todayHigh: boolean;
  n: number;
  /** Betrifft einen Schwerpunkt aus dem Profil (Fokus/Ziele). */
  priority: boolean;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Vorhersage für morgen aus den heutigen Werten. Für jeden zeitversetzten Hebel
 * wird geprüft, ob der heutige Treiber hoch/niedrig ist, und daraus die
 * erwartete Richtung des morgigen Ergebnisses abgeleitet.
 */
export function forecast(
  rows: DayRow[],
  todayValues: Record<string, number>,
  opts: { minEffect?: number; priority?: Set<string> } = {},
): Prediction[] {
  const minEffect = opts.minEffect ?? 0.5;
  const priority = opts.priority ?? new Set<string>();
  const lags = lagLevers(rows);
  const out: Prediction[] = [];

  for (const l of lags) {
    const vals = rows.map((r) => r.values[l.driver]).filter((v): v is number => v !== undefined);
    if (vals.length < 4) continue;
    const tv = todayValues[l.driver];
    if (tv === undefined) continue;

    const med = median(vals);
    const isHigh = l.boolDriver ? tv >= 1 : tv > med;
    const isLow = l.boolDriver ? tv < 1 : tv < med;
    if (!isHigh && !isLow) continue;

    // l.delta = Ergebnis am Folgetag: hoch- minus niedrig-Gruppe.
    const effect = isHigh ? l.delta : -l.delta;
    if (Math.abs(effect) < minEffect) continue;
    const isPriority = priority.has(l.outcome) || priority.has(l.driver);
    out.push({ outcome: l.outcome, driver: l.driver, effect, todayHigh: isHigh, n: l.n, priority: isPriority });
  }

  // Profil-Schwerpunkte zuerst, dann nach Stärke. Je Ergebnis die stärkste
  // Vorhersage, insgesamt höchstens 5.
  out.sort((a, b) => Number(b.priority) - Number(a.priority) || Math.abs(b.effect) - Math.abs(a.effect));
  const seen = new Set<string>();
  const result: Prediction[] = [];
  for (const p of out) {
    if (seen.has(p.outcome)) continue;
    seen.add(p.outcome);
    result.push(p);
    if (result.length >= 5) break;
  }
  return result;
}
