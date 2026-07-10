import type { ActivityLog, CalendarEvent, CheckIn, HabitLog, ScreenTimeLog, Task, Transaction, UserProfile } from "@/data/types";
import { activeMetrics, timeToClock, type MetricDescriptor } from "./checkin.metrics";
import { buildDataset, correlations, EXTRA_SIGNALS, labelOf, lagLevers, leverInsights } from "./insights";

/** Menschlich lesbarer Wertebereich einer Metrik (für die KI-Definition). */
function rangeLabel(m: MetricDescriptor): string {
  switch (m.kind) {
    case "scale": return `Skala ${m.min}–${m.max}`;
    case "hours": return "Stunden";
    case "minutes": return "Minuten";
    case "bool": return "Ja/Nein (1/0)";
    case "count": return m.unit ? `Anzahl (${m.unit})` : "Anzahl";
    case "number": return m.unit ? `Zahl (${m.unit})` : "Zahl";
    case "time": return m.anchorHour === 12 ? "Uhrzeit (Nacht, HH:MM)" : "Uhrzeit (HH:MM)";
    case "choice": return m.choices?.some((c) => c.score !== undefined) ? "Auswahl (ordinal)" : "Auswahl (Kategorie)";
    default: return `${m.min}–${m.max}`;
  }
}

/** CSV-Zellwert: Uhrzeiten als HH:MM, sonst die rohe Zahl. */
function cellValue(m: MetricDescriptor | undefined, v: number): string {
  return m?.kind === "time" ? timeToClock(m, v) : String(v);
}

/*
  KI-Export: verpackt alle Tages-Daten in EIN Markdown-Dokument, das der Nutzer
  selbst bei einer beliebigen KI (ChatGPT, Claude, …) hochladen kann. Beginnt
  mit einem Prompt, der der KI Kontext, Datenformat und Aufgabe erklärt.
  Läuft komplett lokal – nichts wird von der App aus verschickt.
*/

const fmtDate = () =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(Date.now());

export function buildAiExport(
  checkins: CheckIn[],
  habitLogs: HabitLog[],
  txs: Transaction[],
  tasks: Task[],
  events: CalendarEvent[],
  screenTime: ScreenTimeLog[],
  profile?: UserProfile,
  activity: ActivityLog[] = [],
): string {
  const metrics = activeMetrics();
  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const rows = buildDataset(checkins, habitLogs, txs, tasks, events, screenTime, metrics, activity);
  const metricIds = metrics.map((m) => m.id);
  const signalIds = EXTRA_SIGNALS.map((s) => s.id);
  const byDate = new Map(checkins.map((c) => [c.date, c]));

  const lines: string[] = [];

  /* ---------- 1) Prompt für die KI ---------- */
  lines.push(
    "# Life-OS – Persönlicher Datenexport für KI-Analyse",
    "",
    `Erstellt am ${fmtDate()} · ${rows.length} erfasste Tage`,
    "",
    "## Anleitung für dich (KI) – zuerst lesen",
    "",
    "Kontext: Diese Daten stammen aus Life-OS, dem persönlichen Tracking-System eines",
    "Social-Media-Unternehmers (TikTok/YouTube/Instagram). Er erfasst jeden Abend einen",
    "Check-in mit subjektiven Kennzahlen sowie automatische Tages-Signale.",
    "",
    "Deine Rolle: ein wissenschaftlich denkender, ehrlicher Gesundheits- und",
    "Produktivitäts-Coach. Sei konkret und direkt, kein Motivations-Geschwafel.",
    "",
    "Wichtige Regeln:",
    "- Korrelation ist keine Kausalität – formuliere Hypothesen, keine Gewissheiten.",
    "- Kennzahlen mit Richtung 'niedriger ist besser' (z. B. Stress, Social-Media-Minuten,",
    "  Ausgaben) bedeuten bei hohen Werten Belastung.",
    "- Leere Zellen = an dem Tag nicht erfasst (nicht als 0 interpretieren, außer bei den",
    "  Zähl-Signalen Aufgaben/Gewohnheiten/Absagen, die echte Nullen sind).",
    "",
    "Deine Aufgaben:",
    "1. Analysiere Muster und Zusammenhänge über die Tage (Wochentage, Trends, Ausreißer).",
    "2. Prüfe die von der App vorberechneten Zusammenhänge (unten) kritisch.",
    "3. Gib 3–5 konkrete, umsetzbare Empfehlungen für: Gesundheit/Wohlbefinden,",
    "   Produktivität und Social-Media-Konsum.",
    "4. Sag ehrlich, welche Daten fehlen und welches kleine Experiment (1–2 Wochen)",
    "   die wichtigste offene Frage klären würde.",
    "",
    "Antworte auf Deutsch.",
    "",
  );

  /* ---------- 1b) Profil / Vorwissen über die Person ---------- */
  if (profile && (profile.about || profile.goals || profile.context || profile.birthYear || profile.heightCm || profile.weightKg || (profile.focus?.length ?? 0) > 0)) {
    lines.push("## Über die Person (Profil)", "");
    if (profile.about) lines.push(`- Über mich: ${profile.about}`);
    if (profile.goals) lines.push(`- Ziele: ${profile.goals}`);
    if (profile.focus?.length) lines.push(`- Fokus-Bereiche: ${profile.focus.join(", ")}`);
    const body: string[] = [];
    if (profile.birthYear) body.push(`${new Date().getFullYear() - profile.birthYear} Jahre`);
    if (profile.sex) body.push(profile.sex === "m" ? "männlich" : profile.sex === "w" ? "weiblich" : "divers");
    if (profile.heightCm) body.push(`${profile.heightCm} cm`);
    if (profile.weightKg) body.push(`${profile.weightKg} kg`);
    if (profile.heightCm && profile.weightKg) body.push(`BMI ${(profile.weightKg / (profile.heightCm / 100) ** 2).toFixed(1)}`);
    if (body.length) lines.push(`- Körper: ${body.join(", ")}`);
    if (profile.context) lines.push(`- Weiteres: ${profile.context}`);
    lines.push("", "Nutze dieses Profil, um deine Analyse und Empfehlungen persönlich auf diese Person zuzuschneiden.", "");
  }

  /* ---------- 2) Kennzahlen-Definitionen ---------- */
  lines.push("## Kennzahlen-Definitionen", "");
  for (const m of metrics) {
    const eigen = m.custom ? " [eigener Tracker]" : "";
    lines.push(`- \`${m.id}\` = ${m.label} (${rangeLabel(m)}; Richtung: ${m.higherIsBetter ? "höher ist besser" : "niedriger ist besser"})${eigen} – ${m.prompt}`);
  }
  for (const s of EXTRA_SIGNALS) {
    lines.push(`- \`${s.id}\` = ${s.label} (Richtung: ${s.higherIsBetter ? "höher ist besser" : "niedriger ist besser"})`);
  }
  lines.push("", "Hinweis: `spending` ist die Tagessumme der Ausgaben in Euro (ohne Details).", "");

  /* ---------- 3) Tagesdaten als CSV ---------- */
  lines.push("## Tagesdaten (CSV, Semikolon-getrennt)", "", "```csv");
  lines.push(["datum", ...metricIds, ...signalIds].join(";"));
  for (const r of rows) {
    const cells = [r.date, ...[...metricIds, ...signalIds].map((id) => (r.values[id] !== undefined ? cellValue(metricById.get(id), r.values[id]) : ""))];
    lines.push(cells.join(";"));
  }
  lines.push("```", "");

  /* ---------- 4) Freitext-Einträge ---------- */
  const withText = rows
    .map((r) => byDate.get(r.date))
    .filter((c): c is CheckIn => Boolean(c && (c.wentWell || c.wentBad || c.learned || c.note || (c.tags?.length ?? 0) > 0 || Object.keys(c.metricNotes ?? {}).length > 0 || Object.keys(c.choices ?? {}).length > 0)));
  if (withText.length > 0) {
    lines.push("## Freitext-Einträge (Tagebuch)", "");
    for (const c of withText) {
      lines.push(`### ${c.date}`);
      if (c.wentWell) lines.push(`- Gut gelaufen: ${c.wentWell}`);
      if (c.wentBad) lines.push(`- Schlecht gelaufen: ${c.wentBad}`);
      if (c.learned) lines.push(`- Gelernt: ${c.learned}`);
      if (c.note) lines.push(`- Notiz: ${c.note}`);
      if (c.tags?.length) lines.push(`- Tags: ${c.tags.join(", ")}`);
      const picks = Object.entries(c.choices ?? {});
      if (picks.length) lines.push(`- Auswahl: ${picks.map(([id, label]) => `${labelOf(id)}: ${label}`).join(" · ")}`);
      const notes = Object.entries(c.metricNotes ?? {});
      if (notes.length) lines.push(`- Anmerkungen zu Kennzahlen: ${notes.map(([id, t]) => `${labelOf(id)}: „${t}"`).join(" · ")}`);
      lines.push("");
    }
  }

  /* ---------- 5) Vorberechnete Zusammenhänge ---------- */
  const levers = leverInsights(rows, {}, metrics);
  const lags = lagLevers(rows, {}, metrics);
  const pairs = correlations(rows, {}, metrics).slice(0, 10);
  if (levers.length > 0 || pairs.length > 0) {
    lines.push("## Von der App vorberechnete Zusammenhänge (bitte kritisch prüfen)", "");
    for (const l of levers) {
      lines.push(`- An Tagen mit hohem Wert von „${labelOf(l.driver)}" war „${labelOf(l.outcome)}" im Schnitt ${l.delta > 0 ? "+" : ""}${l.delta.toFixed(1)} (${l.highMean.toFixed(1)} statt ${l.lowMean.toFixed(1)}; n=${l.n}).`);
    }
    for (const p of pairs) {
      lines.push(`- Korrelation ${labelOf(p.a)} ↔ ${labelOf(p.b)}: r=${p.r.toFixed(2)} (n=${p.n}).`);
    }
    lines.push("");
  }
  if (lags.length > 0) {
    lines.push("## Zeitversetzte Zusammenhänge (Vortag → Folgetag)", "");
    for (const l of lags) {
      const grp = l.boolDriver ? `nach „${labelOf(l.driver)}: Ja"` : `nach hohem „${labelOf(l.driver)}"`;
      lines.push(`- Am Tag ${grp} war „${labelOf(l.outcome)}" im Schnitt ${l.delta > 0 ? "+" : ""}${l.delta.toFixed(1)} (${l.highMean.toFixed(1)} statt ${l.lowMean.toFixed(1)}; n=${l.n}).`);
    }
    lines.push("");
  }

  lines.push("---", "Ende des Exports. Beginne jetzt mit deiner Analyse gemäß der Anleitung oben.");
  return lines.join("\n");
}

/** Export als .md-Datei herunterladen (zum Hochladen bei einer KI). */
export function downloadAiExport(text: string): void {
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `life-os-ki-export-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
