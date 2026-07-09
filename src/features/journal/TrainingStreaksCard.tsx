import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Dumbbell, Flame } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkins as checkinsRepo } from "@/data/repo";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { metricById } from "./checkin.metrics";
import { trackerStreaks } from "./checkin.utils";
import { useCustomMetrics } from "./useCustomMetrics";

/**
 * Dashboard-Karte für Ziel-Tracker (z. B. 100 Bizeps Curls/Tag): heutiger Stand
 * + laufende Strähne. Erscheint nur, wenn es Tracker mit Tagesziel gibt.
 */
export function TrainingStreaksCard() {
  const { account } = useAuth();
  const accId = account?.id;
  const checkins = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]) ?? [];
  const { active } = useCustomMetrics(accId);
  const streaks = useMemo(() => trackerStreaks(checkins, active), [checkins, active]);

  if (streaks.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Training & Ziele"
        subtitle="Deine Tagesziele und laufenden Strähnen."
        icon={<Dumbbell size={18} />}
        action={
          <Link to="/tagebuch" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Eintragen <ArrowRight size={14} />
          </Link>
        }
      />
      <CardContent>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {streaks.map((s) => {
            const Icon = metricById(s.id)?.icon ?? Dumbbell;
            const pct = Math.min(100, Math.round((s.todayValue / s.target) * 100));
            return (
              <li key={s.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", s.reachedToday ? "bg-success/15 text-success" : "bg-primary/10 text-primary")}>
                    {s.reachedToday ? <Check size={16} /> : <Icon size={16} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
                  {s.streak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                      <Flame size={13} /> {s.streak}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full transition-all", s.reachedToday ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {s.todayValue}/{s.target}{s.unit ? ` ${s.unit}` : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
