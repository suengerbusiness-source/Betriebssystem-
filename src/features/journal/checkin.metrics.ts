import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Apple,
  BedDouble,
  Compass,
  Dumbbell,
  Focus,
  HeartPulse,
  Moon,
  Rocket,
  Smile,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

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

export type MetricKind = "scale" | "hours" | "minutes";
export type MetricGroup = "Psyche & Kognition" | "Körper & Vitalität" | "Sinn & Soziales";

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
  /** Anzeige-Einheit (z. B. „h", „min"). */
  unit?: string;
  /** Beschriftung der Skalenenden (nur bei kind = "scale"). */
  lowLabel?: string;
  highLabel?: string;
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
];

export const METRIC_GROUPS: MetricGroup[] = [
  "Psyche & Kognition",
  "Körper & Vitalität",
  "Sinn & Soziales",
];

/** Anzahl der subjektiven 1–10-Skalen (für Fortschritt/Score). */
export const SCALE_METRIC_COUNT = CHECKIN_METRICS.filter((m) => m.kind === "scale").length;

export function metricById(id: string): MetricDescriptor | undefined {
  return CHECKIN_METRICS.find((m) => m.id === id);
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

/** Menschlich lesbarer Wert inkl. Einheit. */
export function formatMetricValue(d: MetricDescriptor, value: number): string {
  if (d.kind === "scale") return `${value}/${d.max}`;
  if (d.kind === "hours") return `${value} h`;
  if (d.kind === "minutes") return `${value} min`;
  return String(value);
}
