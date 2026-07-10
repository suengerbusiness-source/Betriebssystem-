import { addDays, format, parseISO } from "date-fns";
import type { ActivityLog, CalendarEvent, CheckIn, HabitLog, ScreenTimeLog, Task, Transaction } from "@/data/types";
import { activeMetrics, CHECKIN_METRICS, metricById, type MetricDescriptor } from "./checkin.metrics";
import { pearson } from "./checkin.analysis";
import { bhAdjust, corrPValue } from "./stats";

/*
  „Muster & Erkenntnisse" – wertet die Tagebuch-Daten zusammen mit verlässlich
  datierten Alltags-/Geld-Signalen aus und erzeugt KLARTEXT-Aussagen:
  „Wenn X hoch war, war Y im Schnitt +Z."

  Reine, testbare Funktionen ohne Oberfläche. Externe Signale (Gewohnheiten,
  Ausgaben) docken über buildDataset an – die Produktivität selbst kommt aus dem
  täglich selbst bewerteten Check-in (zuverlässiger als geschätzte Aufgaben-Tage).
*/

export interface SignalDescriptor {
  id: string;
  label: string;
  higherIsBetter: boolean;
  /** Menschlich lesbarer Wert. */
  format: (v: number) => string;
}

/** Zusätzliche, sicher tagesdatierte Signale neben den Check-in-Metriken. */
export const EXTRA_SIGNALS: SignalDescriptor[] = [
  { id: "tasksDone", label: "Erledigte Aufgaben", higherIsBetter: true, format: (v) => `${Math.round(v)}` },
  { id: "habitsDone", label: "Gewohnheiten erfüllt", higherIsBetter: true, format: (v) => `${Math.round(v)}` },
  { id: "eventsCancelled", label: "Abgesagte Termine", higherIsBetter: false, format: (v) => `${Math.round(v)}` },
  { id: "screenTotal", label: "Bildschirmzeit gesamt", higherIsBetter: false, format: (v) => `${Math.round(v)} min` },
  { id: "socialMin", label: "Social-Media-Minuten", higherIsBetter: false, format: (v) => `${Math.round(v)} min` },
  { id: "socialShare", label: "Social-Media-Anteil", higherIsBetter: false, format: (v) => `${Math.round(v)} %` },
  { id: "spending", label: "Ausgaben", higherIsBetter: false, format: (v) => `${Math.round(v)} €` },
  { id: "entryHour", label: "Eintragszeit", higherIsBetter: false, format: (v) => `${Math.round(v)} Uhr` },
  { id: "completeness", label: "Eintrag-Gründlichkeit", higherIsBetter: true, format: (v) => `${Math.round(v)} %` },
  { id: "logEdits", label: "Einträge pro Tag", higherIsBetter: true, format: (v) => `${Math.round(v)}×` },
  { id: "appOpens", label: "App-Öffnungen", higherIsBetter: true, format: (v) => `${Math.round(v)}×` },
];

/** Screen-Time-Signale (für die eigene „Bildschirmzeit"-Karte in Erkenntnissen). */
export const SCREEN_SIGNAL_IDS = ["socialMin", "screenTotal", "socialShare"] as const;

/** Die „Ergebnis"-Kennzahlen, die man verbessern möchte (alle 1–10-Skalen). */
export const OUTCOME_IDS = ["mood", "energy", "productivity", "focus", "meaning", "recovery"];

export interface DayRow {
  date: string;
  values: Record<string, number>;
}

export function buildDataset(
  checkins: CheckIn[],
  habitLogs: HabitLog[],
  txs: Transaction[],
  tasks: Task[] = [],
  events: CalendarEvent[] = [],
  screenTime: ScreenTimeLog[] = [],
  metrics: MetricDescriptor[] = activeMetrics(),
  activity: ActivityLog[] = [],
): DayRow[] {
  // Bildschirmzeit pro Tag (nur wo erfasst – fehlend = unbekannt, nicht 0):
  // Gesamt (iPhone+iPad), Social-Minuten und der Social-Anteil an der Gesamtzeit.
  const socialByDay = new Map<string, number>();
  const screenTotalByDay = new Map<string, number>();
  const socialShareByDay = new Map<string, number>();
  for (const s of screenTime) {
    const total = (s.iphoneMin ?? 0) + (s.ipadMin ?? 0);
    if (s.iphoneMin != null || s.ipadMin != null) screenTotalByDay.set(s.date, total);
    if (s.socialMin != null) socialByDay.set(s.date, s.socialMin);
    if (s.socialMin != null && total > 0) {
      socialShareByDay.set(s.date, Math.min(100, Math.round((s.socialMin / total) * 100)));
    }
  }
  const habitByDay = new Map<string, number>();
  for (const h of habitLogs) habitByDay.set(h.date, (habitByDay.get(h.date) ?? 0) + 1);

  const spendByDay = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || t.planned) continue;
    spendByDay.set(t.date, (spendByDay.get(t.date) ?? 0) + t.amount);
  }

  // Erledigte Aufgaben pro Tag (über den gepflegten Erledigungstag).
  const doneByDay = new Map<string, number>();
  for (const t of tasks) {
    if (!t.done || !t.completedAt) continue;
    doneByDay.set(t.completedAt, (doneByDay.get(t.completedAt) ?? 0) + 1);
  }

  // Abgesagte Termine pro Tag (über das Absage-Datum).
  const cancelledByDay = new Map<string, number>();
  for (const e of events) {
    if (!e.cancelled || !e.cancelledAt) continue;
    cancelledByDay.set(e.cancelledAt, (cancelledByDay.get(e.cancelledAt) ?? 0) + 1);
  }

  // Verhaltens-Signale aus dem Aktivitäts-Log: wie oft eingetragen/geöffnet.
  const editsByDay = new Map<string, number>();
  const opensByDay = new Map<string, number>();
  for (const a of activity) {
    const day = (typeof a.meta?.date === "string" && a.meta.date) || format(new Date(a.at), "yyyy-MM-dd");
    if (a.type === "checkin_save") editsByDay.set(day, (editsByDay.get(day) ?? 0) + 1);
    else if (a.type === "app_open") opensByDay.set(day, (opensByDay.get(day) ?? 0) + 1);
  }

  return checkins
    .map((c) => {
      const values: Record<string, number> = {};
      for (const m of metrics) {
        const v = c.metrics?.[m.id];
        if (v !== undefined && !Number.isNaN(v)) values[m.id] = v;
      }
      // Zähl-Signale: fehlender Tag = 0 (sonst keine Vergleichs-Varianz).
      // Konstante Null-Signale (nie genutzt) fallen über die Varianzprüfung weg.
      values.tasksDone = doneByDay.get(c.date) ?? 0;
      values.habitsDone = habitByDay.get(c.date) ?? 0;
      values.eventsCancelled = cancelledByDay.get(c.date) ?? 0;
      values.spending = spendByDay.get(c.date) ?? 0;
      // Eintragszeit: Wann wurde der Tag erfasst? (Stunde des ersten Speicherns.)
      // Fließt als Signal in die Analyse ein – z. B. „spät eingetragen → …".
      if (c.createdAt) values.entryHour = new Date(c.createdAt).getHours();
      // Gründlichkeit: Anteil beantworteter 1–10-Skalen.
      let scaleAnswered = 0;
      let scaleTotal = 0;
      for (const m of metrics) {
        if (m.kind !== "scale") continue;
        scaleTotal += 1;
        if (c.metrics?.[m.id] !== undefined) scaleAnswered += 1;
      }
      if (scaleTotal > 0) values.completeness = Math.round((scaleAnswered / scaleTotal) * 100);
      // Verhalten: wie oft an dem Tag eingetragen/geöffnet (nur wo erfasst).
      if (editsByDay.has(c.date)) values.logEdits = editsByDay.get(c.date)!;
      if (opensByDay.has(c.date)) values.appOpens = opensByDay.get(c.date)!;
      // Bildschirmzeit-Signale nur setzen, wenn an dem Tag erfasst (sonst unbekannt).
      if (socialByDay.has(c.date)) values.socialMin = socialByDay.get(c.date)!;
      if (screenTotalByDay.has(c.date)) values.screenTotal = screenTotalByDay.get(c.date)!;
      if (socialShareByDay.has(c.date)) values.socialShare = socialShareByDay.get(c.date)!;
      return { date: c.date, values };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function labelOf(id: string): string {
  return metricById(id)?.label ?? EXTRA_SIGNALS.find((s) => s.id === id)?.label ?? id;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export interface Lever {
  outcome: string;
  driver: string;
  /** Differenz des Ergebnis-Mittelwerts (hohe vs. niedrige Driver-Tage). */
  delta: number;
  highMean: number;
  lowMean: number;
  n: number;
}

/**
 * „Hebel": Für jedes Ergebnis (Stimmung, Energie, …) werden die Tage am Median
 * jedes möglichen Einflussfaktors in „hoch/niedrig" geteilt und die Ergebnis-
 * Mittelwerte verglichen. Liefert nur deutliche, gut belegte Effekte.
 */
export function leverInsights(
  rows: DayRow[],
  opts: { minSamples?: number; minDelta?: number } = {},
  metrics: MetricDescriptor[] = activeMetrics(),
): Lever[] {
  const minSamples = opts.minSamples ?? 6;
  const minDelta = opts.minDelta ?? 0.7; // auf der 1–10-Skala spürbar
  const driverIds = [...metrics.map((m) => m.id), ...EXTRA_SIGNALS.map((s) => s.id)];
  const out: Lever[] = [];

  for (const outcome of OUTCOME_IDS) {
    for (const driver of driverIds) {
      if (driver === outcome) continue;
      const pairs = rows
        .filter((r) => r.values[outcome] !== undefined && r.values[driver] !== undefined)
        .map((r) => ({ o: r.values[outcome], d: r.values[driver] }));
      if (pairs.length < minSamples) continue;

      const med = median(pairs.map((p) => p.d));
      const high = pairs.filter((p) => p.d > med).map((p) => p.o);
      const low = pairs.filter((p) => p.d < med).map((p) => p.o);
      if (high.length < 3 || low.length < 3) continue;

      const highMean = mean(high);
      const lowMean = mean(low);
      const delta = highMean - lowMean;
      if (Math.abs(delta) < minDelta) continue;
      out.push({ outcome, driver, delta, highMean, lowMean, n: pairs.length });
    }
  }

  // Stärkste Effekte zuerst, je Ergebnis höchstens 2 (Vielfalt statt Wiederholung).
  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const perOutcome = new Map<string, number>();
  const result: Lever[] = [];
  for (const l of out) {
    const c = perOutcome.get(l.outcome) ?? 0;
    if (c >= 2) continue;
    perOutcome.set(l.outcome, c + 1);
    result.push(l);
  }
  return result;
}

/**
 * Bildschirmzeit-Wirkung: Für die Screen-Time-Signale (Social-Minuten,
 * Gesamt-Bildschirmzeit, Social-Anteil) der Median-Split-Effekt auf die
 * Ergebnis-Kennzahlen – gezielt für die „Bildschirmzeit"-Karte. Etwas
 * niedrigere Schwellen als die allgemeinen Hebel, damit der Zusammenhang
 * früher sichtbar wird.
 */
export function screenInsights(rows: DayRow[], opts: { minSamples?: number; minDelta?: number } = {}): Lever[] {
  const minSamples = opts.minSamples ?? 5;
  const minDelta = opts.minDelta ?? 0.5;
  const out: Lever[] = [];
  for (const outcome of OUTCOME_IDS) {
    for (const driver of SCREEN_SIGNAL_IDS) {
      const pairs = rows
        .filter((r) => r.values[outcome] !== undefined && r.values[driver] !== undefined)
        .map((r) => ({ o: r.values[outcome], d: r.values[driver] }));
      if (pairs.length < minSamples) continue;
      const med = median(pairs.map((p) => p.d));
      const high = pairs.filter((p) => p.d > med).map((p) => p.o);
      const low = pairs.filter((p) => p.d < med).map((p) => p.o);
      if (high.length < 2 || low.length < 2) continue;
      const highMean = mean(high);
      const lowMean = mean(low);
      const delta = highMean - lowMean;
      if (Math.abs(delta) < minDelta) continue;
      out.push({ outcome, driver, delta, highMean, lowMean, n: pairs.length });
    }
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
}

export interface LagLever extends Lever {
  /** true = Driver ist ein Ja/Nein-Wert (Gruppierung „Ja" vs. „Nein"). */
  boolDriver: boolean;
}

/**
 * Zeitversetzte Hebel: Wie wirkt sich der GESTRIGE Wert eines Faktors auf das
 * HEUTIGE Ergebnis aus? („gestern X → heute Y"). Für Ja/Nein-Tracker wird nach
 * Ja/Nein gruppiert, sonst am Median. Nur aufeinanderfolgende Kalendertage
 * zählen als Paar (Lücken werden übersprungen).
 */
export function lagLevers(
  rows: DayRow[],
  opts: { minSamples?: number; minDelta?: number } = {},
  metrics: MetricDescriptor[] = activeMetrics(),
): LagLever[] {
  const minSamples = opts.minSamples ?? 6;
  const minDelta = opts.minDelta ?? 0.7;
  const byDate = new Map(rows.map((r) => [r.date, r.values]));
  const boolIds = new Set(metrics.filter((m) => m.kind === "bool").map((m) => m.id));
  const driverIds = [...metrics.map((m) => m.id), ...EXTRA_SIGNALS.map((s) => s.id)];
  const out: LagLever[] = [];

  for (const outcome of OUTCOME_IDS) {
    for (const driver of driverIds) {
      const pairs: { d: number; o: number }[] = [];
      for (const r of rows) {
        const d = r.values[driver];
        if (d === undefined) continue;
        const nextKey = format(addDays(parseISO(r.date), 1), "yyyy-MM-dd");
        const next = byDate.get(nextKey);
        const o = next?.[outcome];
        if (o === undefined) continue;
        pairs.push({ d, o });
      }
      if (pairs.length < minSamples) continue;

      const isBool = boolIds.has(driver);
      let high: number[];
      let low: number[];
      if (isBool) {
        high = pairs.filter((p) => p.d >= 1).map((p) => p.o); // „Ja"-Tage
        low = pairs.filter((p) => p.d < 1).map((p) => p.o); // „Nein"-Tage
      } else {
        const med = median(pairs.map((p) => p.d));
        high = pairs.filter((p) => p.d > med).map((p) => p.o);
        low = pairs.filter((p) => p.d < med).map((p) => p.o);
      }
      if (high.length < 3 || low.length < 3) continue;

      const highMean = mean(high);
      const lowMean = mean(low);
      const delta = highMean - lowMean;
      if (Math.abs(delta) < minDelta) continue;
      out.push({ outcome, driver, delta, highMean, lowMean, n: pairs.length, boolDriver: isBool });
    }
  }

  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const perOutcome = new Map<string, number>();
  const result: LagLever[] = [];
  for (const l of out) {
    const c = perOutcome.get(l.outcome) ?? 0;
    if (c >= 2) continue;
    perOutcome.set(l.outcome, c + 1);
    result.push(l);
  }
  return result;
}

export interface Pair {
  a: string;
  b: string;
  r: number;
  n: number;
  /** Zweiseitiger p-Wert. */
  p: number;
  /** Nach Mehrfachvergleichs-Korrektur (Benjamini-Hochberg). */
  q: number;
  /** true = statistisch belastbar (q < 0,1 und genug Daten). */
  robust: boolean;
}

/** Paarweise Korrelationen über den kombinierten Datensatz (inkl. Extra-Signale). */
export function correlations(
  rows: DayRow[],
  opts: { minSamples?: number; minAbsR?: number } = {},
  metrics: MetricDescriptor[] = activeMetrics(),
): Pair[] {
  const minSamples = opts.minSamples ?? 6;
  const minAbsR = opts.minAbsR ?? 0.35;
  const keys = [...metrics.map((m) => m.id), ...EXTRA_SIGNALS.map((s) => s.id)];
  const out: Pair[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of rows) {
        const va = r.values[keys[i]];
        const vb = r.values[keys[j]];
        if (va === undefined || vb === undefined) continue;
        xs.push(va);
        ys.push(vb);
      }
      if (xs.length < minSamples) continue;
      const r = pearson(xs, ys);
      if (r === null || Math.abs(r) < minAbsR) continue;
      out.push({ a: keys[i], b: keys[j], r, n: xs.length, p: corrPValue(r, xs.length), q: 1, robust: false });
    }
  }
  // Mehrfachvergleichs-Korrektur über alle getesteten Paare: q-Werte + Robustheit.
  const q = bhAdjust(out.map((o) => o.p));
  out.forEach((o, i) => { o.q = q[i]; o.robust = q[i] < 0.1 && o.n >= 8; });
  // Belastbare zuerst, dann nach Stärke.
  return out.sort((x, y) => Number(y.robust) - Number(x.robust) || Math.abs(y.r) - Math.abs(x.r));
}

export interface DayScore {
  date: string;
  score: number;
}

/** Bestätigte Tage nach Wohlbefinden-Score (für „beste/schwächste Tage"). */
export function rankedDays(rows: DayRow[]): DayScore[] {
  const scaleMetrics = CHECKIN_METRICS.filter((m) => m.kind === "scale");
  const scored: DayScore[] = [];
  for (const r of rows) {
    let sum = 0;
    let n = 0;
    for (const m of scaleMetrics) {
      const v = r.values[m.id];
      if (v === undefined) continue;
      const norm = m.higherIsBetter ? (v - m.min) / (m.max - m.min) : 1 - (v - m.min) / (m.max - m.min);
      sum += norm;
      n += 1;
    }
    if (n > 0) scored.push({ date: r.date, score: Math.round((sum / n) * 100) });
  }
  return scored.sort((a, b) => b.score - a.score);
}
