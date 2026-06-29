import { useEffect, useState } from "react";
import type { PlatformKind } from "@/data/types";
import { fetchLiveStats, type LiveStats } from "@/lib/liveStats";
import { loadHistory, recordSnapshot, TRACKED_PLATFORMS, type HistorySnapshot } from "./liveStatsHistory";

const PREV_KEY = "lifeos.liveStatsPrev";

export interface LiveStatsState {
  loaded: boolean;
  stats: LiveStats | null;
  /** Follower-Veränderung seit dem letzten gespeicherten Abruf. */
  deltas: Partial<Record<PlatformKind, number>>;
  history: HistorySnapshot[];
}

/**
 * Lädt die stats.json einmal, speichert den Tages-Snapshot in den Verlauf und
 * berechnet die Follower-Deltas zum letzten Abruf. Eine zentrale Quelle für
 * Live-Karte, Gesamtübersicht und Kanal-Analyse.
 */
export function useLiveStats(): LiveStatsState {
  const [state, setState] = useState<LiveStatsState>(() => ({
    loaded: false,
    stats: null,
    deltas: {},
    history: loadHistory(),
  }));

  useEffect(() => {
    let active = true;
    fetchLiveStats().then((data) => {
      if (!active) return;
      if (!data) {
        setState((s) => ({ ...s, loaded: true }));
        return;
      }

      const deltas: Partial<Record<PlatformKind, number>> = {};
      try {
        const prev = JSON.parse(localStorage.getItem(PREV_KEY) || "null") as LiveStats | null;
        if (prev && prev.updatedAt !== data.updatedAt) {
          for (const k of TRACKED_PLATFORMS) {
            const a = data.platforms[k]?.followers;
            const b = prev.platforms[k]?.followers;
            if (a != null && b != null) deltas[k] = a - b;
          }
        }
        if (data.updatedAt && (!prev || prev.updatedAt !== data.updatedAt)) {
          localStorage.setItem(PREV_KEY, JSON.stringify(data));
        }
      } catch {
        /* localStorage egal */
      }

      const history = recordSnapshot(data);
      setState({ loaded: true, stats: data, deltas, history });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
