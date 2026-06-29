import { BarChart3, Layers, TrendingUp } from "lucide-react";
import type { Channel, PlatformKind } from "@/data/types";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { LiveStats } from "@/lib/liveStats";
import { PLATFORMS } from "./company.platforms";
import { compactNumber } from "./company.utils";
import {
  METRIC_LABELS,
  platformChange,
  totalChange,
  TRACKED_PLATFORMS,
  type HistorySnapshot,
  type Metric,
} from "./liveStatsHistory";

const METRICS: Metric[] = ["followers", "views", "likes", "videos"];

/** +/- Veränderung farbig; „—" wenn (noch) kein Vergleichswert vorliegt. */
function Delta({ value, className }: { value: number | null; className?: string }) {
  if (value == null) {
    return <span className={cn("text-muted-foreground/60", className)} title="Verlauf baut sich noch auf">—</span>;
  }
  if (value === 0) return <span className={cn("text-muted-foreground", className)}>±0</span>;
  return (
    <span className={cn("font-semibold tabular-nums", value > 0 ? "text-success" : "text-destructive", className)}>
      {value > 0 ? "+" : ""}
      {compactNumber(value)}
    </span>
  );
}

/**
 * Gesamtübersicht über alle Kanäle: Summe Follower/Aufrufe/… mit Veränderung
 * über 30 Tage und 1 Jahr. Follower zählen Live-Plattformen UND manuell
 * gepflegte (offline) Kanäle zusammen – ohne Doppelung bei live verbundenen.
 */
export function TotalsCard({ history, stats, channels }: { history: HistorySnapshot[]; stats: LiveStats | null; channels: Channel[] }) {
  const liveKinds = TRACKED_PLATFORMS.filter((k) => stats?.platforms[k]?.ok);
  const manualFollowers = channels.filter((c) => !liveKinds.includes(c.kind)).reduce((s, c) => s + (c.followers ?? 0), 0);

  const rows = METRICS.map((m) => {
    const change = totalChange(history, m);
    // Manuelle Follower zur aktuellen Gesamtsumme addieren (Verlauf bleibt live).
    if (m === "followers") {
      const current = (change.current ?? 0) + manualFollowers;
      return { metric: m, change: { ...change, current: current > 0 ? current : null } };
    }
    return { metric: m, change };
  }).filter((r) => r.change.current != null);
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Gesamt über alle Kanäle"
        subtitle="Summe der Live-Plattformen · Veränderung 30 Tage / 1 Jahr"
        icon={<TrendingUp size={18} />}
      />
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map(({ metric, change }) => (
            <div key={metric} className="rounded-xl border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{METRIC_LABELS[metric]}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{compactNumber(change.current ?? 0)}</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">30 Tage</span>
                <Delta value={change.d30} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">1 Jahr</span>
                <Delta value={change.d365} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Follower zählen Live- und manuell gepflegte (offline) Kanäle zusammen. Die Verlaufswerte (30 Tage / 1 Jahr)
          beziehen sich auf die automatisch erfassten Plattformen und bauen sich mit jedem Abruf (alle 12 h) auf –
          anfangs steht hier „—", bis genug Tage gesammelt sind.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Detaillierte Analyse je Live-Kanal: alle automatisch erfassten Kennzahlen,
 * sortiert, mit Veränderung über 30 Tage und 1 Jahr – bereit zum Auswerten.
 */
export function ChannelAnalysis({ stats, history, channels }: { stats: LiveStats | null; history: HistorySnapshot[]; channels: Channel[] }) {
  const live = TRACKED_PLATFORMS.filter((k) => stats?.platforms[k]?.ok);
  if (live.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Analyse je Kanal"
        subtitle="Alle automatisch durchkommenden Kennzahlen – einzeln zum Auswerten."
        icon={<BarChart3 size={18} />}
      />
      <CardContent className="space-y-4">
        {live.map((kind) => (
          <PlatformAnalysis
            key={kind}
            kind={kind}
            stats={stats!}
            history={history}
            channel={channels.find((c) => c.kind === kind)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PlatformAnalysis({
  kind,
  stats,
  history,
  channel,
}: {
  kind: PlatformKind;
  stats: LiveStats;
  history: HistorySnapshot[];
  channel?: Channel;
}) {
  const p = PLATFORMS[kind];
  const Icon = p.icon;
  const stat = stats.platforms[kind]!;
  const rows = METRICS.filter((m) => stat[m] != null);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: p.color }}>
          <Icon size={15} />
        </span>
        <span className="text-sm font-semibold">{channel?.name ?? p.label}</span>
        {channel?.handle && <span className="text-xs text-muted-foreground">{channel.handle}</span>}
        <Badge className="ml-auto border-success/40 text-success">live</Badge>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-1.5 text-left font-medium">Kennzahl</th>
            <th className="px-3 py-1.5 text-right font-medium">Aktuell</th>
            <th className="px-3 py-1.5 text-right font-medium">30 Tage</th>
            <th className="px-3 py-1.5 text-right font-medium">1 Jahr</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m} className="border-t border-border/60">
              <td className="px-3 py-2">{METRIC_LABELS[m]}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{compactNumber(stat[m] as number)}</td>
              <td className="px-3 py-2 text-right"><Delta value={platformChange(history, kind, m, 30)} /></td>
              <td className="px-3 py-2 text-right"><Delta value={platformChange(history, kind, m, 365)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Kleiner Hinweisblock, wenn noch keine Live-Plattform verbunden ist. */
export function NoLiveHint() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
      <Layers size={15} /> Gesamt- und Analyse-Ansichten erscheinen, sobald mindestens eine Plattform live verbunden ist.
    </div>
  );
}
