import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseISO } from "date-fns";
import { Activity, Bot, Brain, CalendarClock, Copy, Download, Lightbulb, LineChart, Smartphone, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { activity as activityRepo, checkins as checkinsRepo, events as eventsRepo, habitLogs as habitLogsRepo, profiles as profilesRepo, screenTime as screenTimeRepo, tasks as tasksRepo, transactions as txRepo } from "@/data/repo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { buildDataset, correlations, labelOf, lagLevers, leverInsights, rankedDays, screenInsights } from "./insights";
import { driverModel, pickOutcome, weekdayEffect, WEEKDAY_NAMES } from "./models";
import { WhatIfCard } from "./WhatIfCard";
import { buildAiExport, downloadAiExport } from "./aiExport";
import { useCustomMetrics } from "./useCustomMetrics";
import { usageSummary } from "./usage";
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
  const act = useLiveQuery(() => (accId ? activityRepo.list(accId) : []), [accId]) ?? [];
  const { active: customMetrics } = useCustomMetrics(accId);
  const coachTips = useCoach(accId);

  const rows = useMemo(() => buildDataset(checkins, habitLogs, txs, taskList, eventList, screen, undefined, act), [checkins, habitLogs, txs, taskList, eventList, screen, customMetrics, act]);
  const levers = useMemo(() => leverInsights(rows), [rows, customMetrics]);
  const lags = useMemo(() => lagLevers(rows), [rows, customMetrics]);
  const screenLevers = useMemo(() => screenInsights(rows), [rows]);
  const pairs = useMemo(() => correlations(rows).slice(0, 8), [rows, customMetrics]);
  const ranked = useMemo(() => rankedDays(rows), [rows]);
  const usage = useMemo(() => usageSummary(checkins, act), [checkins, act]);
  const outcome = useMemo(() => pickOutcome(rows), [rows]);
  const model = useMemo(() => (outcome ? driverModel(rows, outcome) : null), [rows, outcome, customMetrics]);
  const weekday = useMemo(() => (outcome ? weekdayEffect(rows, outcome) : null), [rows, outcome]);

  const enough = checkins.length >= MIN_CHECKINS;
  const best = ranked.slice(0, 3);
  const worst = ranked.length > 3 ? ranked.slice(-3).reverse() : [];

  const [copied, setCopied] = useState(false);
  const makeExport = () => buildAiExport(checkins, habitLogs, txs, taskList, eventList, screen, profile, act);
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

      {/* Nutzungsmuster: das gesammelte Verhalten sichtbar gemacht */}
      {usage.total > 0 && (
        <Card>
          <CardHeader title="Dein Nutzungsmuster" subtitle="Uhrzeiten, Häufigkeit & Gründlichkeit – wird gesammelt und mit ausgewertet." icon={<Activity size={18} />} />
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <UsageStat label="Typische Uhrzeit" value={usage.avgHour != null ? `${usage.avgHour}:00` : "–"} />
              <UsageStat label="Ø Gründlichkeit" value={usage.thoroughness != null ? `${usage.thoroughness} %` : "–"} />
              <UsageStat label="Einträge / Tag" value={usage.editsPerActiveDay != null ? `${usage.editsPerActiveDay}×` : "–"} />
              <UsageStat label="Aktive Tage (30 T.)" value={String(usage.activeDays30)} />
              <UsageStat label="App-Öffnungen (7 T.)" value={String(usage.opens7)} />
              <UsageStat label="Check-ins gesamt" value={String(usage.total)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Diese Verhaltens-Signale (Eintragszeit, Häufigkeit, Gründlichkeit, App-Nutzung) fließen automatisch in Muster, Coach und KI-Export ein – je mehr du nutzt, desto genauer.
            </p>
          </CardContent>
        </Card>
      )}

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

          {/* Treiber-Modell: unabhängige Treiber (um Störgrößen bereinigt) */}
          {model && model.drivers.length > 0 && (
            <Card>
              <CardHeader
                title="Treiber-Modell (bereinigt)"
                subtitle={`Was deine ${labelOf(model.outcome)} unabhängig antreibt – mehrere Faktoren zugleich gerechnet, nicht nur paarweise.`}
                icon={<Brain size={18} />}
                action={<Badge className="text-muted-foreground">erklärt {Math.round(model.r2 * 100)}%</Badge>}
              />
              <CardContent>
                <ul className="space-y-2">
                  {model.drivers.filter((d) => Math.abs(d.coef) >= 0.05).slice(0, 6).map((d) => {
                    const positive = d.coef > 0;
                    const strength = Math.min(100, Math.round(Math.abs(d.coef) / Math.max(...model.drivers.map((x) => Math.abs(x.coef))) * 100));
                    return (
                      <li key={d.id} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-sm font-medium">{labelOf(d.id)}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className={cn("h-full rounded-full", positive ? "bg-success" : "bg-destructive")} style={{ width: `${strength}%` }} />
                        </div>
                        <span className={cn("w-12 shrink-0 text-right text-xs font-semibold tabular-nums", positive ? "text-success" : "text-destructive")}>{signed1(d.coef)}</span>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-xs text-muted-foreground">
                    Grün treibt {labelOf(model.outcome)} hoch, rot runter – bereinigt um die anderen Faktoren (n={model.n}). Ein Modell, keine Gewissheit.
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Was-wäre-wenn-Simulator (nutzt das Treiber-Modell) */}
          {model && model.drivers.length > 0 && <WhatIfCard model={model} />}

          {/* Wochentag-Muster */}
          {weekday && (
            <Card>
              <CardHeader title="Wochentag-Muster" subtitle={`An welchen Wochentagen deine ${labelOf(weekday.outcome)} höher oder niedriger ist.`} icon={<CalendarClock size={18} />} />
              <CardContent>
                <div className="flex items-end gap-1.5">
                  {weekday.byDay.map((d) => {
                    const max = Math.max(...weekday.byDay.map((x) => x.mean));
                    const h = Math.max(8, Math.round((d.mean / max) * 72));
                    const isBest = d.day === weekday.best.day;
                    const isWorst = d.day === weekday.worst.day;
                    return (
                      <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] tabular-nums text-muted-foreground">{num1(d.mean)}</span>
                        <div className={cn("w-full rounded-t", isBest ? "bg-success" : isWorst ? "bg-destructive" : "bg-primary/40")} style={{ height: `${h}px` }} />
                        <span className="text-[11px] text-muted-foreground">{WEEKDAY_NAMES[d.day].slice(0, 2)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm">
                  Am <span className="font-semibold text-success">{WEEKDAY_NAMES[weekday.best.day]}</span> ist deine {labelOf(weekday.outcome)} am höchsten,
                  am <span className="font-semibold text-destructive">{WEEKDAY_NAMES[weekday.worst.day]}</span> am niedrigsten.
                </p>
              </CardContent>
            </Card>
          )}

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

          {/* Weitere Zusammenhänge – mit Belastbarkeit (Signifikanz) */}
          <Card>
            <CardHeader title="Weitere Zusammenhänge" subtitle="Kennzahlen, die bei dir zusammen auftreten – geprüft auf statistische Belastbarkeit." icon={<LineChart size={18} />} />
            <CardContent>
              {pairs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bisher kein klarer Zusammenhang erkennbar.</p>
              ) : (
                <ul className="space-y-2">
                  {pairs.map((c) => {
                    const positive = c.r > 0;
                    return (
                      <li key={`${c.a}-${c.b}`} className={cn("flex items-center gap-2 text-sm", !c.robust && "opacity-70")}>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", positive ? "bg-success" : "bg-destructive")} />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{labelOf(c.a)}</span>
                          {positive ? " ↔ " : " ↮ "}
                          <span className="font-medium">{labelOf(c.b)}</span>
                        </span>
                        <Badge className={cn("shrink-0", c.robust ? "border-success/40 text-success" : "border-border text-muted-foreground")}>
                          {c.robust ? "gesichert" : "unsicher"}
                        </Badge>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">r {c.r.toFixed(2)}, n {c.n}</span>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-xs text-muted-foreground">„Gesichert" = auch nach Korrektur für viele Vergleiche unwahrscheinlich Zufall (q&lt;0,1). „Unsicher" = braucht mehr Tage.</li>
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

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
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
