import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Dumbbell, Flame, Moon, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkins as checkinsRepo, profiles as profilesRepo, screenTime as screenTimeRepo } from "@/data/repo";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { metricById } from "@/features/journal/checkin.metrics";
import { journalToday, targetStreak, wellbeingScore } from "@/features/journal/checkin.utils";
import { useCustomMetrics } from "@/features/journal/useCustomMetrics";
import { buildDataset, labelOf, leverInsights } from "@/features/journal/insights";
import { CoachCard } from "@/features/coach/CoachCard";
import { useCoach } from "@/features/coach/useCoach";
import { muscleTrend, weeklyMuscleLoad, weeklyTrainingVolume } from "./muscles";
import { forecast, profileTopics } from "./forecast";

const num1 = (v: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
const signed1 = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${num1(Math.abs(v))}`;

/** Treiber, die im Training-Bericht mit dem Wohlbefinden verknüpft werden. */
const REGEN_DRIVERS = new Set(["sleepHours", "sleepQuality", "caffeine", "screenPassive"]);

export function TrainingPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const checkins = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]) ?? [];
  const screen = useLiveQuery(() => (accId ? screenTimeRepo.list(accId) : []), [accId]) ?? [];
  const profile = useLiveQuery(() => (accId ? profilesRepo.get(accId) : undefined), [accId]);
  const { all, active } = useCustomMetrics(accId);
  const coachTips = useCoach(accId);

  const exercises = useMemo(() => all.filter((m) => !m.archived && m.kind === "count" && m.target != null), [all]);
  const muscleLoad = useMemo(() => weeklyMuscleLoad(checkins, all), [checkins, all]);
  const volume = useMemo(() => weeklyTrainingVolume(checkins, all), [checkins, all]);
  const trend = useMemo(() => muscleTrend(checkins, all), [checkins, all]);

  // metrics-Argument weglassen -> buildDataset nutzt activeMetrics() (eingebaute
  // + eigene). active bleibt in den Deps, damit neue Tracker neu berechnen.
  const rows = useMemo(() => buildDataset(checkins, [], [], [], [], screen), [checkins, screen, active]);

  // Training ↔ Wohlbefinden: Ø-Score an Trainingstagen vs. Ruhetagen.
  const trainedVsRest = useMemo(() => {
    const exIds = all.filter((m) => m.kind === "count" && ((m.muscles?.length ?? 0) > 0 || m.target != null)).map((m) => m.id);
    const trained: number[] = [];
    const rest: number[] = [];
    for (const c of checkins) {
      const s = wellbeingScore(c.metrics);
      if (s == null) continue;
      const didTrain = exIds.some((id) => (c.metrics?.[id] ?? 0) > 0);
      (didTrain ? trained : rest).push(s);
    }
    const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    if (trained.length < 2 || rest.length < 2) return null;
    return { trained: avg(trained), rest: avg(rest), delta: avg(trained) - avg(rest), nT: trained.length, nR: rest.length };
  }, [checkins, all]);

  const regenLevers = useMemo(() => {
    const customIds = new Set(active.filter((m) => m.custom).map((m) => m.id));
    return leverInsights(rows, {})
      .filter((l) => REGEN_DRIVERS.has(l.driver) || customIds.has(l.driver))
      .slice(0, 5);
  }, [rows, active]);

  const topics = useMemo(() => profileTopics(profile, active), [profile, active]);
  const predictions = useMemo(() => {
    const today = rows.find((r) => r.date === journalToday())?.values ?? {};
    return forecast(rows, today, { priority: topics });
  }, [rows, topics]);
  const hasProfile = Boolean(profile && (profile.about || profile.goals || profile.context || (profile.focus?.length ?? 0) > 0));

  if (exercises.length === 0 && muscleLoad.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Training" subtitle="Deine Übungen, Muskel-Auslastung, Level und Prognosen." />
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<Dumbbell size={22} />}
              title="Noch keine Übungen"
              description="Lege im Tagebuch unter Eigene Tracker Übungen mit Tagesziel an (z. B. Bizeps Curls, Ziel 100) – dann entstehen hier Level, Muskel-Graphen und Prognosen."
            />
            <div className="mt-4 flex justify-center">
              <Link to="/tagebuch" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Zum Tagebuch <ArrowRight size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training"
        subtitle="Muskel-Auslastung, Level-Aufstieg und wie dein Training mit deinem Befinden zusammenhängt."
        actions={<Badge className="gap-1.5 text-muted-foreground"><Activity size={14} /> {volume} Wdh diese Woche</Badge>}
      />

      <CoachCard tips={coachTips} categories={["training", "schlaf", "prognose", "muster"]} limit={3} subtitle="Automatische Hinweise zu Training, Schlaf & Prognose." />

      {/* Level & Ziele */}
      {exercises.length > 0 && (
        <Card>
          <CardHeader title="Level & Ziele" subtitle="Halte ein Ziel eine Woche – es steigt automatisch (Level-up)." icon={<Dumbbell size={18} />} />
          <CardContent>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {exercises.map((m) => {
                const streak = targetStreak(checkins, m.id, m.target!);
                const today = checkins.find((c) => c.date === journalToday())?.metrics?.[m.id] ?? 0;
                const pct = Math.min(100, Math.round((today / m.target!) * 100));
                const toNext = Math.max(0, 7 - streak);
                const Icon = metricById(m.id)?.icon ?? Dumbbell;
                return (
                  <li key={m.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.label}</span>
                      <Badge className="border-primary/40 text-primary">Level {m.level ?? 1}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div className={cn("h-full rounded-full transition-all", today >= m.target! ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{today}/{m.target} {m.unit}</span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {streak > 0 && <span className="flex items-center gap-1 font-medium text-warning"><Flame size={12} /> {streak}</span>}
                      {toNext === 0 ? <span className="font-medium text-success">Level-up bereit – Ziel steigt!</span> : <span>Noch {toNext} {toNext === 1 ? "Tag" : "Tage"} bis zum nächsten Level</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Muskel-Auslastung */}
      <Card>
        <CardHeader title="Muskel-Auslastung diese Woche" subtitle="Wie oft welche Muskelgruppe beansprucht wurde (Wiederholungen)." icon={<Activity size={18} />} />
        <CardContent>
          {muscleLoad.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Übung mit Muskelgruppen erfasst. Wähle beim Tracker die Muskelgruppen (oder nutze die Vorlagen wie Bizeps Curls).</p>
          ) : (
            <ul className="space-y-2.5">
              {muscleLoad.map((m) => (
                <li key={m.muscle} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm font-medium">{m.muscle}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all" style={{ width: `${Math.max(4, Math.round(m.share * 100))}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{m.reps} Wdh</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Wochen-Trend je Muskel (Heatmap) */}
      {trend.muscles.length > 0 && (
        <Card>
          <CardHeader title="Wochen-Trend je Muskel" subtitle="Wiederholungen je Muskelgruppe über die letzten Wochen – je dunkler, desto mehr." icon={<Activity size={18} />} />
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-xs">
                <thead>
                  <tr>
                    <th className="w-24 text-left font-medium text-muted-foreground"></th>
                    {trend.weeks.map((w, i) => (
                      <th key={w.weekStart} className="px-1 text-center font-medium text-muted-foreground">
                        {i === trend.weeks.length - 1 ? "Diese" : w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trend.muscles.map((m) => (
                    <tr key={m}>
                      <td className="pr-2 text-sm font-medium">{m}</td>
                      {trend.weeks.map((w) => {
                        const v = w.byMuscle[m] ?? 0;
                        const intensity = v / trend.max;
                        return (
                          <td key={w.weekStart} className="text-center">
                            <div
                              className="flex h-9 items-center justify-center rounded-md tabular-nums"
                              style={{
                                background: v === 0 ? "hsl(var(--secondary))" : `hsl(var(--primary) / ${0.15 + intensity * 0.75})`,
                                color: intensity > 0.5 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                              }}
                              title={`${m}, Woche ${w.label}: ${v} Wdh`}
                            >
                              {v || ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training ↔ Wohlbefinden */}
      {(trainedVsRest || regenLevers.length > 0) && (
        <Card>
          <CardHeader title="Training ↔ Befinden" subtitle="Wie Training, Schlaf, Koffein & Protein mit deinem Tagebuch-Score zusammenhängen." icon={<Moon size={18} />} />
          <CardContent className="space-y-3">
            {trainedVsRest && (
              <p className="text-sm leading-relaxed">
                An <span className="font-semibold">Trainingstagen</span> war dein Wohlbefinden im Schnitt{" "}
                <span className="font-semibold">{trainedVsRest.trained}</span>, an Ruhetagen{" "}
                <span className="font-semibold">{trainedVsRest.rest}</span>
                {trainedVsRest.delta !== 0 && <> – ein Unterschied von <span className={cn("font-semibold", trainedVsRest.delta > 0 ? "text-success" : "text-destructive")}>{trainedVsRest.delta > 0 ? "+" : ""}{trainedVsRest.delta}</span> Punkten</>}
                . <span className="text-muted-foreground">({trainedVsRest.nT} Trainings-, {trainedVsRest.nR} Ruhetage)</span>
              </p>
            )}
            {regenLevers.map((l) => {
              const positive = l.delta > 0;
              return (
                <div key={`${l.outcome}-${l.driver}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                    {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed">
                    An Tagen mit viel <span className="font-semibold">{labelOf(l.driver)}</span> war deine{" "}
                    <span className="font-semibold">{labelOf(l.outcome)}</span> im Schnitt{" "}
                    <span className={cn("font-semibold", positive ? "text-success" : "text-destructive")}>{signed1(l.delta)}</span>{" "}
                    <span className="text-muted-foreground">({num1(l.highMean)} statt {num1(l.lowMean)} · {l.n} Tage)</span>
                  </p>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">Alle Werte fließen auch in die <Link to="/erkenntnisse" className="text-primary hover:underline">Erkenntnisse</Link> und den KI-Export ein.</p>
          </CardContent>
        </Card>
      )}

      {/* Prognose (Palantir) – auf das Profil abgestimmt */}
      <Card>
        <CardHeader
          title="Prognose für morgen"
          subtitle="Aus deinen Mustern (gestern → heute) und den heutigen Werten – als Hypothese, nicht als Gewissheit."
          icon={<Sparkles size={18} />}
          action={hasProfile && profile?.focus?.length ? <Badge className="border-primary/40 text-primary">Fokus: {profile.focus.slice(0, 3).join(", ")}</Badge> : undefined}
        />
        <CardContent>
          {!hasProfile && (
            <p className="mb-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
              Tipp: Fülle dein <Link to="/profil" className="font-medium text-primary hover:underline">Profil</Link> aus (Ziele & Fokus) – dann stimmt die App die Prognose auf das ab, was dir wichtig ist.
            </p>
          )}
          {predictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch zu wenig Muster erkannt. Trage weiter täglich ein – je mehr Daten, desto klarer die Vorhersage.</p>
          ) : (
            <ul className="space-y-2.5">
              {predictions.map((p) => {
                const up = p.effect > 0;
                return (
                  <li key={`${p.outcome}-${p.driver}`} className={cn("flex items-start gap-3 rounded-lg border p-3", p.priority ? "border-primary/40 bg-primary/5" : "border-border")}>
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                      {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed">
                      Morgen wird deine <span className="font-semibold">{labelOf(p.outcome)}</span> voraussichtlich{" "}
                      <span className={cn("font-semibold", up ? "text-success" : "text-destructive")}>{up ? "höher" : "niedriger"}</span>{" "}
                      <span className="text-muted-foreground">– weil {p.todayHigh ? "viel" : "wenig"} {labelOf(p.driver)} heute (Ø-Effekt {signed1(p.effect)}, {p.n} Tage).</span>
                      {p.priority && <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">dein Fokus</span>}
                    </p>
                  </li>
                );
              })}
              <li className="pt-1 text-xs text-muted-foreground">
                {hasProfile ? "Auf dein Profil abgestimmt – Schwerpunkte zuerst. " : ""}
                Basiert auf Zusammenhängen, nicht auf Ursachen – nutze es als Frühwarnung, nicht als Schicksal.
              </li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
