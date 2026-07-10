import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { checkins as checkinsRepo, customMetrics as customMetricsRepo, profiles as profilesRepo, screenTime as screenTimeRepo } from "@/data/repo";
import { CHECKIN_METRICS, customToDescriptor } from "@/features/journal/checkin.metrics";
import { journalToday } from "@/features/journal/checkin.utils";
import { analyzeCoach, type CoachTip } from "./coach";

/**
 * Liefert die aktuellen Coach-Hinweise für ein Konto. Lädt die nötigen Daten,
 * baut die Metrik-Liste (eingebaute + eigene) und lässt die Coach-Engine laufen.
 */
export function useCoach(accountId?: string): CoachTip[] {
  const checkins = useLiveQuery(() => (accountId ? checkinsRepo.list(accountId) : []), [accountId]) ?? [];
  const screen = useLiveQuery(() => (accountId ? screenTimeRepo.list(accountId) : []), [accountId]) ?? [];
  const customAll = useLiveQuery(() => (accountId ? customMetricsRepo.list(accountId) : []), [accountId]) ?? [];
  const profile = useLiveQuery(() => (accountId ? profilesRepo.get(accountId) : undefined), [accountId]);

  return useMemo(() => {
    if (!accountId) return [];
    const custom = customAll.filter((c) => !c.archived).map(customToDescriptor);
    const metrics = [...CHECKIN_METRICS, ...custom];
    return analyzeCoach({ today: journalToday(), checkins, metrics, customAll, screen, profile: profile ?? undefined });
  }, [accountId, checkins, screen, customAll, profile]);
}
