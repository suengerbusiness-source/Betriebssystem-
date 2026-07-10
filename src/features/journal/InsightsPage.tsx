import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseISO } from "date-fns";
import { Bot, Brain, CalendarClock, Copy, Download, Lightbulb, LineChart, Smartphone, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkins as checkinsRepo, events as eventsRepo, habitLogs as habitLogsRepo, profiles as profilesRepo, screenTime as screenTimeRepo, tasks as tasksRepo, transactions as txRepo } from "@/data/repo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { correlationStrength } from "./checkin.analysis";
import { buildDataset, correlations, labelOf, lagLevers, leverInsights, rankedDays, screenInsights } from "./insights";
import { buildAiExport, downloadAiExport } from "./aiExport";
import { useCustomMetrics } from "./useCustomMetrics";
import { CoachCard } from "@/features/coach/CoachCard";
import { useCoach } from "@/features/coach/useCoach";

/** Ab so vielen Check-ins lohnt sich die Auswertung. */
const MIN_CHECKINS = 6;

const num1 = (v: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
const signed1 = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${num1(Math.abs(v))}`;

export function InsightsPage() {
  const { account } = useAuth();
  const accId = account?.id;

  const checkins = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]) ?? [];
  const habitLogs = useLiveQuery(() => (accId ? habitLogsRepo.list(accId) : []), [accId]) ?? [];
  const txs = useLiveQuery(() => (accId ? txRepo.list(accId) : []), [accId]) ?? [];
  const taskList = useLiveQuery(() => (accId ? tasksRepo.list(accId) : []), [accId]) ?? [];
  const eventList = useLiveQuery(() => (accId ? eventsRepo.list(accId) : []), [accId]) ?? [];
  const screen = useLiveQuery(() => (accId ? screenTimeRepo.list(accId) : []), [accId]) ?? [];
  const profile = useLiveQuery(() => (accId ? profilesRepo.get(accId) : undefined), [accId]);
  const { active: customMetrics } = useCustomMetrics(accId);
  const coachTips = useCoach(accId);

  const rows = useMemo(() => buildDataset(checkins, habitLogs, txs, taskList, eventList, screen), [checkins, habitLogs, txs, taskList, eventList, screen, customMetrics]);
  const levers = useMemo(() => leverInsights(rows), [rows, customMetrics]);
  const lags = useMemo(() => lagLevers(rows), [rows, customMetrics]);
  const screenLevers = useMemo(() => screenInsights(rows), [rows]);
  const pairs = useMemo(() => correlations(rows).slice(0, 8), [rows, customMetrics]);
  const ranked = useMemo(() => rankedDays(rows), [rows]);

  const enough = checkins.length >= MIN_CHECKINS;
  const best = ranked.slice(0, 3);
  const worst = ranked.length > 3 ? ranked.slice(-3).reverse() : [];

  const [copied, setCopied] = useState(false);
  const makeExport = () => buildAiExport(checkins, habitLogs, txs, taskList, eventList, screen, profile);
  async function copyExport() {
    try {
      await navigator.clipboard.writeText(makeExport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      downloadAiExport(makeExport()); // Fallback, falls Zwischenablage blockiert
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Erkenntnisse"
        subtitle="Was deine guten Tage ausmacht – aus Tagebuch, Gewohnheiten und Ausgaben automatisch erkannt."
        actions={<Badge className="text-muted-foreground">{checkins.length} Check-ins</Badge>}
      />

      <CoachCard tips={coachTips} limit={5} title="Automatische Hinweise" subtitle="Was die Engine gerade erkennt – Warnungen, Muster und Chancen." />

      {!enough ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<Brain size={22} />}
              title="Sammelt sich gerade an"
              description={`Noch ${Math.max(MIN_CHECKINS - checkins.length, 0)} Check-ins, dann erkenne ich deine persönlichen Muster – z. B. was deine Stimmung, Energie und Produktivität wirklich antreibt.`}
            />
            <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((checkins.length / MIN_CHECKINS) * 100, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stärkste Hebel – Klartext */}
          <Card>
            <CardHeader title="Deine stärksten Hebel" subtitle="An Tagen mit … war dein Ergebnis im Schnitt besser oder schlechter." icon={<Lightbulb size={18} />} />
            <CardContent>
              {levers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch kein deutlicher Effekt erkennbar – mit mehr Tagen werden die Hebel klarer.</p>
              ) : (
                <ul className="space-y-2.5">
                  {levers.map((l) => {
                    const positive = l.delta > 0;
                    return (
                      <li key={`${l.outcome}-${l.driver}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                          {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-relaxed">
                          Wenn <span className="font-semibold">{labelOf(l.driver)}</span> hoch war, war deine{" "}
                          <span className="font-semibold">{labelOf(l.outcome)}</span> im Schnitt{" "}
                          <span className={cn("font-semibold", positive ? "text-success" : "text-destructive")}>{signed1(l.delta)}</span>{" "}
                          <span className="text-muted-foreground">({num1(l.highMean)} statt {num1(l.lowMean)} · {l.n} Tage)</span>
                        </p>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-xs text-muted-foreground">Zusammenhang ist kein Beweis für Ursache – aber ein guter Hinweis, was du ausprobieren kannst.</li>
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Gestern → heute: zeitversetzte Zusammenhänge */}
          {lags.length > 0 && (
            <Card>
              <CardHeader title="Gestern → heute" subtitle="Wie der gestrige Tag deinen heutigen beeinflusst hat." icon={<CalendarClock size={18} />} />
              <CardContent>
                <ul className="space-y-2.5">
                  {lags.map((l) => {
                    const positive = l.delta > 0;
                    return (
                      <li key={`lag-${l.outcome}-${l.driver}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                          {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-relaxed">
                          {l.boolDriver ? (
                            <>Am Tag nach <span className="font-semibold">{labelOf(l.driver)}: Ja</span> war deine{" "}</>
                          ) : (
                            <>Am Tag nach hohem <span className="font-semibold">{labelOf(l.driver)}</span> war deine{" "}</>
                          )}
                          <span className="font-semibold">{labelOf(l.outcome)}</span> im Schnitt{" "}
                          <span className={cn("font-semibold", positive ? "text-success" : "text-destructive")}>{signed1(l.delta)}</span>{" "}
                          <span className="text-muted-foreground">({num1(l.highMean)} statt {num1(l.lowMean)} · {l.n} Tage)</span>
                        </p>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-xs text-muted-foreground">Vergleicht die Folgetage: {"„Ja/hoch"}-Tage gegen {"„Nein/niedrig"}-Tage. Zusammenhang ist kein Beweis für Ursache.</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Bildschirmzeit & Social Media */}
          {screenLevers.length > 0 && (
            <Card>
              <CardHeader title="Bildschirmzeit & Social Media" subtitle="Wie viel Zeit am Handy – und wie viel davon Social Media – dich beeinflusst." icon={<Smartphone size={18} />} />
              <CardContent>
                <ul className="space-y-2.5">
                  {screenLevers.map((l) => {
                    const positive = l.delta > 0;
                    return (
                      <li key={`scr-${l.outcome}-${l.driver}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                          {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-relaxed">
                          An Tagen mit viel <span className="font-semibold">{labelOf(l.driver)}</span> war deine{" "}
                          <span className="font-semibold">{labelOf(l.outcome)}</span> im Schnitt{" "}
                          <span className={cn("font-semibold", positive ? "text-success" : "text-destructive")}>{signed1(l.delta)}</span>{" "}
                          <span className="text-muted-foreground">({num1(l.highMean)} statt {num1(l.lowMean)} · {l.n} Tage)</span>
                        </p>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-xs text-muted-foreground">Trag deine Bildschirmzeit (mit Social-Anteil) unter „Bildschirmzeit" ein – je mehr Tage, desto klarer.</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Beste vs. schwächste Tage */}
          {best.length > 0 && worst.length > 0 && (
            <Card>
              <CardHeader title="Beste vs. schwächste Tage" subtitle="Deine Hoch- und Tiefpunkte nach Wohlbefinden-Score." icon={<Sparkles size={18} />} />
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DayList title="Beste Tage" days={best} tone="success" />
                  <DayList title="Schwächste Tage" days={worst} tone="destructive" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weitere Zusammenhänge */}
          <Card>
            <CardHeader title="Weitere Zusammenhänge" subtitle="Kennzahlen, die bei dir zusammen auftreten." icon={<LineChart size={18} />} />
            <CardContent>
              {pairs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bisher kein klarer Zusammenhang erkennbar.</p>
              ) : (
                <ul className="space-y-2">
                  {pairs.map((c) => {
                    const positive = c.r > 0;
                    return (
                      <li key={`${c.a}-${c.b}`} className="flex items-center gap-2 text-sm">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", positive ? "bg-success" : "bg-destructive")} />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{labelOf(c.a)}</span>
                          {positive ? " ↔ " : " ↮ "}
                          <span className="font-medium">{labelOf(c.b)}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{correlationStrength(c.r)} {positive ? "Gleichlauf" : "Gegenlauf"} (r {c.r.toFixed(2)}, n {c.n})</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* KI-Export: Daten + fertiger Prompt zum Hochladen bei einer KI */}
      <Card>
        <CardHeader
          title="Für KI-Analyse exportieren"
          subtitle="Alle Tages-Einträge + fertiger Prompt in einer Datei – zum Hochladen bei ChatGPT, Claude & Co."
          icon={<Bot size={18} />}
          action={<Badge className="text-muted-foreground">{checkins.length} Tage</Badge>}
        />
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Die Datei beginnt mit einer Anleitung, die jeder KI erklärt, was die Daten bedeuten
            (Kennzahlen, Skalen, Richtung) und was sie analysieren soll. Danach folgen alle
            Tagesdaten, deine Tagebuch-Texte und die vorberechneten Zusammenhänge.
            Es wird nichts automatisch verschickt – du lädst die Datei selbst hoch.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadAiExport(makeExport())} disabled={checkins.length === 0}>
              <Download size={16} /> Als Datei herunterladen
            </Button>
            <Button variant="outline" onClick={copyExport} disabled={checkins.length === 0}>
              <Copy size={16} /> {copied ? "Kopiert ✓" : "In Zwischenablage kopieren"}
            </Button>
          </div>
          {checkins.length === 0 && (
            <p className="text-xs text-muted-foreground">Noch keine Check-ins vorhanden – mach zuerst einen Eintrag im Tagebuch.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DayList({ title, days, tone }: { title: string; days: { date: string; score: number }[]; tone: "success" | "destructive" }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1.5">
        {days.map((d) => (
          <li key={d.date} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <span className="text-sm">{formatDate(parseISO(d.date), "EEE, d. MMM yyyy")}</span>
            <Badge className={tone === "success" ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>{d.score}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
