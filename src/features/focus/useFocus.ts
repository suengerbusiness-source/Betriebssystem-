import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { checkins as checkinsRepo, events as eventsRepo, habitLogs as habitLogsRepo, habits as habitsRepo, tasks as tasksRepo } from "@/data/repo";
import { journalToday, trackerStreaks } from "@/features/journal/checkin.utils";
import { useCustomMetrics } from "@/features/journal/useCustomMetrics";
import { useCoach } from "@/features/coach/useCoach";
import { buildFocus, type FocusItem } from "./focus";

/** Liefert die nach Dringlichkeit sortierte „Was ist jetzt dran?"-Liste. */
export function useFocus(accountId?: string): FocusItem[] {
  const checkins = useLiveQuery(() => (accountId ? checkinsRepo.list(accountId) : []), [accountId]) ?? [];
  const tasks = useLiveQuery(() => (accountId ? tasksRepo.list(accountId) : []), [accountId]) ?? [];
  const events = useLiveQuery(() => (accountId ? eventsRepo.list(accountId) : []), [accountId]) ?? [];
  const habits = useLiveQuery(() => (accountId ? habitsRepo.list(accountId) : []), [accountId]) ?? [];
  const habitLogs = useLiveQuery(() => (accountId ? habitLogsRepo.list(accountId) : []), [accountId]) ?? [];
  const { active } = useCustomMetrics(accountId);
  const coachTips = useCoach(accountId);

  return useMemo(() => {
    if (!accountId) return [];
    const today = journalToday();
    const streaks = trackerStreaks(checkins, active);
    return buildFocus({
      now: new Date(),
      today,
      checkedInToday: checkins.some((c) => c.date === today),
      streaks,
      tasks,
      events,
      habits,
      habitLogs,
      coachTips,
    });
  }, [accountId, checkins, tasks, events, habits, habitLogs, active, coachTips]);
}
