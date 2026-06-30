import type { Channel, PlatformKind } from "@/data/types";
import type { LiveStats } from "@/lib/liveStats";
import { PLATFORMS } from "./company.platforms";
import { TRACKED_PLATFORMS } from "./liveStatsHistory";

/*
  Eine EINZIGE, verlässliche Berechnung der Gesamt-Follower – damit Dashboard,
  Unternehmens-Übersicht und Kanäle-Tab garantiert dieselbe Zahl zeigen.

  Regeln gegen Doppelzählung:
  - Jede der vier Hauptplattformen zählt höchstens EINMAL: live, sonst ein
    einzelner manueller Eintrag (der mit den meisten Followern, falls es
    versehentlich mehrere gibt).
  - Andere Kanäle (Shop, Affiliate, Website …) werden einzeln addiert.
*/

export interface FollowerItem {
  id: string;
  kind: PlatformKind;
  name: string;
  followers: number;
  live: boolean;
}

export function followerBreakdown(stats: LiveStats | null, channels: Channel[]): { total: number; items: FollowerItem[] } {
  const liveKinds = TRACKED_PLATFORMS.filter((k) => stats?.platforms[k]?.ok);
  const mainKinds = new Set<PlatformKind>(TRACKED_PLATFORMS);
  const items: FollowerItem[] = [];

  // 1) Live-Plattformen (je einmal).
  for (const k of liveKinds) {
    const named = channels.find((c) => c.kind === k)?.name;
    items.push({ id: `live-${k}`, kind: k, name: named ?? PLATFORMS[k].label, followers: stats?.platforms[k]?.followers ?? 0, live: true });
  }

  // 2) Manuelle Kanäle: Hauptplattformen entdoppeln (nur der stärkste Eintrag je
  //    Plattform), übrige Kanäle einzeln zählen.
  const bestMain = new Map<PlatformKind, Channel>();
  for (const c of channels) {
    if (liveKinds.includes(c.kind)) continue; // live hat Vorrang
    if (mainKinds.has(c.kind)) {
      const cur = bestMain.get(c.kind);
      if (!cur || (c.followers ?? 0) > (cur.followers ?? 0)) bestMain.set(c.kind, c);
    } else {
      items.push({ id: c.id, kind: c.kind, name: c.name, followers: c.followers ?? 0, live: false });
    }
  }
  for (const c of bestMain.values()) {
    items.push({ id: c.id, kind: c.kind, name: c.name, followers: c.followers ?? 0, live: false });
  }

  items.sort((a, b) => b.followers - a.followers);
  return { total: items.reduce((s, i) => s + i.followers, 0), items };
}
