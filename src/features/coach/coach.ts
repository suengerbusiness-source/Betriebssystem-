import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ActivityLog, CheckIn, CustomMetric, ScreenTimeLog, UserProfile } from "@/data/types";
import { formatMetricValue, metricById, type MetricDescriptor } from "@/features/journal/checkin.metrics";
import { wellbeingScore } from "@/features/journal/checkin.utils";
import {
  buildDataset,
  EXTRA_SIGNALS,
  labelOf,
  leverInsights,
  type DayRow,
  type Lever,
} from "@/features/journal/insights";
import { forecast, profileTopics } from "@/features/training/forecast";

/*
  Coach-Engine: die „smarte" lokale Schicht. Aus den vorhandenen Daten und den
  bereits gelernten persönlichen Effekten (Hebel, zeitversetzte Muster, Prognose)
  leiten kleine, unabhängige Detektoren konkrete, begründete Hinweise ab –
  automatisch, sobald ein Problem (oder eine Chance) sichtbar wird.

  Jeder Detektor ist eine reine Funktion (Kontext -> Hinweise). Neue Regel = eine
  Funktion mehr in DETECTORS. Läuft komplett lokal.
*/

export type CoachSeverity = "alert" | "warn" | "info" | "good";
export type CoachCategory = "training" | "schlaf" | "konsum" | "prognose" | "muster" | "erfolg";

export interface CoachTip {
  id: string;
  severity: CoachSeverity;
  category: CoachCategory;
  title: string;
  /** Datengestützte Begründung. */
  message: string;
  /** Konkrete Empfehlung. */
  action?: string;
  /** Zielroute beim Antippen. */
  to?: string;
  /** Rang (höher = wichtiger). */
  score: number;
  /** Stabiler Typ-Schlüssel für das Lernen (über Tage/Subjekte hinweg). */
  learnKey: string;
}

const SEVERITY_WEIGHT: Record<CoachSeverity, number> = { alert: 400, warn: 300, info: 150, good: 120 };

/* ---------- kleine Statistik-Helfer ---------- */

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Werte einer Kennzahl in Datumsreihenfolge (nur vorhandene). */
function series(rows: DayRow[], id: string): { date: string; v: number }[] {
  return rows.filter((r) => r.values[id] !== undefined).map((r) => ({ date: r.date, v: r.values[id] }));
}

/** Menschlich lesbarer Wert einer Kennzahl/eines Signals. */
function fmt(id: string, v: number): string {
  const m = metricById(id);
  if (m) return formatMetricValue(m, m.kind === "scale" ? Math.round(v * 10) / 10 : Math.round(v));
  const s = EXTRA_SIGNALS.find((e) => e.id === id);
  if (s) return s.format(v);
  return String(Math.round(v));
}

/** Stärkstes gelerntes Ergebnis für einen Treiber (aus den Hebeln). */
function bestOutcomeFor(levers: Lever[], driver: string, sign: "pos" | "neg" | "any" = "any"): Lever | null {
  const cand = levers
    .filter((l) => l.driver === driver && (sign === "any" || (sign === "pos" ? l.delta > 0 : l.delta < 0)))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return cand[0] ?? null;
}

export interface CoachContext {
  today: string;
  rows: DayRow[];
  checkins: CheckIn[];
  metrics: MetricDescriptor[];
  customAll: CustomMetric[];
  levers: Lever[];
  topics: Set<string>;
  /** Ø-Wohlbefinden an Trainings- vs. Ruhetagen (oder null). */
  trainedVsRest: { trained: number; rest: number; delta: number } | null;
  predictions: ReturnType<typeof forecast>;
}

/* ---------- Detektoren ---------- */

/** 1) Übung ausgelassen -> drohender Leistungsabfall. */
function detectSkippedExercise(ctx: CoachContext): CoachTip[] {
  const out: CoachTip[] = [];
  const doneByDate = (id: string) => ctx.checkins.filter((c) => (c.metrics?.[id] ?? 0) > 0).map((c) => c.date).sort();
  for (const ex of ctx.customAll) {
    if (ex.archived || ex.kind !== "count" || ex.target == null) continue;
    const days = doneByDate(ex.id);
    if (days.length === 0) continue; // nie begonnen -> kein „ausgelassen"
    const last = days[days.length - 1];
    const missed = differenceInCalendarDays(parseISO(`${ctx.today}T12:00:00`), parseISO(`${last}T12:00:00`));
    if (missed < 2) continue;
    const benefit = ctx.trainedVsRest && ctx.trainedVsRest.delta > 0 ? ctx.trainedVsRest.delta : null;
    out.push({
      id: `skip-${ex.id}`,
      learnKey: "training-skip",
      severity: missed >= 4 ? "alert" : "warn",
      category: "training",
      title: `${ex.label} seit ${missed} Tagen ausgelassen`,
      message: benefit != null
        ? `An Trainingstagen war dein Wohlbefinden im Schnitt +${benefit} Punkte. Fällt das Training aus, sacken Energie & Antrieb erfahrungsgemäß nach ein paar Tagen ab.`
        : `Kontinuität hält dein Level – je länger die Pause, desto schwerer der Wiedereinstieg.`,
      action: `Heute ${ex.target}${ex.unit ? " " + ex.unit : ""} ${ex.label} nachholen.`,
      to: "/tagebuch",
      score: SEVERITY_WEIGHT[missed >= 4 ? "alert" : "warn"] + missed * 5 + (benefit ?? 0),
    });
  }
  return out;
}

/** 2) „Schlechter" Treiber steigt (Social, Stress, Koffein) + gelernter Negativ-Effekt. */
function detectRisingBadDriver(ctx: CoachContext): CoachTip[] {
  const out: CoachTip[] = [];
  const DRIVERS: { id: string; cat: CoachCategory; minAbs: number }[] = [
    { id: "socialMin", cat: "konsum", minAbs: 20 },
    { id: "screenTotal", cat: "konsum", minAbs: 40 },
    { id: "stress", cat: "muster", minAbs: 1 },
    { id: "caffeine", cat: "muster", minAbs: 1 },
  ];
  for (const d of DRIVERS) {
    const s = series(ctx.rows, d.id);
    if (s.length < 6) continue;
    const base = mean(s.map((x) => x.v));
    const recent = mean(s.slice(-3).map((x) => x.v));
    if (recent < base * 1.2 || recent - base < d.minAbs) continue;
    const eff = bestOutcomeFor(ctx.levers, d.id, "neg");
    if (!eff) continue;
    out.push({
      id: `rise-${d.id}`,
      learnKey: `rise-${d.id}`,
      severity: "warn",
      category: d.cat,
      title: `${labelOf(d.id)} steigt`,
      message: `Zuletzt Ø ${fmt(d.id, recent)} statt ${fmt(d.id, base)} (dein Schnitt). An solchen Tagen war deine ${labelOf(eff.outcome)} im Schnitt ${eff.delta.toFixed(1)}.`,
      action: `Bewusst gegensteuern und ${labelOf(d.id)} wieder senken.`,
      to: d.id === "socialMin" || d.id === "screenTotal" ? "/bildschirmzeit" : "/erkenntnisse",
      score: SEVERITY_WEIGHT.warn + Math.abs(eff.delta) * 10 + (recent - base),
    });
  }
  return out;
}

/** 3) Schlafmangel gegenüber dem persönlichen Schnitt. */
function detectSleepDebt(ctx: CoachContext): CoachTip[] {
  const s = series(ctx.rows, "sleepHours");
  if (s.length < 6) return [];
  const base = mean(s.map((x) => x.v));
  const recent = mean(s.slice(-3).map((x) => x.v));
  if (recent > base - 0.8) return [];
  const eff = bestOutcomeFor(ctx.levers, "sleepHours", "pos") ?? bestOutcomeFor(ctx.levers, "sleepQuality", "pos");
  const because = eff ? ` Schlaf treibt bei dir ${labelOf(eff.outcome)} (+${eff.delta.toFixed(1)}).` : "";
  return [{
    id: "sleep-debt",
    learnKey: "sleep-debt",
    severity: recent < base - 1.5 ? "alert" : "warn",
    category: "schlaf",
    title: "Schlafdefizit zuletzt",
    message: `Du schläfst gerade weniger: Ø ${recent.toFixed(1)} h statt ${base.toFixed(1)} h.${because}`,
    action: "Heute bewusst früher ins Bett – Schlaf zuerst.",
    to: "/tagebuch",
    score: SEVERITY_WEIGHT[recent < base - 1.5 ? "alert" : "warn"] + (base - recent) * 20,
  }];
}

/** 4) Prognose-Frühwarnung: starke negative Vorhersage für morgen. */
function detectForecastWarning(ctx: CoachContext): CoachTip[] {
  const worst = ctx.predictions.filter((p) => p.effect <= -1).sort((a, b) => a.effect - b.effect)[0];
  if (!worst) return [];
  return [{
    id: `forecast-${worst.outcome}`,
    learnKey: "forecast",
    severity: "warn",
    category: "prognose",
    title: `Frühwarnung: ${labelOf(worst.outcome)} morgen`,
    message: `Dein heutiges Muster deutet auf morgen niedrigere ${labelOf(worst.outcome)} (Ø ${worst.effect.toFixed(1)}) – weil ${worst.todayHigh ? "viel" : "wenig"} ${labelOf(worst.driver)} heute.`,
    action: worst.todayHigh ? `${labelOf(worst.driver)} heute noch reduzieren.` : `Für mehr ${labelOf(worst.driver)} heute sorgen.`,
    to: "/training",
    score: SEVERITY_WEIGHT.warn + Math.abs(worst.effect) * 15 + (ctx.topics.has(worst.outcome) ? 50 : 0),
  }];
}

/** 5) Persönliche Bestwoche eines Ergebnisses -> festhalten. */
function detectBestWeek(ctx: CoachContext): CoachTip[] {
  const scored = ctx.rows.map((r) => ({ date: r.date, s: wellbeingScore(r.values) })).filter((x): x is { date: string; s: number } => x.s != null);
  if (scored.length < 12) return [];
  const last7 = scored.slice(-7);
  if (last7.length < 5) return [];
  const cur = mean(last7.map((x) => x.s));
  // bestes zurückliegendes 7-Tage-Fenster (vor den letzten 7 Tagen)
  let bestPrev = -Infinity;
  for (let i = 0; i + 7 <= scored.length - 7; i++) bestPrev = Math.max(bestPrev, mean(scored.slice(i, i + 7).map((x) => x.s)));
  if (!(cur > bestPrev) || bestPrev === -Infinity) return [];
  return [{
    id: "best-week",
    learnKey: "best-week",
    severity: "good",
    category: "erfolg",
    title: "Deine bisher beste Woche",
    message: `Dein Wohlbefinden liegt im 7-Tage-Schnitt bei ${Math.round(cur)} – so hoch wie nie. Irgendwas läuft gerade richtig.`,
    action: "Kurz festhalten, was du diese Woche anders gemacht hast.",
    to: "/tagebuch",
    score: SEVERITY_WEIGHT.good + (cur - bestPrev) * 5,
  }];
}

/** 7) Eintragszeit: häufig spät eingecheckt -> Zusammenhang mit dem Befinden. */
function detectLateEntries(ctx: CoachContext): CoachTip[] {
  const isLate = (c: CheckIn) => { const h = new Date(c.createdAt).getHours(); return h >= 23 || h <= 3; };
  const recent = [...ctx.checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  if (recent.length < 4) return [];
  const lateCount = recent.filter(isLate).length;
  if (lateCount < 3) return [];

  const late = ctx.checkins.filter(isLate).map((c) => wellbeingScore(c.metrics)).filter((s): s is number => s != null);
  const early = ctx.checkins.filter((c) => !isLate(c)).map((c) => wellbeingScore(c.metrics)).filter((s): s is number => s != null);
  const compare = late.length >= 3 && early.length >= 3 ? { l: Math.round(mean(late)), e: Math.round(mean(early)) } : null;
  const worse = compare && compare.e - compare.l >= 3;

  return [{
    id: "late-entry",
    learnKey: "late-entry",
    severity: worse ? "warn" : "info",
    category: "muster",
    title: "Du trägst oft spät ein",
    message: compare
      ? `Zuletzt ${lateCount}× nach 23 Uhr eingecheckt. An Tagen mit spätem Eintrag war dein Wohlbefinden Ø ${compare.l} statt ${compare.e} an früheren Tagen.`
      : `Zuletzt ${lateCount}× nach 23 Uhr eingecheckt – späte Nächte gehen oft mit weniger Erholung einher.`,
    action: "Den Tag früher am Abend reflektieren – kürzer, aber verlässlicher.",
    to: "/tagebuch",
    score: SEVERITY_WEIGHT[worse ? "warn" : "info"] + lateCount * 4 + (compare ? compare.e - compare.l : 0),
  }];
}

/** 6) Stärkster Hebel als bewusst nutzbarer Tipp. */
function detectKeyLever(ctx: CoachContext): CoachTip[] {
  const l = ctx.levers.filter((x) => x.n >= 6).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  if (!l) return [];
  const positive = l.delta > 0;
  return [{
    id: `lever-${l.driver}-${l.outcome}`,
    learnKey: "key-lever",
    severity: "info",
    category: "muster",
    title: "Dein stärkster Hebel",
    message: `An Tagen mit ${positive ? "viel" : "wenig"} ${labelOf(l.driver)} war deine ${labelOf(l.outcome)} im Schnitt ${l.delta > 0 ? "+" : ""}${l.delta.toFixed(1)}.`,
    action: `${labelOf(l.driver)} gezielt ${positive ? "hoch" : "niedrig"} halten.`,
    to: "/erkenntnisse",
    score: SEVERITY_WEIGHT.info + Math.abs(l.delta) * 10 + (ctx.topics.has(l.driver) || ctx.topics.has(l.outcome) ? 40 : 0),
  }];
}

const DETECTORS = [
  detectSkippedExercise,
  detectRisingBadDriver,
  detectSleepDebt,
  detectForecastWarning,
  detectBestWeek,
  detectKeyLever,
  detectLateEntries,
];

/** Baut alle Coach-Hinweise aus den Rohdaten (rein & lokal). */
export function analyzeCoach(input: {
  today: string;
  checkins: CheckIn[];
  metrics: MetricDescriptor[];
  customAll: CustomMetric[];
  screen: ScreenTimeLog[];
  profile?: UserProfile;
  activity?: ActivityLog[];
}): CoachTip[] {
  const { today, checkins, metrics, customAll, screen, profile, activity = [] } = input;
  const rows = buildDataset(checkins, [], [], [], [], screen, metrics, activity);
  const levers = leverInsights(rows, {}, metrics);
  const topics = profileTopics(profile, metrics);
  const todayValues = rows.find((r) => r.date === today)?.values ?? {};
  const predictions = forecast(rows, todayValues, { priority: topics });

  // Trainingstage vs. Ruhetage (Ø-Wohlbefinden).
  const exIds = customAll.filter((m) => m.kind === "count" && ((m.muscles?.length ?? 0) > 0 || m.target != null)).map((m) => m.id);
  const trained: number[] = [];
  const rest: number[] = [];
  for (const c of checkins) {
    const s = wellbeingScore(c.metrics);
    if (s == null) continue;
    (exIds.some((id) => (c.metrics?.[id] ?? 0) > 0) ? trained : rest).push(s);
  }
  const trainedVsRest = trained.length >= 2 && rest.length >= 2
    ? { trained: Math.round(mean(trained)), rest: Math.round(mean(rest)), delta: Math.round(mean(trained) - mean(rest)) }
    : null;

  const ctx: CoachContext = { today, rows, checkins, metrics, customAll, levers, topics, trainedVsRest, predictions };

  const tips = DETECTORS.flatMap((d) => {
    try { return d(ctx); } catch { return []; }
  });
  return tips.sort((a, b) => b.score - a.score);
}

/** Kennzahl, wie viele „ungelöste" Warnungen es gibt (für Badges). */
export function coachAlertCount(tips: CoachTip[]): number {
  return tips.filter((t) => t.severity === "alert" || t.severity === "warn").length;
}
