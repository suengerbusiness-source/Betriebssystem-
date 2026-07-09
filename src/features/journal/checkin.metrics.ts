import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Apple,
  Ban,
  Banknote,
  BedDouble,
  BookOpen,
  Brain,
  Cigarette,
  CloudSun,
  Coffee,
  Compass,
  Droplet,
  Dumbbell,
  Flame,
  Focus,
  Heart,
  HeartPulse,
  Leaf,
  MapPin,
  Moon,
  Pill,
  Rocket,
  Smartphone,
  Smile,
  Star,
  Sunrise,
  Target,
  TrendingUp,
  Users,
  Video,
  Wine,
  Zap,
} from "lucide-react";
import type { CustomMetric } from "@/data/types";

/*
  Metrik-Registry des Tagebuchs.

  Zentrale, einzige Quelle der Wahrheit für die Tageskennzahlen. Jede Metrik
  beschreibt sich selbst (Skala, Richtung, Einheit, Icon, Gruppe). Gespeicherte
  Check-ins enthalten nur `metrics[id] = Wert` (und optional eine Begründung in
  `metricNotes[id]`). Eine neue Kennzahl ergänzen = ein Eintrag hier – Eingabe-
  maske und Analyse erkennen sie automatisch, ohne Schema-Migration.

  Die Auswahl orientiert sich an etablierten Dimensionen der Wohlbefindens- und
  Leistungsforschung: Affekt/Stimmung und Aktivierung (Energie), wahrgenommener
  Stress, Kognition (Fokus, Antrieb), körperliche Vitalität (Schlafqualität &
  -dauer, Bewegung, Ernährung, körperliches Befinden) sowie eudaimonische und
  soziale Faktoren (soziale Verbindung, Erholung, Wirksamkeit/Produktivität,
  Sinn/Zufriedenheit).
*/

export type MetricKind = "scale" | "hours" | "minutes" | "count" | "bool" | "time" | "number" | "choice";
export type MetricGroup = "Psyche & Kognition" | "Körper & Vitalität" | "Sinn & Soziales" | "Eigene Tracker";

/** Tageszeitpunkt, zu dem eine Kennzahl typischerweise erfasst wird. */
export type MetricPhase = "morning" | "day" | "evening";

/** Auswahl-Option für kind = "choice" (z. B. Wetter, Ort). */
export interface MetricChoice {
  value: string;
  label: string;
  /** Optionaler ordinaler Wert (für grobe Auswertung, z. B. Wetter 1–5). */
  score?: number;
}

/** Reihenfolge & Beschriftung der Tages-Abschnitte im Check-in. */
export const PHASES: { key: MetricPhase; label: string; hint: string }[] = [
  { key: "morning", label: "Morgens", hint: "Schlaf & Start in den Tag" },
  { key: "day", label: "Über den Tag", hint: "Was über den Tag passiert – fülle es, sobald es feststeht" },
  { key: "evening", label: "Abends – Bewertungen", hint: "Dein Rückblick auf den ganzen Tag" },
];

export interface MetricDescriptor {
  /** Stabiler Schlüssel (wird in CheckIn.metrics gespeichert). */
  id: string;
  label: string;
  /** Frage im Check-in. */
  prompt: string;
  kind: MetricKind;
  min: number;
  max: number;
  step: number;
  /** Vorschlagswert (nur für numerische Felder genutzt). */
  default: number;
  /** Höherer Wert = „besser"? Steuert Score-Richtung & Färbung. */
  higherIsBetter: boolean;
  icon: LucideIcon;
  group: MetricGroup;
  /** Tageszeit-Abschnitt im Check-in (Morgens/Tag/Abends). */
  phase?: MetricPhase;
  /** Anzeige-Einheit (z. B. „h", „min"). */
  unit?: string;
  /** Beschriftung der Skalenenden (nur bei kind = "scale"). */
  lowLabel?: string;
  highLabel?: string;
  /** Optionen für kind = "choice" (z. B. Wetter, Ort). */
  choices?: MetricChoice[];
  /** Tagesziel (count): ab diesem Wert zählt der Tag – baut eine Strähne auf. */
  target?: number;
  /** Zusätzlich ein Gewicht in kg erfassen (z. B. Kraftübungen). */
  trackWeight?: boolean;
  /** Für kind = "time": Anker-Stunde (0 = Mitternacht, 12 = Mittag) für stetige
   *  Werte über Mitternacht hinweg (z. B. Einschlafzeit). */
  anchorHour?: number;
  /** true = nutzerdefinierter Tracker (aus CustomMetric erzeugt). */
  custom?: boolean;
}

/** Standard-Tageszeit je Kennzahl (wenn nicht explizit gesetzt). */
const DEFAULT_PHASE: Record<string, MetricPhase> = {
  sleepQuality: "morning",
  sleepHours: "morning",
  sport: "day",
  nutrition: "day",
};

/** Tageszeit-Abschnitt einer Kennzahl (Fallback: Abend-Bewertung). */
export function metricPhase(m: MetricDescriptor): MetricPhase {
  return m.phase ?? DEFAULT_PHASE[m.id] ?? "evening";
}

const SCALE = { kind: "scale" as const, min: 1, max: 10, step: 1, default: 5 };

export const CHECKIN_METRICS: MetricDescriptor[] = [
  /* --- Psyche & Kognition --- */
  {
    ...SCALE,
    id: "mood",
    label: "Stimmung",
    prompt: "Wie war deine emotionale Grundstimmung?",
    higherIsBetter: true,
    icon: Smile,
    group: "Psyche & Kognition",
    lowLabel: "sehr negativ",
    highLabel: "sehr positiv",
  },
  {
    ...SCALE,
    id: "energy",
    label: "Energie",
    prompt: "Wie hoch war dein körperlich-mentales Energielevel?",
    higherIsBetter: true,
    icon: Zap,
    group: "Psyche & Kognition",
    lowLabel: "erschöpft",
    highLabel: "voller Energie",
  },
  {
    ...SCALE,
    id: "stress",
    label: "Stress",
    prompt: "Wie stark war deine Stressbelastung?",
    higherIsBetter: false,
    icon: Activity,
    group: "Psyche & Kognition",
    lowLabel: "entspannt",
    highLabel: "überlastet",
  },
  {
    ...SCALE,
    id: "focus",
    label: "Fokus",
    prompt: "Wie klar und konzentriert konntest du arbeiten?",
    higherIsBetter: true,
    icon: Focus,
    group: "Psyche & Kognition",
    lowLabel: "zerstreut",
    highLabel: "glasklar",
  },
  {
    ...SCALE,
    id: "motivation",
    label: "Antrieb",
    prompt: "Wie stark war dein innerer Antrieb?",
    higherIsBetter: true,
    icon: Rocket,
    group: "Psyche & Kognition",
    lowLabel: "antriebslos",
    highLabel: "hoch motiviert",
  },

  /* --- Körper & Vitalität --- */
  {
    ...SCALE,
    id: "sleepQuality",
    label: "Schlafqualität",
    prompt: "Wie erholsam war dein Schlaf?",
    higherIsBetter: true,
    icon: Moon,
    group: "Körper & Vitalität",
    lowLabel: "unruhig",
    highLabel: "tief erholt",
  },
  {
    id: "sleepHours",
    label: "Schlafdauer",
    prompt: "Wie lange hast du geschlafen?",
    kind: "hours",
    min: 0,
    max: 14,
    step: 0.5,
    default: 7,
    higherIsBetter: true,
    icon: BedDouble,
    group: "Körper & Vitalität",
    unit: "h",
  },
  {
    id: "sport",
    label: "Bewegung",
    prompt: "Wie lange hast du dich bewegt / Sport gemacht?",
    kind: "minutes",
    min: 0,
    max: 240,
    step: 5,
    default: 0,
    higherIsBetter: true,
    icon: Dumbbell,
    group: "Körper & Vitalität",
    unit: "min",
  },
  {
    ...SCALE,
    id: "nutrition",
    label: "Ernährung",
    prompt: "Wie ausgewogen und nährstoffreich hast du gegessen?",
    higherIsBetter: true,
    icon: Apple,
    group: "Körper & Vitalität",
    lowLabel: "ungesund",
    highLabel: "sehr gesund",
  },
  {
    ...SCALE,
    id: "physical",
    label: "Körperliches Befinden",
    prompt: "Wie wohl hast du dich körperlich gefühlt (Schmerzen, Beschwerden)?",
    higherIsBetter: true,
    icon: HeartPulse,
    group: "Körper & Vitalität",
    lowLabel: "beschwerlich",
    highLabel: "top fit",
  },

  /* --- Sinn & Soziales --- */
  {
    ...SCALE,
    id: "social",
    label: "Soziale Verbindung",
    prompt: "Wie verbunden hast du dich mit anderen gefühlt?",
    higherIsBetter: true,
    icon: Users,
    group: "Sinn & Soziales",
    lowLabel: "isoliert",
    highLabel: "eng verbunden",
  },
  {
    ...SCALE,
    id: "recovery",
    label: "Erholung",
    prompt: "Wie gut konntest du abschalten und dich erholen?",
    higherIsBetter: true,
    icon: HeartPulse,
    group: "Sinn & Soziales",
    lowLabel: "angespannt",
    highLabel: "voll erholt",
  },
  {
    ...SCALE,
    id: "productivity",
    label: "Produktivität",
    prompt: "Wie produktiv und wirksam warst du?",
    higherIsBetter: true,
    icon: TrendingUp,
    group: "Sinn & Soziales",
    lowLabel: "Stillstand",
    highLabel: "im Flow",
  },
  {
    ...SCALE,
    id: "meaning",
    label: "Sinn & Zufriedenheit",
    prompt: "Wie sinnvoll und zufrieden war dein Tag insgesamt?",
    higherIsBetter: true,
    icon: Compass,
    group: "Sinn & Soziales",
    lowLabel: "leer",
    highLabel: "erfüllt",
  },

  /* --- Morgens: Schlafzeiten (nicht nur Dauer) --- */
  {
    id: "bedtime",
    label: "Einschlafzeit",
    prompt: "Wann bist du eingeschlafen?",
    kind: "time",
    anchorHour: 12, // ab Mittag stetig – auch nach Mitternacht
    min: 0, max: 1439, step: 5, default: 0,
    higherIsBetter: false, // später = tendenziell schlechter
    icon: Moon,
    group: "Körper & Vitalität",
    phase: "morning",
  },
  {
    id: "wakeTime",
    label: "Aufstehzeit",
    prompt: "Wann bist du aufgestanden?",
    kind: "time",
    anchorHour: 0,
    min: 0, max: 1439, step: 5, default: 0,
    higherIsBetter: false,
    icon: Sunrise,
    group: "Körper & Vitalität",
    phase: "morning",
  },

  /* --- Über den Tag: Konsum, Koffein, Geld, Wetter, Ort --- */
  {
    id: "screenPassive",
    label: "Passiver Konsum",
    prompt: "Wie lange passiv konsumiert (Social Media, Videos schauen)?",
    kind: "minutes",
    min: 0, max: 600, step: 10, default: 0,
    higherIsBetter: false,
    icon: Smartphone,
    group: "Körper & Vitalität",
    unit: "min",
    phase: "day",
  },
  {
    id: "screenProductive",
    label: "Video-Produktion",
    prompt: "Wie lange produktiv an Content gearbeitet (Drehen, Schneiden)?",
    kind: "minutes",
    min: 0, max: 600, step: 10, default: 0,
    higherIsBetter: true,
    icon: Video,
    group: "Sinn & Soziales",
    unit: "min",
    phase: "day",
  },
  {
    id: "caffeine",
    label: "Koffein",
    prompt: "Wie viele koffeinhaltige Getränke?",
    kind: "count",
    min: 0, max: 15, step: 1, default: 0,
    higherIsBetter: false,
    icon: Coffee,
    group: "Körper & Vitalität",
    unit: "Tassen",
    phase: "day",
  },
  {
    id: "earnedMoney",
    label: "Geld verdient",
    prompt: "Wie viel hast du heute verdient?",
    kind: "number",
    min: 0, max: 1_000_000, step: 1, default: 0,
    higherIsBetter: true,
    icon: Banknote,
    group: "Sinn & Soziales",
    unit: "€",
    phase: "day",
  },
  {
    id: "weather",
    label: "Wetter",
    prompt: "Wie war das Wetter?",
    kind: "choice",
    min: 1, max: 5, step: 1, default: 3,
    higherIsBetter: true,
    icon: CloudSun,
    group: "Körper & Vitalität",
    phase: "day",
    choices: [
      { value: "sonnig", label: "☀️ Sonnig", score: 5 },
      { value: "heiter", label: "🌤️ Heiter", score: 4 },
      { value: "bewoelkt", label: "☁️ Bewölkt", score: 3 },
      { value: "regen", label: "🌧️ Regen", score: 2 },
      { value: "sturm", label: "⛈️ Sturm/Schnee", score: 1 },
    ],
  },
  {
    id: "location",
    label: "Ort",
    prompt: "Wo warst du überwiegend?",
    kind: "choice",
    min: 0, max: 0, step: 1, default: 0,
    higherIsBetter: true,
    icon: MapPin,
    group: "Sinn & Soziales",
    phase: "day",
    choices: [
      { value: "unna", label: "Unna" },
      { value: "geseke", label: "Geseke" },
      { value: "anderer", label: "Anderer Ort" },
    ],
  },
];

export const METRIC_GROUPS: MetricGroup[] = [
  "Psyche & Kognition",
  "Körper & Vitalität",
  "Sinn & Soziales",
];

/** Anzahl der subjektiven 1–10-Skalen (für Fortschritt/Score). */
export const SCALE_METRIC_COUNT = CHECKIN_METRICS.filter((m) => m.kind === "scale").length;

/* ---------- Eigene Tracker: Icons + Umwandlung + Laufzeit-Registry ---------- */

/**
 * Auswählbare Icons für eigene Tracker. Bewusst eine feste, kuratierte Liste –
 * so bleibt die Auswahl übersichtlich und das Bundle klein.
 */
export const CUSTOM_ICON_CHOICES: { key: string; icon: LucideIcon; label: string }[] = [
  { key: "star", icon: Star, label: "Stern" },
  { key: "flame", icon: Flame, label: "Flamme" },
  { key: "target", icon: Target, label: "Ziel" },
  { key: "coffee", icon: Coffee, label: "Kaffee" },
  { key: "droplet", icon: Droplet, label: "Wasser" },
  { key: "book", icon: BookOpen, label: "Buch" },
  { key: "dumbbell", icon: Dumbbell, label: "Sport" },
  { key: "brain", icon: Brain, label: "Kopf" },
  { key: "heart", icon: Heart, label: "Herz" },
  { key: "leaf", icon: Leaf, label: "Blatt" },
  { key: "moon", icon: Moon, label: "Mond" },
  { key: "smile", icon: Smile, label: "Laune" },
  { key: "pill", icon: Pill, label: "Pille" },
  { key: "cigarette", icon: Cigarette, label: "Zigarette" },
  { key: "wine", icon: Wine, label: "Alkohol" },
  { key: "ban", icon: Ban, label: "Verbot" },
];

const CUSTOM_ICONS: Record<string, LucideIcon> = Object.fromEntries(
  CUSTOM_ICON_CHOICES.map((c) => [c.key, c.icon]),
);

/** Icon-Komponente zu einem Icon-Schlüssel (Fallback: Stern). */
export function customIcon(key?: string): LucideIcon {
  return (key && CUSTOM_ICONS[key]) || Star;
}

/** Wandelt einen gespeicherten Tracker in einen Metrik-Deskriptor um. */
export function customToDescriptor(cm: CustomMetric): MetricDescriptor {
  return {
    id: cm.id,
    label: cm.label,
    prompt: cm.prompt?.trim() || cm.label,
    kind: cm.kind,
    min: cm.min,
    max: cm.max,
    step: cm.step,
    default: cm.default,
    higherIsBetter: cm.higherIsBetter,
    icon: customIcon(cm.icon),
    group: "Eigene Tracker",
    phase: "day",
    unit: cm.unit,
    lowLabel: cm.lowLabel,
    highLabel: cm.highLabel,
    target: cm.target,
    trackWeight: cm.trackWeight,
    custom: true,
  };
}

/*
  Laufzeit-Registry der eigenen Tracker.

  Damit die vorhandenen reinen Analyse-/Anzeige-Funktionen (metricById, labelOf …)
  auch nutzerdefinierte Kennzahlen kennen, halten wir sie in einem Modul-Register.
  Es wird an einer zentralen Stelle (JournalProvider) aus der DB gefüllt. Für die
  reaktive Auswertung werden die Tracker zusätzlich explizit als Parameter
  durchgereicht – das Register dient dem bequemen Label-/ID-Lookup.
*/
let CUSTOM_REGISTRY: MetricDescriptor[] = [];

/** Register aus den gespeicherten Trackern setzen (aktive zuerst, sortiert). */
export function setCustomMetrics(list: CustomMetric[]): void {
  CUSTOM_REGISTRY = list
    .filter((c) => !c.archived)
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
    .map(customToDescriptor);
}

/** Aktuell registrierte eigene Tracker als Deskriptoren. */
export function customMetricDescriptors(): MetricDescriptor[] {
  return CUSTOM_REGISTRY;
}

/** Eingebaute + eigene Tracker (für Formular, Auswertung, Export). */
export function activeMetrics(): MetricDescriptor[] {
  return [...CHECKIN_METRICS, ...CUSTOM_REGISTRY];
}

export function metricById(id: string): MetricDescriptor | undefined {
  return CHECKIN_METRICS.find((m) => m.id === id) ?? CUSTOM_REGISTRY.find((m) => m.id === id);
}

/**
 * Wert auf [0,1] normalisiert und „gut-orientiert": 1 bedeutet immer den
 * besseren Pol (bei Stress also wenig Stress). Grundlage für Score & Vergleich.
 */
export function normalizeMetric(d: MetricDescriptor, value: number): number {
  const span = d.max - d.min || 1;
  const n = Math.min(Math.max((value - d.min) / span, 0), 1);
  return d.higherIsBetter ? n : 1 - n;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** „time"-Wert (Minuten seit Anker) → HH:MM zur Anzeige/Eingabe. */
export function timeToClock(d: MetricDescriptor, value: number): string {
  const total = (Math.round(value) + (d.anchorHour ?? 0) * 60) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** HH:MM → gespeicherter „time"-Wert (Minuten seit Anker, stetig über 0 Uhr). */
export function clockToTime(d: MetricDescriptor, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return ((h * 60 + m) - (d.anchorHour ?? 0) * 60 + 1440) % 1440;
}

/** Menschlich lesbarer Wert inkl. Einheit. */
export function formatMetricValue(d: MetricDescriptor, value: number): string {
  if (d.kind === "scale") return `${value}/${d.max}`;
  if (d.kind === "hours") return `${value} h`;
  if (d.kind === "minutes") return `${value} min`;
  if (d.kind === "bool") return value >= 1 ? (d.highLabel || "Ja") : (d.lowLabel || "Nein");
  if (d.kind === "count") return d.unit ? `${value} ${d.unit}` : String(value);
  if (d.kind === "number") return d.unit ? `${value} ${d.unit}` : String(value);
  if (d.kind === "time") return timeToClock(d, value);
  if (d.kind === "choice") return d.choices?.find((o) => o.score === value)?.label ?? String(value);
  return String(value);
}
