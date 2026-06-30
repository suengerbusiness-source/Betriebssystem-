import { useMemo } from "react";
import { CalendarClock, Coins, FileText, Film, Pencil, Target, Users } from "lucide-react";
import {
  BUSINESS_TYPES,
  COMPANY_STATUS,
  CONTENT_STAGES,
  colorHex,
  type Channel,
  type Company,
  type CompanyNote,
  type ContentItem,
  type Investment,
  type Transaction,
} from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { parseISO } from "date-fns";
import { platformOf } from "./company.platforms";
import { compactNumber, companyStats, stageCounts } from "./company.utils";
import { useLiveStats } from "./useLiveStats";
import { followerBreakdown } from "./followers";

export function CompanyOverview({
  company,
  channels,
  content,
  investments,
  incomeTxs,
  notes,
  monthKey,
  onEdit,
  onGoto,
}: {
  company: Company;
  channels: Channel[];
  content: ContentItem[];
  investments: Investment[];
  incomeTxs: Transaction[];
  notes: CompanyNote[];
  monthKey: string;
  onEdit: () => void;
  onGoto: (tab: string) => void;
}) {
  const stats = useMemo(() => companyStats(channels, content, investments, incomeTxs, monthKey), [channels, content, investments, incomeTxs, monthKey]);
  const stages = useMemo(() => stageCounts(content), [content]);

  // Live-Daten + manuelle Kanäle – über den gemeinsamen Helfer (keine Doppelung).
  const live = useLiveStats();
  const { total: totalFollowers, items: allChannels } = useMemo(
    () => followerBreakdown(live.stats, channels),
    [live.stats, channels],
  );
  const topChannels = allChannels.slice(0, 5);
  const upcoming = useMemo(
    () =>
      content
        .filter((c) => c.stage === "scheduled" && c.publishDate)
        .sort((a, b) => (a.publishDate ?? "").localeCompare(b.publishDate ?? ""))
        .slice(0, 4),
    [content],
  );
  const recentNotes = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4), [notes]);

  const goalPct = company.revenueGoal ? Math.min(Math.round((stats.monthlyRevenue / company.revenueGoal) * 100), 100) : null;
  const accent = colorHex(company.color);

  return (
    <div className="space-y-5">
      {/* Firmenkopf */}
      <Card className="p-5" style={{ borderTop: `3px solid ${accent}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{company.name}</h2>
              <Badge style={{ borderColor: accent, color: accent }}>{BUSINESS_TYPES.find((t) => t.value === company.type)?.label}</Badge>
              <Badge className="text-muted-foreground">{COMPANY_STATUS.find((s) => s.value === company.status)?.label}</Badge>
              {company.niche && <Badge className="text-muted-foreground">{company.niche}</Badge>}
            </div>
            {company.tagline && <p className="mt-1 text-sm text-muted-foreground">{company.tagline}</p>}
            {company.vision && <p className="mt-2 max-w-2xl text-sm text-foreground/80"><span className="font-medium">Vision: </span>{company.vision}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil size={15} /> Bearbeiten</Button>
        </div>
      </Card>

      {/* Kennzahlen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Follower gesamt" value={compactNumber(totalFollowers)} icon={<Users size={18} />} hint={`${allChannels.length} Kanäle (Live + manuell)`} />
        <StatTile label="Veröffentlicht" value={String(stats.published)} icon={<Film size={18} />} hint={`${stats.contentTotal} Content gesamt`} />
        <StatTile label="Einnahmen / Monat" value={formatCurrency(stats.monthlyRevenue)} icon={<Coins size={18} />} tone="positive" hint={stats.plannedRevenue > 0 ? `+ ${formatCurrency(stats.plannedRevenue)} geplant` : `Invest: ${formatCurrency(stats.invested)}`} />
      </div>

      {/* Umsatzziel */}
      {goalPct !== null && (
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium"><Target size={16} /> Umsatzziel / Monat</span>
            <span className="tabular-nums text-muted-foreground">{formatCurrency(stats.monthlyRevenue)} / {formatCurrency(company.revenueGoal!)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full transition-all" style={{ width: `${goalPct}%`, background: accent }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{goalPct}% erreicht</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Content-Pipeline */}
        <Card>
          <CardHeader title="Content-Pipeline" subtitle="Wo dein Content gerade steht" icon={<Film size={18} />} action={<Button variant="ghost" size="sm" onClick={() => onGoto("content")}>Öffnen</Button>} />
          <CardContent>
            <div className="grid grid-cols-5 gap-2 text-center">
              {CONTENT_STAGES.map((s) => (
                <div key={s.value} className="rounded-lg bg-secondary/50 py-3">
                  <p className="text-xl font-bold tabular-nums">{stages[s.value] ?? 0}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {upcoming.length > 0 && (
              <ul className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Als Nächstes geplant</p>
                {upcoming.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <CalendarClock size={14} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.publishDate ? formatDate(parseISO(c.publishDate), "d. MMM") : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Kanäle */}
        <Card>
          <CardHeader title="Kanäle" subtitle="Deine Plattformen & Reichweite" icon={<Users size={18} />} action={<Button variant="ghost" size="sm" onClick={() => onGoto("channels")}>Öffnen</Button>} />
          <CardContent>
            {topChannels.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Noch keine Kanäle erfasst.</p>
            ) : (
              <ul className="space-y-2.5">
                {topChannels.map((c) => {
                  const p = platformOf(c.kind);
                  return (
                    <li key={c.id} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: p.color }}>
                        <p.icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                      <Badge className={c.live ? "border-success/40 text-success" : "text-muted-foreground"}>{c.live ? "live" : "offline"}</Badge>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{compactNumber(c.followers)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notizen */}
      {recentNotes.length > 0 && (
        <Card>
          <CardHeader title="Notizen" subtitle="Deine letzten Aufzeichnungen" icon={<FileText size={18} />} action={<Button variant="ghost" size="sm" onClick={() => onGoto("notes")}>Alle</Button>} />
          <CardContent>
            <ul className="space-y-2">
              {recentNotes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{n.title || "Ohne Titel"}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{n.body}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
