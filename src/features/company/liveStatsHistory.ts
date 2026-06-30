import type { PlatformKind } from "@/data/types";
import type { LiveStats } from "@/lib/liveStats";

/*
  Lokaler Verlauf der Live-Kennzahlen. Jeder Abruf (alle 12 h) legt einen
  Tages-Snapshot ab – daraus berechnen wir Veränderungen über 30 Tage / 1 Jahr.
  Liegt nur auf dem Gerät (localStorage), baut sich also mit der Zeit auf.
*/

const HISTORY_KEY = "lifeos.liveStatsHistory";
const MAX_ENTRIES = 800;

export const TRACKED_PLATFORMS: PlatformKind[] = ["youtube", "instagram", "facebook", "tiktok"];

export type Metric = "followers" | "views" | "likes" | "videos";

export const METRIC_LABELS: Record<Metric, string> = {
  followers: "Follower",
  views: "Aufrufe",
  likes: "Likes",
  videos: "Videos",
};

export interface MetricSnapshot {
  followers?: number;
  views?: number;
  likes?: number;
  videos?: number;
}

export interface HistorySnapshot {
  /** Kalendertag YYYY-MM-DD (ein Eintrag pro Tag). */
  day: string;
  /** Zeitstempel des Abrufs (ISO). */
  at: string;
  platforms: Partial<Record<PlatformKind, MetricSnapshot>>;
}

export function loadHistory(): HistorySnapshot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? (raw as HistorySnapshot[]) : [];
  } catch {
    return [];
  }
}

/** Aktuelle Live-Daten als Tages-Snapshot ablegen (überschreibt denselben Tag). */
export function recordSnapshot(stats: LiveStats): HistorySnapshot[] {
  const history = loadHistory();
  const at = stats.updatedAt || new Date().toISOString();
  const day = at.slice(0, 10);

  const platforms: HistorySnapshot["platforms"] = {};
  for (const k of TRACKED_PLATFORMS) {
    const p = stats.platforms[k];
    if (!p?.ok) continue;
    platforms[k] = {
      followers: p.followers ?? undefined,
      views: p.views ?? undefined,
      likes: p.likes ?? undefined,
      videos: p.videos ?? undefined,
    };
  }
  if (Object.keys(platforms).length === 0) return history;

  const next = [...history.filter((h) => h.day !== day), { day, at, platforms }]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* Speicher voll – egal, Daten sind „best effort". */
  }
  return next;
}

function latestOf(history: HistorySnapshot[]): HistorySnapshot | null {
  return history.length ? history[history.length - 1] : null;
}

/** Jüngster Snapshot, der mindestens `days` Tage alt ist (Vergleichspunkt). */
function snapshotDaysAgo(history: HistorySnapshot[], days: number): HistorySnapshot | null {
  const target = Date.now() - days * 86_400_000;
  let best: HistorySnapshot | null = null;
  for (const h of history) {
    if (new Date(h.at).getTime() <= target) best = h;
  }
  return best;
}

/** Summe einer Kennzahl über alle Plattformen eines Snapshots. */
function sumMetric(snap: HistorySnapshot, metric: Metric): number | null {
  let sum = 0;
  let any = false;
  for (const k of TRACKED_PLATFORMS) {
    const v = snap.platforms[k]?.[metric];
    if (v != null) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

export interface PeriodChange {
  current: number | null;
  d30: number | null;
  d365: number | null;
}

/** Gesamt-Wert + Veränderung über 30 / 365 Tage (oder null, wenn Verlauf fehlt). */
export function totalChange(history: HistorySnapshot[], metric: Metric): PeriodChange {
  const latest = latestOf(history);
  const current = latest ? sumMetric(latest, metric) : null;
  const p30 = snapshotDaysAgo(history, 30);
  const p365 = snapshotDaysAgo(history, 365);
  const c30 = p30 ? sumMetric(p30, metric) : null;
  const c365 = p365 ? sumMetric(p365, metric) : null;
  return {
    current,
    d30: current != null && c30 != null ? current - c30 : null,
    d365: current != null && c365 != null ? current - c365 : null,
  };
}

/** Zeitreihe der Gesamt-Summe einer Kennzahl (für Verlaufs-Diagramme). */
export function metricSeries(history: HistorySnapshot[], metric: Metric): { day: string; value: number }[] {
  const out: { day: string; value: number }[] = [];
  for (const h of history) {
    const v = sumMetric(h, metric);
    if (v != null) out.push({ day: h.day, value: v });
  }
  return out;
}

/** Veränderung einer einzelnen Plattform-Kennzahl über `days` Tage. */
export function platformChange(history: HistorySnapshot[], kind: PlatformKind, metric: Metric, days: number): number | null {
  const latest = latestOf(history);
  const cur = latest?.platforms[kind]?.[metric];
  const past = snapshotDaysAgo(history, days);
  const old = past?.platforms[kind]?.[metric];
  if (cur == null || old == null) return null;
  return cur - old;
}
