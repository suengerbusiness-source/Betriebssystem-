import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format, parseISO } from "date-fns";
import { Brain, Candy, CheckCircle2, ChevronDown, Coffee, Droplet, FlaskConical, Footprints, Heart, Moon, Play, Smartphone, Sun, Target, Trash2, TrendingDown, TrendingUp, Wine, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkins as checkinsRepo, experiments as experimentsRepo, screenTime as screenTimeRepo } from "@/data/repo";
import type { Experiment } from "@/data/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildDataset, labelOf, leverInsights } from "@/features/journal/insights";
import { driverModel, pickOutcome } from "@/features/journal/models";
import { EXPERIMENT_CATEGORIES, EXPERIMENT_TEMPLATES, type ExperimentTemplate } from "./templates";
import { suggestExperiments } from "./suggest";
import { analyzeExperiment } from "./analyze";
import { ExperimentDebriefModal } from "./ExperimentDebriefModal";

const ICONS: Record<string, LucideIcon> = { smartphone: Smartphone, candy: Candy, droplet: Droplet, coffee: Coffee, footprints: Footprints, moon: Moon, heart: Heart, brain: Brain, target: Target, wine: Wine, sun: Sun };
const iconFor = (k: string): LucideIcon => ICONS[k] ?? FlaskConical;
const num1 = (v: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
const signed1 = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${num1(Math.abs(v))}`;

export function ExperimentsPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const list = useLiveQuery(() => (accId ? experimentsRepo.list(accId) : []), [accId]) ?? [];
  const checkins = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]) ?? [];
  const screen = useLiveQuery(() => (accId ? screenTimeRepo.list(accId) : []), [accId]) ?? [];

  const rows = useMemo(() => buildDataset(checkins, [], [], [], [], screen), [checkins, screen]);
  const model = useMemo(() => { const o = pickOutcome(rows); return o ? driverModel(rows, o) : null; }, [rows]);
  const levers = useMemo(() => leverInsights(rows), [rows]);

  const today = format(new Date(), "yyyy-MM-dd");
  const active = list.filter((e) => e.status === "active").sort((a, b) => a.endDate.localeCompare(b.endDate));
  const completed = list.filter((e) => e.status === "completed").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const usedTemplateIds = useMemo(() => new Set(list.map((e) => e.templateId).filter((x): x is string => Boolean(x))), [list]);
  const suggestions = useMemo(() => suggestExperiments(model, levers, usedTemplateIds), [model, levers, usedTemplateIds]);

  const [debriefFor, setDebriefFor] = useState<Experiment | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  async function start(t: ExperimentTemplate) {
    if (!accId) return;
    await experimentsRepo.create({
      accountId: accId, templateId: t.id, title: t.title, category: t.category,
      hypothesis: t.hypothesis, intervention: t.intervention, watchMetrics: t.watchMetrics,
      durationDays: t.durationDays, startDate: today, endDate: format(addDays(new Date(), t.durationDays - 1), "yyyy-MM-dd"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Experimente" subtitle="Strukturierte Selbstversuche – die App misst Vorher/Während und zieht belastbare Schlüsse." />

      {/* Laufende Experimente */}
      {active.map((e) => {
        const dur = Math.max(1, e.durationDays);
        const dayNum = Math.min(dur, Math.max(1, Math.round((parseISO(today).getTime() - parseISO(e.startDate).getTime()) / 86400000) + 1));
        const ended = today > e.endDate;
        const Icon = iconFor(EXPERIMENT_TEMPLATES.find((t) => t.id === e.templateId)?.icon ?? "");
        return (
          <Card key={e.id} className={cn(ended && "border-warning/40")}>
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{e.title}</p>
                    <Badge className="text-muted-foreground">{e.category}</Badge>
                    {ended && <Badge className="border-warning/40 text-warning">beendet – auswerten</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{e.intervention}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Tag {dayNum} von {dur}</span>
                      <span>bis {formatDate(parseISO(e.endDate), "EEE, d. MMM")}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className={cn("h-full rounded-full transition-all", ended ? "bg-warning" : "bg-primary")} style={{ width: `${Math.round((dayNum / dur) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setDebriefFor(e)}><CheckCircle2 size={15} /> Beenden & auswerten</Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Experiment abbrechen?") && experimentsRepo.abandon(e.id)}>Abbrechen</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Vorschläge aus deinen Daten */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader title="Für dich vorgeschlagen" subtitle="Aus deinen erkannten Treibern abgeleitet – das lohnt sich zu testen." icon={<FlaskConical size={18} />} />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {suggestions.map((t) => <TemplateCard key={t.id} t={t} onStart={() => start(t)} highlight />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bibliothek */}
      <Card>
        <CardHeader
          title="Experiment-Bibliothek"
          subtitle="Fest definierte Selbstversuche – wähle eins und starte."
          icon={<Play size={18} />}
          action={<Button size="sm" variant="outline" onClick={() => setShowLibrary((s) => !s)}>{showLibrary ? "Einklappen" : "Alle zeigen"} <ChevronDown size={15} className={cn("transition-transform", showLibrary && "rotate-180")} /></Button>}
        />
        {showLibrary && (
          <CardContent className="space-y-5">
            {EXPERIMENT_CATEGORIES.map((cat) => {
              const items = EXPERIMENT_TEMPLATES.filter((t) => t.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{cat}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {items.map((t) => <TemplateCard key={t.id} t={t} onStart={() => start(t)} />)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      {/* Abgeschlossene Experimente mit Auswertung */}
      <Card>
        <CardHeader title="Abgeschlossen & ausgewertet" subtitle="Was deine Experimente objektiv verändert haben (Vorher → Während)." icon={<CheckCircle2 size={18} />} />
        <CardContent>
          {completed.length === 0 ? (
            <EmptyState icon={<FlaskConical size={22} />} title="Noch keine Auswertung" description="Starte oben ein Experiment – nach dem Beenden erscheint hier die Vorher/Während-Analyse." />
          ) : (
            <ul className="space-y-4">
              {completed.map((e) => <CompletedExperiment key={e.id} exp={e} rows={rows} />)}
            </ul>
          )}
        </CardContent>
      </Card>

      <ExperimentDebriefModal open={!!debriefFor} experiment={debriefFor} onClose={() => setDebriefFor(null)} />
    </div>
  );
}

function TemplateCard({ t, onStart, highlight }: { t: ExperimentTemplate; onStart: () => void; highlight?: boolean }) {
  const Icon = iconFor(t.icon);
  return (
    <div className={cn("flex flex-col rounded-xl border p-3", highlight ? "border-primary/30 bg-primary/5" : "border-border")}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></span>
        <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">{t.title}</span>
      </div>
      <p className="mt-2 flex-1 text-xs text-muted-foreground">{t.hypothesis}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{t.durationDays === 1 ? "1 Tag" : `${t.durationDays} Tage`}</span>
        <Button size="sm" variant={highlight ? "primary" : "outline"} onClick={onStart}><Play size={14} /> Starten</Button>
      </div>
    </div>
  );
}

function CompletedExperiment({ exp, rows }: { exp: Experiment; rows: Parameters<typeof analyzeExperiment>[1] }) {
  const res = useMemo(() => analyzeExperiment(exp, rows), [exp, rows]);
  const top = res.effects.slice(0, 5);
  const d = exp.debrief;
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{exp.title}</p>
          <Badge className="text-muted-foreground">{exp.category}</Badge>
          {d?.wouldRepeat === true && <Badge className="border-success/40 text-success">beibehalten</Badge>}
        </div>
        <button onClick={() => confirm("Experiment löschen?") && experimentsRepo.remove(exp.id)} className="text-muted-foreground hover:text-destructive" aria-label="Löschen"><Trash2 size={15} /></button>
      </div>

      {top.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {top.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", f.improved ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                {f.improved ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              </span>
              <span className="min-w-0 flex-1"><span className="font-medium">{labelOf(f.id)}</span> <span className="text-muted-foreground">{num1(f.baseMean)} → {num1(f.expMean)}</span></span>
              <span className={cn("shrink-0 text-xs font-semibold tabular-nums", f.improved ? "text-success" : "text-destructive")}>{signed1(f.delta)}</span>
              <Badge className={cn("shrink-0", f.robust ? "border-success/40 text-success" : "border-border text-muted-foreground")}>{f.robust ? "gesichert" : "unsicher"}</Badge>
            </li>
          ))}
          <li className="pt-1 text-xs text-muted-foreground">Vergleich: {res.nExp} Tage währenddessen vs. {res.nBase} Tage davor.</li>
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Zu wenige Check-ins im Zeitraum für eine Auswertung – künftig mehr eintragen.</p>
      )}

      {d && (d.feeling || d.changes || d.overall) && (
        <div className="mt-3 space-y-1 rounded-lg bg-secondary/40 p-3 text-sm">
          {d.overall != null && <p><span className="text-muted-foreground">Gesamt:</span> {d.overall}/10{d.adherence != null ? ` · durchgezogen ${d.adherence}/10` : ""}</p>}
          {d.feeling && <p><span className="text-muted-foreground">Gefühlt:</span> {d.feeling}</p>}
          {d.changes && <p><span className="text-muted-foreground">Verändert:</span> {d.changes}</p>}
        </div>
      )}
    </li>
  );
}
