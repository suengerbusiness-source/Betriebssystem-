import type { LucideIcon } from "lucide-react";
import { Activity, Apple, Dumbbell, Moon, Smile, TrendingUp, Zap } from "lucide-react";

/*
  Metrik-Registry des Tagebuchs.

  Das ist die zentrale, einzige Quelle der Wahrheit für die Kennzahlen eines
  Check-ins. Jede Metrik beschreibt sich selbst (Skala, Richtung, Einheit,
  Icon). Die gespeicherten Check-ins enthalten nur `metrics[id] = Wert`; alle
  Bedeutung kommt von hier. Eine neue Kennzahl ergänzen = einen Eintrag in
  CHECKIN_METRICS hinzufügen – ohne Schema-Migration, und Eingabe-Maske wie
  spätere Analysen erkennen sie automatisch.
*/

export type MetricKind = "scale" | "hours" | "minutes";
export type MetricGroup = "Befinden" | "Körper";

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
  /** Vorschlagswert für einen neuen Check-in (ohne Historie). */
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

export const CHECKIN_METRICS: MetricDescriptor[] = [
  {
    id: "mood",
    label: "Stimmung",
    prompt: "Wie war deine Stimmung heute?",
    kind: "scale",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    higherIsBetter: true,
    icon: Smile,
    group: "Befinden",
    lowLabel: "mies",
    highLabel: "top",
  },
  {
    id: "energy",
    label: "Energie",
    prompt: "Wie viel Energie hattest du?",
    kind: "scale",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    higherIsBetter: true,
    icon: Zap,
    group: "Befinden",
    lowLabel: "leer",
    highLabel: "voll",
  },
  {
    id: "stress",
    label: "Stress",
    prompt: "Wie gestresst warst du?",
    kind: "scale",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    higherIsBetter: false,
    icon: Activity,
    group: "Befinden",
    lowLabel: "ruhig",
    highLabel: "überlastet",
  },
  {
    id: "productivity",
    label: "Produktivität",
    prompt: "Wie produktiv warst du?",
    kind: "scale",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    higherIsBetter: true,
    icon: TrendingUp,
    group: "Befinden",
    lowLabel: "Stillstand",
    highLabel: "im Flow",
  },
  {
    id: "sleepHours",
    label: "Schlaf",
    prompt: "Wie lange hast du geschlafen?",
    kind: "hours",
    min: 0,
    max: 12,
    step: 0.5,
    default: 7,
    higherIsBetter: true,
    icon: Moon,
    group: "Körper",
    unit: "h",
  },
  {
    id: "sport",
    label: "Sport",
    prompt: "Wie lange hast du dich bewegt?",
    kind: "minutes",
    min: 0,
    max: 180,
    step: 5,
    default: 0,
    higherIsBetter: true,
    icon: Dumbbell,
    group: "Körper",
    unit: "min",
  },
  {
    id: "nutrition",
    label: "Ernährung",
    prompt: "Wie gesund hast du gegessen?",
    kind: "scale",
    min: 1,
    max: 5,
    step: 1,
    default: 3,
    higherIsBetter: true,
    icon: Apple,
    group: "Körper",
    lowLabel: "schlecht",
    highLabel: "top",
  },
];

export const METRIC_GROUPS: MetricGroup[] = ["Befinden", "Körper"];

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
