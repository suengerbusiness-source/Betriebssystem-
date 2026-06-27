/*
  Zentrale Datenmodell-Typen.

  Prinzip (siehe Spec, Abschnitt 7 & 10): Entitäten sind lose gekoppelt, aber
  über IDs verknüpfbar (Task↔Projekt↔Termin↔Kosten↔Ziel). Jede Entität gehört
  zu genau einem `accountId`, damit mehrere Konten vollständig getrennte Daten
  haben.

  Module aus späteren Phasen (Project, Task, Goal, ...) sind hier bereits
  "mitgedacht", werden in Phase 1 aber noch nicht mit UI ausgebaut.
*/

export type ID = string;

export interface Account {
  id: ID;
  name: string;
  /** Optionaler Anzeigename für die Begrüßung; sonst `name`. */
  greetingName?: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export type Priority = "low" | "medium" | "high";

/** Farbpalette für Kalender/Module – als Tokens, damit Filter konsistent sind. */
export const EVENT_COLORS = [
  { token: "violet", label: "Violett", hex: "#7c6cff" },
  { token: "blue", label: "Blau", hex: "#3b82f6" },
  { token: "green", label: "Grün", hex: "#22c55e" },
  { token: "amber", label: "Gelb", hex: "#f59e0b" },
  { token: "rose", label: "Rot", hex: "#f43f5e" },
  { token: "teal", label: "Türkis", hex: "#14b8a6" },
  { token: "slate", label: "Grau", hex: "#64748b" },
] as const;

export type ColorToken = (typeof EVENT_COLORS)[number]["token"];

export function colorHex(token: string): string {
  return EVENT_COLORS.find((c) => c.token === token)?.hex ?? "#7c6cff";
}

export interface CalendarEvent {
  id: ID;
  accountId: ID;
  title: string;
  description?: string;
  /** ISO-DateTime. */
  start: string;
  end: string;
  allDay: boolean;
  color: ColorToken;
  category?: string;
  priority: Priority;
  /** Verknüpfung in spätere Phase: Projekt/Aufgabe. */
  projectId?: ID;
  createdAt: number;
  updatedAt: number;
}

export type TxType = "income" | "expense";

export interface Transaction {
  id: ID;
  accountId: ID;
  type: TxType;
  /** Immer positiver Betrag; Vorzeichen ergibt sich aus `type`. */
  amount: number;
  currency: string;
  category: string;
  note?: string;
  /** ISO-Date (yyyy-MM-dd). */
  date: string;
  /** Für spätere Phase: wiederkehrende Buchung. */
  recurring?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type VisionKind = "image" | "text" | "quote";

export interface VisionItem {
  id: ID;
  accountId: ID;
  kind: VisionKind;
  title?: string;
  /** Text oder Bild (Data-URL/URL), je nach `kind`. */
  content?: string;
  color: ColorToken;
  /** Freie Anordnung auf dem Board (Pixel relativ zur Leinwand). */
  x: number;
  y: number;
  w: number;
  h: number;
  createdAt: number;
  updatedAt: number;
}

/* --- Mitgedacht für spätere Phasen (noch ohne UI) --- */

export interface Project {
  id: ID;
  accountId: ID;
  title: string;
  status: "idea" | "active" | "paused" | "done";
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: ID;
  accountId: ID;
  title: string;
  why?: string;
  progress: number; // 0..100
  createdAt: number;
  updatedAt: number;
}
