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

/**
 * Wiederholungsregel für Termine. Bewusst schlank gehalten und deckt die
 * üblichen Fälle ab: täglich, wöchentlich (an bestimmten Wochentagen) und
 * „alle 2 Wochen im Wechsel" (interval=2) – z. B. eine Woche arbeiten, die
 * nächste frei. Wird beim Anzeigen live „ausgerollt" (siehe occursOnDay).
 */
export interface RecurrenceRule {
  freq: "daily" | "weekly";
  /** 1 = jede, 2 = jede zweite (alternierend) … */
  interval: number;
  /** Wochentage (0=So … 6=Sa) für freq="weekly". Leer = Wochentag des Starts. */
  weekdays?: number[];
  /** Letzter Tag der Wiederholung (yyyy-MM-dd, inklusive). Leer = unbegrenzt. */
  until?: string;
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
  /** Wiederholung (optional). Ohne = einmaliger (evtl. mehrtägiger) Termin. */
  recurrence?: RecurrenceRule;
  color: ColorToken;
  category?: string;
  priority: Priority;
  /** Abgesagt/abgebrochen – Termin bleibt für Auswertungen erhalten. */
  cancelled?: boolean;
  /** Tag der Absage (yyyy-MM-dd). */
  cancelledAt?: string;
  /** Push-Erinnerung X Minuten vor Beginn (z. B. 10 / 30). 0/leer = keine. */
  reminderMinutes?: number;
  /** Für welchen Zeitpunkt (Unix-Sek.) die Erinnerung bereits geplant wurde. */
  reminderScheduledFor?: number;
  /** Verknüpfung in spätere Phase: Projekt/Aufgabe. */
  projectId?: ID;
  createdAt: number;
  updatedAt: number;
}

/** Täglicher Bildschirmzeit-Eintrag (manuell aus iOS „Bildschirmzeit"). */
export interface ScreenTimeLog {
  id: ID;
  accountId: ID;
  /** Tag (yyyy-MM-dd) – ein Eintrag pro Tag. */
  date: string;
  /** Gesamt-Bildschirmzeit iPhone in Minuten. */
  iphoneMin?: number;
  /** Gesamt-Bildschirmzeit iPad in Minuten. */
  ipadMin?: number;
  /** Social-Media-Minuten gesamt (der Fokus-Wert zum Reduzieren). */
  socialMin?: number;
  createdAt: number;
  updatedAt: number;
}

/** Geburtstag – wird jährlich automatisch auf Monat/Tag im Kalender angezeigt. */
export interface Birthday {
  id: ID;
  accountId: ID;
  name: string;
  /** 1–12. */
  month: number;
  /** 1–31. */
  day: number;
  /** Optionales Geburtsjahr (für die Altersanzeige). */
  year?: number;
  createdAt: number;
  updatedAt: number;
}

export type TxType = "income" | "expense";

/** Modus zur Trennung von geschäftlichen und privaten Finanzen. */
export type TxMode = "business" | "private";
/** Filter über den Modus – „both" zeigt beides zusammen. */
export type ModeFilter = TxMode | "both";

export const MODES: { value: TxMode; label: string }[] = [
  { value: "private", label: "Privat" },
  { value: "business", label: "Business" },
];

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
  /** Business oder Privat (fehlend = privat, für Altdaten). */
  mode?: TxMode;
  /** Im Monatsabschluss geprüft/eingehakt. */
  reviewed?: boolean;
  /** Geplante/voraussichtliche Zahlung (noch nicht erfolgt). Zählt nicht in
   *  die Ist-Summen, sondern wird separat als Prognose/Anstehend geführt. */
  planned?: boolean;
  /** Angehängte Belege (Bild/PDF als Data-URL, lokal gespeichert). */
  attachments?: { name: string; dataUrl: string }[];
  /** Aus welcher wiederkehrenden Vorlage erzeugt (für Dedupe je Monat). */
  templateId?: ID;
  /** Optional einem Projekt zugeordnet (für Rentabilität). */
  projectId?: ID;
  /** Optional einem Unternehmen zugeordnet (Einnahmen/Ausgaben des Gewerbes). */
  companyId?: ID;
  /** Optional einem Kanal/Plattform zugeordnet (z. B. TikTok, Shop). */
  channelId?: ID;
  createdAt: number;
  updatedAt: number;
}

/** Protokoll/Notiz eines Monatsabschlusses (Analyse-Bereich). */
export interface MonthlyReview {
  id: ID;
  accountId: ID;
  /** yyyy-MM. */
  month: string;
  /** Optional je Modus getrennt (business/private); fehlend = gilt für „Beides". */
  mode?: TxMode | "both";
  note?: string;
  status: "open" | "done";
  createdAt: number;
  updatedAt: number;
}

/** Monatsbudget je Kategorie (Soll/Ist). */
export interface Budget {
  id: ID;
  accountId: ID;
  category: string;
  /** Monatliches Limit in EUR. */
  monthlyLimit: number;
  createdAt: number;
  updatedAt: number;
}

/* --- Rechnungen & Kunden (Business-Buchhaltung) --- */

export interface Client {
  id: ID;
  accountId: ID;
  name: string;
  email?: string;
  address?: string;
  /** USt-IdNr. / Steuernummer. */
  vatId?: string;
  createdAt: number;
  updatedAt: number;
}

/** Gängige deutsche Umsatzsteuersätze. */
export const VAT_RATES = [19, 7, 0] as const;

export interface InvoiceItem {
  description: string;
  quantity: number;
  /** Nettopreis je Einheit. */
  unitPrice: number;
  /** USt-Satz in % (0/7/19). */
  vatRate: number;
}

export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Invoice {
  id: ID;
  accountId: ID;
  number: string;
  clientId?: ID;
  /** Name als Snapshot (bleibt stabil, falls Kunde sich ändert). */
  clientName: string;
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  /** Kleinunternehmer §19 UStG -> keine USt ausweisen. */
  kleinunternehmer: boolean;
  status: InvoiceStatus;
  /** Verknüpfte Einnahme-Buchung (bei „bezahlt"). */
  paidTransactionId?: ID;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** Vorlage für wiederkehrende Buchungen (monatlich). */
export interface RecurringTemplate {
  id: ID;
  accountId: ID;
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  mode?: TxMode;
  /** Tag im Monat (1–28), an dem gebucht wird. */
  dayOfMonth: number;
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

/* --- Vermögen / Net-Worth --- */

export const ASSET_CATEGORIES = [
  "Bargeld / Konto",
  "Investitionen",
  "Immobilie",
  "Krypto",
  "Sonstiges",
] as const;

export interface Asset {
  id: ID;
  accountId: ID;
  name: string;
  category: string;
  /** Positiver Wert; bei `liability` zählt er als Schuld (negativ fürs Netto). */
  value: number;
  liability: boolean;
  /** Privat oder Business (fehlend = privat). */
  mode?: TxMode;
  /** Bei Business: zugeordnetes Unternehmen. */
  companyId?: ID;
  /** Verkauft – zählt dann nicht mehr ins Netto-Vermögen. */
  sold?: boolean;
  /** Verkaufsdatum (ISO yyyy-MM-dd). */
  soldAt?: string;
  /** Erzielter Verkaufserlös. */
  soldPrice?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/* --- Pipeline / Kooperationen (Mini-CRM) --- */

export type DealStage = "idea" | "talking" | "committed" | "closed" | "lost";

export const DEAL_STAGES: { value: DealStage; label: string }[] = [
  { value: "idea", label: "Idee" },
  { value: "talking", label: "Gespräch" },
  { value: "committed", label: "Zugesagt" },
  { value: "closed", label: "Abgeschlossen" },
  { value: "lost", label: "Abgesagt" },
];

export interface Deal {
  id: ID;
  accountId: ID;
  title: string;
  stage: DealStage;
  /** Erwarteter Wert in EUR. */
  value: number;
  contact?: string;
  nextStep?: string;
  note?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/* --- Projekte & Aufgaben --- */

export type ProjectStatus = "idea" | "active" | "paused" | "done";

export const PROJECT_STATUS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idee" },
  { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pausiert" },
  { value: "done", label: "Fertig" },
];

export interface Project {
  id: ID;
  accountId: ID;
  title: string;
  status: ProjectStatus;
  description?: string;
  color: ColorToken;
  /** Optionale Deadline (ISO-Date), Verknüpfung zum Kalender (spätere Phase). */
  deadline?: string;
  /** Stundensatz für die Bewertung der erfassten Zeit (€/h). */
  hourlyRate?: number;
  /** Reihenfolge innerhalb einer Kanban-Spalte. */
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** Zeiterfassungs-Eintrag für ein Projekt. */
export interface TimeEntry {
  id: ID;
  accountId: ID;
  projectId: ID;
  description?: string;
  /** Dauer in Minuten. */
  minutes: number;
  /** yyyy-MM-dd. */
  date: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: ID;
  accountId: ID;
  /** Optional: gehört zu einem Projekt. Ohne = eigenständige Aufgabe. */
  projectId?: ID;
  title: string;
  done: boolean;
  /** Tag der Erledigung (yyyy-MM-dd), gesetzt beim Abhaken – für Auswertungen. */
  completedAt?: string;
  priority?: Priority;
  /** Fälligkeit (yyyy-MM-dd). */
  dueDate?: string;
  /** Für den Tagesplan eingeplant (yyyy-MM-dd). */
  scheduledFor?: string;
  createdAt: number;
  updatedAt: number;
}

/** Schneller Gedanke/Eingang (GTD-Inbox) – später einsortieren. */
export interface InboxItem {
  id: ID;
  accountId: ID;
  text: string;
  createdAt: number;
}

/** Gewohnheit/Routine mit täglichem Abhaken und Streak. */
export interface Habit {
  id: ID;
  accountId: ID;
  title: string;
  color: ColorToken;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** Ein erledigter Tag einer Gewohnheit (Vorhandensein = erledigt). */
export interface HabitLog {
  id: ID;
  accountId: ID;
  habitId: ID;
  /** yyyy-MM-dd. */
  date: string;
}

/* --- Unternehmen / Business (Social-Media-Gewerbe & Expansion) --- */

export type BusinessType = "social" | "shop" | "affiliate" | "agency" | "mixed" | "other";

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "social", label: "Social Media" },
  { value: "shop", label: "Shop / E-Commerce" },
  { value: "affiliate", label: "Affiliate" },
  { value: "agency", label: "Agentur / Dienstleistung" },
  { value: "mixed", label: "Mehrere Standbeine" },
  { value: "other", label: "Sonstiges" },
];

export type CompanyStatus = "idea" | "building" | "active" | "paused";

export const COMPANY_STATUS: { value: CompanyStatus; label: string }[] = [
  { value: "idea", label: "Idee" },
  { value: "building", label: "Aufbau" },
  { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pausiert" },
];

export interface Company {
  id: ID;
  accountId: ID;
  name: string;
  /** Kurzer Claim/Positionierung. */
  tagline?: string;
  description?: string;
  type: BusinessType;
  /** Nische/Thema (z. B. Fitness, Tech). */
  niche?: string;
  /** Vision/Mission – wofür steht das Unternehmen? */
  vision?: string;
  color: ColorToken;
  status: CompanyStatus;
  foundedDate?: string;
  /** Monatliches Umsatzziel in EUR. */
  revenueGoal?: number;
  createdAt: number;
  updatedAt: number;
}

/** Plattform-Art eines Kanals. Labels/Icons in features/company/company.platforms.ts. */
export type PlatformKind =
  | "tiktok"
  | "youtube"
  | "instagram"
  | "facebook"
  | "shop"
  | "affiliate"
  | "website"
  | "newsletter"
  | "other";

export type ChannelStatus = "planned" | "active" | "paused";

export const CHANNEL_STATUS: { value: ChannelStatus; label: string }[] = [
  { value: "planned", label: "Geplant" },
  { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pausiert" },
];

export interface Channel {
  id: ID;
  accountId: ID;
  companyId: ID;
  kind: PlatformKind;
  /** Anzeigename / Markenname des Kanals. */
  name: string;
  handle?: string;
  url?: string;
  followers?: number;
  /** Manuell gepflegte Video-/Beitragsanzahl (für Plattformen ohne Live-Abruf). */
  videos?: number;
  niche?: string;
  status: ChannelStatus;
  note?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type ContentStage = "idea" | "script" | "production" | "scheduled" | "published";

export const CONTENT_STAGES: { value: ContentStage; label: string }[] = [
  { value: "idea", label: "Idee" },
  { value: "script", label: "Skript" },
  { value: "production", label: "Produktion" },
  { value: "scheduled", label: "Geplant" },
  { value: "published", label: "Veröffentlicht" },
];

export const CONTENT_FORMATS = ["Short / Reel", "Langes Video", "Post", "Story", "Karussell", "Livestream"] as const;

export interface ContentItem {
  id: ID;
  accountId: ID;
  companyId: ID;
  /** Verknüpfter Kanal/Plattform. */
  channelId?: ID;
  title: string;
  /** Aufhänger / Hook der ersten Sekunden. */
  hook?: string;
  /** Vollständiges Skript / Drehbuch. */
  script?: string;
  stage: ContentStage;
  format?: string;
  /** Geplantes oder erfolgtes Veröffentlichungsdatum (yyyy-MM-dd). */
  publishDate?: string;
  url?: string;
  views?: number;
  likes?: number;
  comments?: number;
  /** Zugeordneter Umsatz in EUR. */
  revenue?: number;
  tags?: string[];
  note?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export const INVESTMENT_CATEGORIES = ["Equipment", "Werbung", "Tools & Abos", "Bildung", "Sonstiges"] as const;

export interface Investment {
  id: ID;
  accountId: ID;
  companyId: ID;
  title: string;
  category: string;
  amount: number;
  /** Wiederkehrend (z. B. monatliches Tool-Abo). */
  recurring?: boolean;
  date: string;
  note?: string;
  /** Optional als Geschäftsausgabe in den Finanzen verbucht. */
  transactionId?: ID;
  createdAt: number;
  updatedAt: number;
}

export type RevenueKind = "adsense" | "sponsoring" | "affiliate" | "shop" | "dienstleistung" | "sonstiges";

export const REVENUE_KINDS: { value: RevenueKind; label: string }[] = [
  { value: "adsense", label: "Werbeeinnahmen (AdSense etc.)" },
  { value: "sponsoring", label: "Sponsoring / Kooperationen" },
  { value: "affiliate", label: "Affiliate" },
  { value: "shop", label: "Shop / Produkte" },
  { value: "dienstleistung", label: "Dienstleistung" },
  { value: "sonstiges", label: "Sonstiges" },
];

export interface RevenueStream {
  id: ID;
  accountId: ID;
  companyId: ID;
  name: string;
  kind: RevenueKind;
  /** Aktueller monatlicher Betrag in EUR. */
  monthlyAmount?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export type IdeaKind = "content" | "product" | "channel" | "expansion" | "collab" | "business";

export const IDEA_KINDS: { value: IdeaKind; label: string }[] = [
  { value: "content", label: "Content" },
  { value: "product", label: "Produkt" },
  { value: "channel", label: "Kanal" },
  { value: "expansion", label: "Expansion" },
  { value: "collab", label: "Kooperation" },
  { value: "business", label: "Business / Plan" },
];

export type IdeaStatus = "new" | "considering" | "planned" | "done" | "dropped";

export const IDEA_STATUS: { value: IdeaStatus; label: string }[] = [
  { value: "new", label: "Neu" },
  { value: "considering", label: "Prüfen" },
  { value: "planned", label: "Eingeplant" },
  { value: "done", label: "Umgesetzt" },
  { value: "dropped", label: "Verworfen" },
];

export interface BusinessIdea {
  id: ID;
  accountId: ID;
  /** Optional einem Unternehmen zugeordnet. */
  companyId?: ID;
  title: string;
  kind: IdeaKind;
  /** Wirkung 1–5. */
  impact?: number;
  /** Aufwand 1–5. */
  effort?: number;
  status: IdeaStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/** Lokaler Auto-Backup-Schnappschuss (für Wiederherstellung bei Fehlgriffen). */
export interface BackupSnapshot {
  id: ID;
  createdAt: number;
  /** z. B. „Automatisch" oder „Vor Wiederherstellung". */
  label: string;
  /** Größe des JSON in Bytes. */
  size: number;
  /** Vollständiger Export als JSON-String. */
  json: string;
}

/** Freie Notiz / Aufzeichnung eines Unternehmens (Überschrift + Freitext). */
export interface CompanyNote {
  id: ID;
  accountId: ID;
  companyId: ID;
  title: string;
  body?: string;
  createdAt: number;
  updatedAt: number;
}

/* --- Mitgedacht für spätere Phasen (noch ohne UI) --- */

/* --- Ziele & OKR --- */

export type GoalTimeframe = "year" | "quarter";

export interface Goal {
  id: ID;
  accountId: ID;
  title: string;
  /** Motivation: warum ist dieses Ziel wichtig? */
  why?: string;
  timeframe: GoalTimeframe;
  /** Zeitraum: "2026" (Jahr) oder "2026-Q2" (Quartal). */
  period: string;
  /** Quartalsziel -> Jahresziel (Hierarchie). */
  parentId?: ID;
  color: ColorToken;
  status: "active" | "done" | "archived";
  createdAt: number;
  updatedAt: number;
}

/* --- Tagebuch / täglicher Check-in --- */

/*
  Ein Check-in ist ein Eintrag pro Tag. Die strukturierten Kennzahlen liegen
  bewusst als offenes `metrics`-Objekt (Metrik-ID -> Zahl) vor, NICHT als feste
  Felder. Bedeutung, Skala und Richtung jeder Metrik stehen zentral in der
  Registry (features/journal/checkin.metrics.ts). Dadurch lassen sich neue
  Kennzahlen ohne Schema-Migration ergänzen und spätere (KI-)Analysen können
  beliebige Metriken generisch miteinander korrelieren, ohne sie einzeln zu
  kennen. Das ist die „Andock-Stelle" für wissenschaftliche Auswertungen.
*/
export interface CheckIn {
  id: ID;
  accountId: ID;
  /** Tag des Check-ins (yyyy-MM-dd) – genau ein Eintrag pro Tag. */
  date: string;
  /** Numerische Kennzahlen: Metrik-ID -> Wert (siehe Registry). */
  metrics: Record<string, number>;
  /** Optionale Begründung je Kennzahl: Metrik-ID -> Freitext (warum dieser Wert). */
  metricNotes?: Record<string, string>;
  /** Auswahl-Werte für Choice-Kennzahlen (z. B. Wetter/Ort): Metrik-ID -> Label. */
  choices?: Record<string, string>;
  /** Gewicht in kg je Tracker (z. B. Kraftübungen): Metrik-ID -> kg. */
  weights?: Record<string, number>;
  /** Was lief gut? */
  wentWell?: string;
  /** Was lief schlecht / was hat gefehlt? */
  wentBad?: string;
  /** Was habe ich gelernt? */
  learned?: string;
  /** Freier Tagebuch-Text. */
  note?: string;
  /** Optionale Schlagworte zum Markieren von Phasen (z. B. „Urlaub", „Deadline"). */
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

/* --- Eigene Tracker: nutzerdefinierte Kennzahlen im täglichen Check-in --- */

/**
 * Art eines eigenen Trackers. „bool" = Ja/Nein (0/1), „count" = Anzahl,
 * ansonsten wie die eingebauten Metriken (Skala 1–10, Stunden, Minuten).
 */
export type CustomMetricKind = "scale" | "bool" | "count" | "hours" | "minutes";

/**
 * Nutzerdefinierte Kennzahl. Erscheint als zusätzliches Feld im Abend-Check-in
 * und fließt in Auswertung & KI-Export ein. Bewusst wie die eingebaute
 * Metrik-Registry aufgebaut, damit beide über denselben Code laufen
 * („Bausteine"). Der Wert landet – wie bei den eingebauten Metriken – als
 * `CheckIn.metrics[id] = Zahl` (bei Ja/Nein 1 bzw. 0).
 */
export interface CustomMetric {
  id: ID;
  accountId: ID;
  /** Kurzname (z. B. „Kaffee", „Onanie", „Meditation"). */
  label: string;
  /** Frage im Check-in (optional; sonst wird das Label genutzt). */
  prompt?: string;
  kind: CustomMetricKind;
  min: number;
  max: number;
  step: number;
  /** Vorschlagswert (für count/hours/minutes; scale/bool starten leer/0). */
  default: number;
  /** Höherer Wert = „besser"? Bei schlechten Gewohnheiten false. */
  higherIsBetter: boolean;
  /** Icon-Schlüssel aus der festen Auswahl (siehe checkin.metrics). */
  icon?: string;
  /** Anzeige-Einheit (z. B. „Tassen", „min", „Wdh", „g"). */
  unit?: string;
  /** Beschriftung der Skalen-/Ja-Nein-Enden. */
  lowLabel?: string;
  highLabel?: string;
  /** Tagesziel (nur count): ab diesem Wert zählt der Tag – baut eine Strähne auf. */
  target?: number;
  /** Zusätzlich ein Gewicht in kg erfassen (z. B. bei Kraftübungen). */
  trackWeight?: boolean;
  /** Sortierung in der Eingabemaske. */
  order: number;
  /** Archiviert: bleibt in alten Einträgen erhalten, wird nicht mehr abgefragt. */
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

/* --- Horizonte: Ziele über Zeithorizonte (Tag bis 5 Jahre) --- */

export type Horizon = "day" | "next3" | "week" | "month" | "year" | "fiveYears";

export const HORIZONS: { value: Horizon; label: string; hint: string }[] = [
  { value: "day", label: "Heute", hint: "Was zählt heute?" },
  { value: "next3", label: "Nächste 3 Tage", hint: "Die nächsten Tage" },
  { value: "week", label: "Diese Woche", hint: "Wochenfokus" },
  { value: "month", label: "Dieser Monat", hint: "Monatsziele" },
  { value: "year", label: "Dieses Jahr", hint: "Jahresziele" },
  { value: "fiveYears", label: "5 Jahre", hint: "Langfristige Vision" },
];

export interface HorizonGoal {
  id: ID;
  accountId: ID;
  horizon: Horizon;
  title: string;
  note?: string;
  status: "open" | "done";
  /** Sortierung innerhalb eines Horizonts. */
  order: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Eintrag zu einem Horizont-Ziel: eine getane Aktion oder ein Erfolg.
 * Bewusst über `kind` modelliert – so lässt sich der Eintrags-Typ später
 * erweitern (z. B. „obstacle", „note"), ohne neue Tabellen.
 */
export type GoalLogKind = "action" | "win";

export interface GoalLog {
  id: ID;
  accountId: ID;
  goalId: ID;
  kind: GoalLogKind;
  text: string;
  /** yyyy-MM-dd. */
  date: string;
  createdAt: number;
}

/** Messbares Schlüsselergebnis (Key Result) eines Ziels. */
export interface KeyResult {
  id: ID;
  accountId: ID;
  goalId: ID;
  title: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit?: string;
  createdAt: number;
  updatedAt: number;
}
