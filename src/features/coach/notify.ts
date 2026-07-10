import { format } from "date-fns";
import { checkins as checkinsRepo, customMetrics as customMetricsRepo, profiles as profilesRepo, screenTime as screenTimeRepo } from "@/data/repo";
import { getNtfyTopic } from "@/data/reminders";
import { CHECKIN_METRICS, customToDescriptor } from "@/features/journal/checkin.metrics";
import { journalToday } from "@/features/journal/checkin.utils";
import { analyzeCoach, type CoachCategory, type CoachSeverity, type CoachTip } from "./coach";

/*
  Benachrichtigungs-Protokolle je Kategorie. Jede Kategorie verhält sich anders:
  manche nur in der App (Feier, Muster), andere als echte Push zur passenden
  Tageszeit (Training abends, Schlaf spät, Konsum, Prognose-Frühwarnung).
  Externe Push läuft über ntfy (auch bei geschlossener App), zeitversetzt geplant.
*/

export type NotifyChannel = "inapp" | "push" | "both";

export interface CategoryProtocol {
  channel: NotifyChannel;
  /** Lokale Stunde, zu der extern gepusht wird. */
  pushHour: number;
  /** Nur ab dieser Schwere pushen. */
  minSeverity: CoachSeverity;
  tag: string;
}

export const PROTOCOLS: Record<CoachCategory, CategoryProtocol> = {
  training: { channel: "both", pushHour: 18, minSeverity: "warn", tag: "muscle" },
  schlaf: { channel: "both", pushHour: 21, minSeverity: "warn", tag: "sleeping_bed" },
  konsum: { channel: "both", pushHour: 20, minSeverity: "warn", tag: "iphone" },
  prognose: { channel: "push", pushHour: 19, minSeverity: "warn", tag: "crystal_ball" },
  muster: { channel: "inapp", pushHour: 20, minSeverity: "warn", tag: "brain" },
  erfolg: { channel: "inapp", pushHour: 20, minSeverity: "good", tag: "trophy" },
};

const SEVERITY_RANK: Record<CoachSeverity, number> = { good: 0, info: 1, warn: 2, alert: 3 };
const appUrl = "https://suengerbusiness-source.github.io/Betriebssystem-/";

export interface PlannedPush {
  category: CoachCategory;
  at: number; // Unix-Sekunden
  title: string;
  body: string;
  tag: string;
  key: string;
}

/**
 * Plant je Kategorie höchstens eine externe Push (rein, testbar). Nur Kategorien
 * mit Push-Protokoll, passendem Schweregrad und einer Push-Zeit, die heute noch
 * in der Zukunft liegt.
 */
export function planCoachPushes(tips: CoachTip[], now: Date): PlannedPush[] {
  const day = format(now, "yyyy-MM-dd");
  const out: PlannedPush[] = [];
  for (const category of Object.keys(PROTOCOLS) as CoachCategory[]) {
    const proto = PROTOCOLS[category];
    if (proto.channel === "inapp") continue;
    const tip = tips
      .filter((t) => t.category === category && SEVERITY_RANK[t.severity] >= SEVERITY_RANK[proto.minSeverity])
      .sort((a, b) => b.score - a.score)[0];
    if (!tip) continue;
    const target = new Date(now);
    target.setHours(proto.pushHour, 0, 0, 0);
    const at = Math.floor(target.getTime() / 1000);
    if (target.getTime() <= now.getTime()) continue; // Push-Zeit heute schon vorbei
    out.push({ category, at, title: tip.title, body: tip.action ?? tip.message, tag: proto.tag, key: `lifeos.coachPush.${day}.${category}` });
  }
  return out;
}

/** Coach-Hinweise für ein Konto berechnen (ohne React – für den Push-Planer). */
export async function computeCoachTips(accountId: string): Promise<CoachTip[]> {
  const [checkins, screen, customAll, profile] = await Promise.all([
    checkinsRepo.list(accountId),
    screenTimeRepo.list(accountId),
    customMetricsRepo.list(accountId),
    profilesRepo.get(accountId),
  ]);
  const custom = customAll.filter((c) => !c.archived).map(customToDescriptor);
  const metrics = [...CHECKIN_METRICS, ...custom];
  return analyzeCoach({ today: journalToday(), checkins, metrics, customAll, screen, profile: profile ?? undefined });
}

/**
 * Plant externe Coach-Pushes bei ntfy ein (auch bei geschlossener App). Je Tag
 * und Kategorie höchstens eine – idempotent über localStorage. Ohne ntfy-Thema
 * passiert nichts (die In-App-Hinweise laufen trotzdem).
 */
export async function armCoachPush(accountId: string): Promise<void> {
  const topic = getNtfyTopic();
  if (!topic) return;
  const tips = await computeCoachTips(accountId);
  const planned = planCoachPushes(tips, new Date());
  for (const p of planned) {
    try {
      if (localStorage.getItem(p.key)) continue;
      await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: { Title: `Coach: ${p.title}`.slice(0, 100), Tags: p.tag, At: String(p.at), Click: appUrl },
        body: p.body,
      });
      localStorage.setItem(p.key, "1");
    } catch {
      /* Netzwerkfehler: beim nächsten App-Start erneut versuchen. */
    }
  }
}
