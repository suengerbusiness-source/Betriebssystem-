import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Lock, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { channels as channelsRepo, checkins as checkinsRepo, habitLogs as habitLogsRepo, tasks as tasksRepo } from "@/data/repo";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { checkinStreak, trackerStreaks } from "@/features/journal/checkin.utils";
import { useCustomMetrics } from "@/features/journal/useCustomMetrics";
import { compactNumber } from "@/features/company/company.utils";
import { useLiveStats } from "@/features/company/useLiveStats";
import { TRACKED_PLATFORMS } from "@/features/company/liveStatsHistory";
import { computeAchievements, groupAchievements } from "./achievements";

export function AchievementsPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const live = useLiveStats();

  const cs = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]) ?? [];
  const hl = useLiveQuery(() => (accId ? habitLogsRepo.list(accId) : []), [accId]) ?? [];
  const ts = useLiveQuery(() => (accId ? tasksRepo.list(accId) : []), [accId]) ?? [];
  const ch = useLiveQuery(() => (accId ? channelsRepo.list(accId) : []), [accId]) ?? [];
  const { active: customMetrics } = useCustomMetrics(accId);

  const { groups, earned, total } = useMemo(() => {
    const liveKinds = TRACKED_PLATFORMS.filter((k) => live.stats?.platforms[k]?.ok);
    const liveF = liveKinds.reduce((s, k) => s + (live.stats?.platforms[k]?.followers ?? 0), 0);
    const manual = ch.filter((c) => !liveKinds.includes(c.kind)).reduce((s, c) => s + (c.followers ?? 0), 0);
    const list = computeAchievements({
      checkinStreak: checkinStreak(new Set(cs.map((c) => c.date))),
      checkinTotal: cs.length,
      followers: liveF + manual,
      tasksDone: ts.filter((t) => t.done).length,
      habitDone: hl.length,
      trackerStreaks: trackerStreaks(cs, customMetrics).map((s) => ({ id: s.id, label: s.label, streak: s.streak })),
    });
    return { groups: groupAchievements(list), earned: list.filter((a) => a.reached).length, total: list.length };
  }, [cs, hl, ts, ch, live.stats, customMetrics]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Erfolge"
        subtitle="Deine Meilensteine – freigeschaltet durch Dranbleiben."
        actions={<Badge className="gap-1.5 border-warning/40 px-3 py-1 text-warning"><Trophy size={14} /> {earned}/{total}</Badge>}
      />

      {groups.map((g) => {
        const nextPct = g.next ? Math.min(Math.round((g.value / g.next.target) * 100), 100) : 100;
        return (
          <Card key={g.title}>
            <CardHeader
              title={g.title}
              subtitle={g.next ? `Nächstes Ziel: ${g.next.label}` : "Alle Stufen geschafft – stark!"}
              icon={<Trophy size={18} />}
              action={<span className="text-sm text-muted-foreground">{g.earned.length}/{g.total}</span>}
            />
            <CardContent className="space-y-3">
              {g.next && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{compactNumber(g.value)}</span>
                    <span>{compactNumber(g.next.target)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${nextPct}%` }} />
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {g.earned.length === 0 && !g.next && null}
                {[...g.earned, ...(g.next ? [g.next] : [])].map((a) => (
                  <span
                    key={a.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                      a.reached ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-muted-foreground",
                    )}
                  >
                    {a.reached ? <Trophy size={13} /> : <Lock size={12} />} {a.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
