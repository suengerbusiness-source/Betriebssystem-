import { useMemo } from "react";
import { CalendarClock, Coins, Eye, Film, Lightbulb, Pencil, Target, Users } from "lucide-react";
import {
  BUSINESS_TYPES,
  COMPANY_STATUS,
  CONTENT_STAGES,
  colorHex,
  type BusinessIdea,
  type Channel,
  type Company,
  type ContentItem,
  type Investment,
  type Transaction,
} from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { parseISO } from "date-fns";
import { platformOf } from "./company.platforms";
import { compactNumber, companyStats, ideaScore, stageCounts } from "./company.utils";

export function CompanyOverview({
  company,
  channels,
  content,
  investments,
  incomeTxs,
  ideas,
  monthKey,
  onEdit,
  onGoto,
}: {
  company: Company;
  channels: Channel[];
  content: ContentItem[];
  investments: Investment[];
  incomeTxs: Transaction[];
  ideas: BusinessIdea[];
  monthKey: string;
  onEdit: () => void;
  onGoto: (tab: string) => void;
}) {
  const stats = useMemo(() => companyStats(channels, content, investments, incomeTxs, ideas, monthKey), [channels, content, investments, incomeTxs, ideas, monthKey]);
  const stages = useMemo(() => stageCounts(content), [content]);
  const topChannels = [...channels].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)).slice(0, 5);
  const upcoming = useMemo(
    () =>
      content
        .filter((c) => c.stage === "scheduled" && c.publishDate)
        .sort((a, b) => (a.publishDate ?? "").localeCompare(b.publishDate ?? ""))
        .slice(0, 4),
    [content],
  );
  const topIdeas = useMemo(
    () => ideas.filter((i) => i.status !== "done" && i.status !== "dropped").sort((a, b) => ideaScore(b) - ideaScore(a)).slice(0, 4),
    [ideas],
  );

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Follower gesamt" value={compactNumber(stats.followers)} icon={<Users size={18} />} hint={`${stats.channelsActive} aktive Kanäle`} />
        <StatTile label="Veröffentlicht" value={String(stats.published)} icon={<Film size={18} />} hint={`${stats.contentTotal} Content gesamt`} />
        <StatTile label="Aufrufe gesamt" value={compactNumber(stats.views)} icon={<Eye size={18} />} />
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
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{compactNumber(c.followers ?? 0)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top-Ideen */}
      {topIdeas.length > 0 && (
        <Card>
          <CardHeader title="Nächste Hebel" subtitle="Ideen mit dem besten Wirkung/Aufwand-Verhältnis" icon={<Lightbulb size={18} />} action={<Button variant="ghost" size="sm" onClick={() => onGoto("ideas")}>Alle</Button>} />
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {topIdeas.map((i) => (
                <li key={i.id} className={cn("inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm")}>
                  <Lightbulb size={13} className="text-warning" />
                  <span className="max-w-[14rem] truncate">{i.title}</span>
                  <span className="text-xs text-muted-foreground">W{i.impact ?? "–"}/A{i.effort ?? "–"}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
