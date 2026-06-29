import type { PlatformKind } from "@/data/types";

/*
  Liest die automatisch erzeugte stats.json (per GitHub-Action alle 12 h
  aktualisiert). Reines Lesen einer kleinen Datei von der eigenen Seite –
  kein API-Schlüssel im Client, keine Drittanbieter-Anfragen.
*/

export interface PlatformStat {
  configured: boolean;
  ok: boolean;
  error?: string | null;
  followers?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  videos?: number | null;
}

export interface LiveStats {
  updatedAt: string | null;
  platforms: Partial<Record<PlatformKind, PlatformStat>>;
}

/** stats.json frisch laden (Service-Worker-/HTTP-Cache umgehen). */
export async function fetchLiveStats(): Promise<LiveStats | null> {
  try {
    const base = import.meta.env.BASE_URL || "/";
    const res = await fetch(`${base}stats.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as LiveStats;
  } catch {
    return null;
  }
}
