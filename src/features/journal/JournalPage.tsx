import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowRight, Brain, Flame, LineChart, MessageSquare, NotebookPen, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkins as checkinsRepo } from "@/data/repo";
import type { CheckIn } from "@/data/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckInForm } from "./CheckInForm";
import { CustomMetricsManager } from "./CustomMetricsManager";
import { useCustomMetrics } from "./useCustomMetrics";
import { formatMetricValue, metricById } from "./checkin.metrics";
import { checkinStreak, journalToday, metricAverages, wellbeingScore } from "./checkin.utils";
import { correlationStrength, labelFor, topCorrelations } from "./checkin.analysis";

/** Anzahl Check-ins, ab der erste Muster sinnvoll angezeigt werden. */
const MIN_FOR_PATTERNS = 5;
/** Kennzahlen, die in der Verlaufs-Liste kompakt gezeigt werden. */
const SUMMARY_METRICS = ["mood", "energy", "stress", "focus", "productivity"];

export function JournalPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const today = journalToday();

  const all = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]) ?? [];
  const { all: customAll, active: customActive } = useCustomMetrics(accId);

  const sorted = useMemo(
    () => [...all].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [all],
  );
  const streak = useMemo(() => checkinStreak(new Set(all.map((c) => c.date))), [all]);
  // Ø-Hinweise über eingebaute + eigene Tracker (customActive in den Deps, damit
  // neue Tracker sofort berücksichtigt werden; metricAverages nutzt die Registry).
  const recentAvg = useMemo(() => metricAverages(sorted.slice(0, 14)), [sorted, customActive]);
  const patterns = useMemo(
    () => (all.length >= MIN_FOR_PATTERNS ? topCorrelations(all, { minSamples: MIN_FOR_PATTERNS }).slice(0, 3) : []),
    [all],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tagebuch"
        subtitle="Dein Abend-Check-in – die Datengrundlage, um Muster und Phasen zu erkennen."
        actions={
          streak > 0 ? (
            <Badge className="gap-1.5 border-warning/40 px-3 py-1 text-warning">
              <Flame size={14} /> {streak} {streak === 1 ? "Tag" : "Tage"} in Folge
            </Badge>
          ) : undefined
        }
      />

      {accId && <CheckInForm key={accId} accountId={accId} avgMetrics={recentAvg} customMetrics={customActive} />}

      {accId && <CustomMetricsManager accountId={accId} metrics={customAll} />}

      {/* Analyse-Fundament: wächst mit den Daten */}
      <Card>
        <CardHeader
          title="Muster & Zusammenhänge"
          subtitle="Wird automatisch berechnet, je mehr du eincheckst."
          icon={<Brain size={18} />}
          action={
            <Link to="/erkenntnisse" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Erkenntnisse <ArrowRight size={14} />
            </Link>
          }
        />
        <CardContent>
          {all.length < MIN_FOR_PATTERNS ? (
            <div className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((all.length / MIN_FOR_PATTERNS) * 100, 100)}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">
                Noch {Math.max(MIN_FOR_PATTERNS - all.length, 0)} Check-ins, dann zeigen sich erste Zusammenhänge
                (z. B. Schlafqualität ↔ Fokus, Stress ↔ Produktivität). Deine Eingaben werden bereits sauber
                strukturiert gespeichert, damit wissenschaftliche und KI-Auswertungen direkt darauf aufsetzen können.
              </p>
            </div>
          ) : patterns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bisher kein klarer Zusammenhang erkennbar. Mit mehr Tagen werden die Muster deutlicher.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {patterns.map((c) => {
                const positive = c.r > 0;
                return (
                  <li key={`${c.a}-${c.b}`} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                      <LineChart size={16} />
                    </span>
                    <p className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{labelFor(c.a)}</span>
                      {positive ? " und " : " vs. "}
                      <span className="font-medium">{labelFor(c.b)}</span>:{" "}
                      <span className="text-muted-foreground">
                        {correlationStrength(c.r)} {positive ? "Gleichlauf" : "Gegenlauf"} (r = {c.r.toFixed(2)}, n = {c.n})
                      </span>
                    </p>
                  </li>
                );
              })}
              <li className="pt-1 text-xs text-muted-foreground">
                Hinweis: Zusammenhang ist keine Ursache. Diese Vorschau wächst zur vollen Analyse aus.
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Verlauf */}
      <Card>
        <CardHeader title="Verlauf" subtitle="Deine letzten Check-ins" icon={<NotebookPen size={18} />} />
        <CardContent>
          {sorted.length === 0 ? (
            <EmptyState
              icon={<NotebookPen size={22} />}
              title="Noch kein Eintrag"
              description="Mach oben deinen ersten Abend-Check-in – ab dann sammelt sich deine persönliche Datengrundlage."
            />
          ) : (
            <ul className="divide-y divide-border">
              {sorted.slice(0, 30).map((c) => (
                <HistoryRow key={c.id} entry={c} isToday={c.date === today} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function scoreTone(score: number): string {
  if (score >= 67) return "border-success/40 text-success";
  if (score >= 40) return "border-warning/40 text-warning";
  return "border-destructive/40 text-destructive";
}

function HistoryRow({ entry, isToday }: { entry: CheckIn; isToday: boolean }) {
  const score = wellbeingScore(entry.metrics);
  const reflection = entry.wentWell || entry.learned || entry.note || entry.wentBad;
  const noteCount = entry.metricNotes ? Object.keys(entry.metricNotes).length : 0;
  return (
    <li className="group flex items-start gap-3 py-3">
      {score !== null ? (
        <div className={cn("flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border bg-card", scoreTone(score))}>
          <span className="text-sm font-bold leading-none tabular-nums">{score}</span>
        </div>
      ) : (
        <div className="h-11 w-11 shrink-0 rounded-lg border border-border" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{formatDate(parseISO(entry.date), "EEE, d. MMM yyyy")}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), "HH:mm")}</span>
          {isToday && <Badge className="border-primary/40 text-primary">heute</Badge>}
          {noteCount > 0 && (
            <Badge className="gap-1 text-muted-foreground">
              <MessageSquare size={11} /> {noteCount}
            </Badge>
          )}
          {(entry.tags ?? []).map((t) => (
            <Badge key={t} className="text-muted-foreground">{t}</Badge>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {SUMMARY_METRICS.map((id) => {
            const d = metricById(id);
            const v = entry.metrics?.[id];
            if (!d || v === undefined) return null;
            return (
              <span key={id}>
                {d.label} <span className="font-medium text-foreground">{formatMetricValue(d, v)}</span>
              </span>
            );
          })}
        </div>
        {reflection && <p className="mt-1 truncate text-sm text-foreground/80">{reflection}</p>}
      </div>
      <button
        onClick={() => confirm("Diesen Check-in löschen?") && checkinsRepo.remove(entry.id)}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Check-in löschen"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
