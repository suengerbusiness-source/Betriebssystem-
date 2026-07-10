import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { activity as activityRepo, checkins as checkinsRepo, customMetrics as customMetricsRepo, profiles as profilesRepo, screenTime as screenTimeRepo } from "@/data/repo";
import { CHECKIN_METRICS, customToDescriptor } from "@/features/journal/checkin.metrics";
import { journalToday } from "@/features/journal/checkin.utils";
import { analyzeCoach, type CoachTip } from "./coach";
import { applyLearning } from "./learn";

/**
 * Liefert die aktuellen Coach-Hinweise für ein Konto. Lädt die nötigen Daten,
 * baut die Metrik-Liste (eingebaute + eigene) und lässt die Coach-Engine laufen.
 */
export function useCoach(accountId?: string): CoachTip[] {
  const checkins = useLiveQuery(() => (accountId ? checkinsRepo.list(accountId) : []), [accountId]) ?? [];
  const screen = useLiveQuery(() => (accountId ? screenTimeRepo.list(accountId) : []), [accountId]) ?? [];
  const customAll = useLiveQuery(() => (accountId ? customMetricsRepo.list(accountId) : []), [accountId]) ?? [];
  const profile = useLiveQuery(() => (accountId ? profilesRepo.get(accountId) : undefined), [accountId]);
  const activity = useLiveQuery(() => (accountId ? activityRepo.list(accountId) : []), [accountId]) ?? [];

  return useMemo(() => {
    if (!accountId) return [];
    const custom = customAll.filter((c) => !c.archived).map(customToDescriptor);
    const metrics = [...CHECKIN_METRICS, ...custom];
    const tips = analyzeCoach({ today: journalToday(), checkins, metrics, customAll, screen, profile: profile ?? undefined, activity });
    return applyLearning(tips); // gelerntes Verhalten anwenden (Rang + Cooldown)
  }, [accountId, checkins, screen, customAll, profile, activity]);
}
