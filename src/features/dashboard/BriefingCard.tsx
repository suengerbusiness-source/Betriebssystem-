import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarX,
  Compass,
  HardDriveDownload,
  HeartPulse,
  ListChecks,
  NotebookPen,
  Repeat,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { channels as channelsRepo, checkins as checkinsRepo, events as eventsRepo, habitLogs as habitLogsRepo, habits as habitsRepo, tasks as tasksRepo, transactions as txRepo } from "@/data/repo";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { currentMonthKey, summarizeMonth } from "@/features/finance/finance.utils";
import { compactNumber } from "@/features/company/company.utils";
import { useLiveStats } from "@/features/company/useLiveStats";
import { totalChange } from "@/features/company/liveStatsHistory";
import { followerBreakdown } from "@/features/company/followers";
import { wellbeingScore } from "@/features/journal/checkin.utils";
import { buildDataset, labelOf, leverInsights } from "@/features/journal/insights";
import { computeNudges, type NudgeKind } from "@/features/nudges/nudges";
import { lastBackupAt } from "@/data/backup";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDaysStr = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const KIND_ICON: Record<NudgeKind, LucideIcon> = {
  checkin: NotebookPen,
  habits: Repeat,
  tasks: ListChecks,
  payment: Wallet,
  events: CalendarX,
  backup: HardDriveDownload,
  screentime: Smartphone,
};

export function BriefingCard() {
  const { account } = useAuth();
  const accId = account?.id;
  const navigate = useNavigate();
  const live = useLiveStats();

  const cs = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]) ?? [];
  const tx = useLiveQuery(() => (accId ? txRepo.list(accId) : []), [accId]) ?? [];
  const ch = useLiveQuery(() => (accId ? channelsRepo.list(accId) : []), [accId]) ?? [];
  const hs = useLiveQuery(() => (accId ? habitsRepo.list(accId) : []), [accId]) ?? [];
  const hl = useLiveQuery(() => (accId ? habitLogsRepo.list(accId) : []), [accId]) ?? [];
  const ts = useLiveQuery(() => (accId ? tasksRepo.list(accId) : []), [accId]) ?? [];
  const ev = useLiveQuery(() => (accId ? eventsRepo.list(accId) : []), [accId]) ?? [];

  const today = todayKey();
  const month = useMemo(() => summarizeMonth(tx, currentMonthKey()), [tx]);

  // Reichweite: Gesamt-Follower über den gemeinsamen Helfer (keine Doppelung),
  // Δ 30 Tage aus dem Live-Verlauf.
  const reach = useMemo(() => {
    const { total } = followerBreakdown(live.stats, ch);
    const f = totalChange(live.history, "followers");
    return { current: total, d30: f.d30 };
  }, [live.stats, live.history, ch]);

  // Wohlbefinden: Ø-Score letzte 7 Tage vs. die 7 Tage davor.
  const wb = useMemo(() => {
    const from7 = addDaysStr(today, -7);
    const from14 = addDaysStr(today, -14);
    const score = (c: { metrics: Record<string, number> }) => wellbeingScore(c.metrics);
    const last7 = avg(cs.filter((c) => c.date > from7 && c.date <= today).map(score).filter((v): v is number => v != null));
    const prev7 = avg(cs.filter((c) => c.date > from14 && c.date <= from7).map(score).filter((v): v is number => v != null));
    return { last7, trend: last7 != null && prev7 != null ? last7 - prev7 : null };
  }, [cs, today]);

  // „Das ist jetzt dran": dringende Nudges + ein Hebel-Tipp.
  const nudges = useMemo(
    () => computeNudges({ today, now: new Date(), checkins: cs, habits: hs, habitLogs: hl, tasks: ts, transactions: tx, events: ev, lastBackup: lastBackupAt() }),
    [today, cs, hs, hl, ts, tx, ev],
  );
  const lever = useMemo(() => {
    const rows = buildDataset(cs, hl, tx, ts, ev);
    return leverInsights(rows)[0] ?? null;
  }, [cs, hl, tx, ts, ev]);

  if (!accId) return null;

  const coachLine =
    month.balance < 0
      ? "Augen auf bei den Ausgaben. Hol dir das Plus zurück."
      : wb.trend != null && wb.trend < -5
        ? "Deine Energie sinkt. Heute bewusst gegensteuern."
        : nudges.some((n) => n.severity === "high")
          ? "Ein paar Dinge sind überfällig. Räum sie weg – jetzt."
          : "Solide Lage. Jetzt nachlegen, nicht ausruhen.";

  const actions = nudges.slice(0, 3);

  return (
    <Card>
      <CardHeader title="Lagebericht" subtitle={coachLine} icon={<Compass size={18} />} />
      <CardContent className="space-y-4">
        {/* Hier stehst du */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatRow
            icon={<Wallet size={16} />}
            label="Saldo diesen Monat"
            value={formatCurrency(month.balance)}
            tone={month.balance >= 0 ? "success" : "destructive"}
          />
          <StatRow
            icon={<Users size={16} />}
            label="Reichweite"
            value={reach.current > 0 ? `${compactNumber(reach.current)} Follower` : "—"}
            delta={reach.d30 ?? undefined}
          />
          <StatRow
            icon={<HeartPulse size={16} />}
            label="Wohlbefinden (7 T)"
            value={wb.last7 != null ? `${Math.round(wb.last7)}/100` : "—"}
            delta={wb.trend != null ? Math.round(wb.trend) : undefined}
          />
        </div>

        {/* Das ist jetzt dran */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Das ist jetzt dran</p>
          {actions.length === 0 && !lever ? (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Alles im grünen Bereich – stark. 💪</p>
          ) : (
            <ul className="space-y-1.5">
              {actions.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <li key={n.id}>
                    <button onClick={() => navigate(n.to)} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-secondary/50">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", n.severity === "high" ? "bg-destructive/15 text-destructive" : n.severity === "due" ? "bg-warning/15 text-warning" : "bg-secondary text-foreground/80")}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{n.title}</span>
                        {n.detail && <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>}
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
              {lever && (
                <li>
                  <button onClick={() => navigate("/erkenntnisse")} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border p-2.5 text-left transition-colors hover:bg-secondary/50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {lever.delta > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      Coach-Tipp: <span className="font-medium">{labelOf(lever.driver)}</span> wirkt stark auf deine{" "}
                      <span className="font-medium">{labelOf(lever.outcome)}</span>.
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-muted-foreground" />
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ icon, label, value, tone, delta }: { icon: React.ReactNode; label: string; value: string; tone?: "success" | "destructive"; delta?: number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn("text-lg font-bold tabular-nums", tone === "success" && "text-success", tone === "destructive" && "text-destructive")}>{value}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={cn("text-xs font-semibold", delta > 0 ? "text-success" : "text-destructive")}>
            {delta > 0 ? "+" : ""}{compactNumber(delta)}
          </span>
        )}
      </div>
    </div>
  );
}
