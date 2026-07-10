import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import { getCloudUrl } from "./sync";
import type {
  Account,
  Asset,
  BackupSnapshot,
  Birthday,
  Budget,
  BusinessIdea,
  CalendarEvent,
  Channel,
  CheckIn,
  Client,
  Company,
  CompanyNote,
  ContentItem,
  CustomMetric,
  Deal,
  Goal,
  GoalLog,
  HorizonGoal,
  Investment,
  Invoice,
  RevenueStream,
  ScreenTimeLog,
  Habit,
  HabitLog,
  InboxItem,
  KeyResult,
  MonthlyReview,
  Project,
  RecurringTemplate,
  Task,
  TimeEntry,
  Transaction,
  UserProfile,
  VisionItem,
} from "./types";

// Beim Modul-Laden einmal lesen: ist Sync konfiguriert?
const cloudUrl = getCloudUrl();

/*
  Die Datenbank-Schicht.

  Dies ist die EINZIGE Stelle, an der die konkrete Storage-Technologie
  (IndexedDB via Dexie) bekannt ist. Die UI greift ausschließlich über
  `repo.ts` zu. Dadurch kann später auf SQLite (Tauri) oder eine Sync-Lösung
  umgestellt werden, ohne die Oberfläche umzubauen.
*/
export class LifeOsDB extends Dexie {
  accounts!: Table<Account, string>;
  events!: Table<CalendarEvent, string>;
  transactions!: Table<Transaction, string>;
  visionItems!: Table<VisionItem, string>;
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  budgets!: Table<Budget, string>;
  recurringTemplates!: Table<RecurringTemplate, string>;
  assets!: Table<Asset, string>;
  deals!: Table<Deal, string>;
  monthlyReviews!: Table<MonthlyReview, string>;
  inboxItems!: Table<InboxItem, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  goals!: Table<Goal, string>;
  keyResults!: Table<KeyResult, string>;
  clients!: Table<Client, string>;
  invoices!: Table<Invoice, string>;
  timeEntries!: Table<TimeEntry, string>;
  checkins!: Table<CheckIn, string>;
  horizonGoals!: Table<HorizonGoal, string>;
  goalLogs!: Table<GoalLog, string>;
  companies!: Table<Company, string>;
  channels!: Table<Channel, string>;
  contentItems!: Table<ContentItem, string>;
  investments!: Table<Investment, string>;
  revenueStreams!: Table<RevenueStream, string>;
  businessIdeas!: Table<BusinessIdea, string>;
  companyNotes!: Table<CompanyNote, string>;
  backups!: Table<BackupSnapshot, string>;
  birthdays!: Table<Birthday, string>;
  screenTime!: Table<ScreenTimeLog, string>;
  customMetrics!: Table<CustomMetric, string>;
  profiles!: Table<UserProfile, string>;

  constructor() {
    // Cloud-Addon NUR anhängen, wenn eine Sync-URL hinterlegt ist. Ohne URL
    // wird die DB exakt wie bisher konstruiert (rein lokal, kein Addon-Effekt).
    super("life-os", cloudUrl ? { addons: [dexieCloud] } : {});
    this.version(1).stores({
      // Indizes: das, wonach wir filtern/sortieren.
      accounts: "id, name",
      events: "id, accountId, start, color, category, priority, projectId",
      transactions: "id, accountId, date, type, category",
      visionItems: "id, accountId",
      projects: "id, accountId, status",
      goals: "id, accountId",
    });
    // v2: Aufgaben-Tabelle + Projekt-Felder (color/deadline/order).
    // Neue, nicht indizierte Felder brauchen keine Migration.
    this.version(2).stores({
      tasks: "id, accountId, projectId, done",
    });
    // v3: Budgets + Vorlagen für wiederkehrende Buchungen.
    this.version(3).stores({
      budgets: "id, accountId, category",
      recurringTemplates: "id, accountId",
    });
    // v4: Vermögen (Net-Worth) + Pipeline/Deals (Mini-CRM).
    this.version(4).stores({
      assets: "id, accountId",
      deals: "id, accountId, stage",
    });
    // v5: Monatsabschluss-Protokolle (Analyse-Bereich).
    this.version(5).stores({
      monthlyReviews: "id, accountId, month",
    });
    // v6: Daily-Driver – Inbox, Gewohnheiten + Logs. (Task-Felder brauchen
    // keine Migration, da nicht indiziert.)
    this.version(6).stores({
      inboxItems: "id, accountId",
      habits: "id, accountId",
      habitLogs: "id, accountId, habitId, date",
    });
    // v7: OKR – Key Results (goals-Tabelle existiert bereits).
    this.version(7).stores({
      keyResults: "id, accountId, goalId",
    });
    // v8: Business-Buchhaltung – Kunden & Rechnungen.
    this.version(8).stores({
      clients: "id, accountId",
      invoices: "id, accountId, status, clientId",
    });
    // v9: Zeiterfassung (Transaction.projectId/Project.hourlyRate brauchen keine
    // Migration, da nicht indiziert).
    this.version(9).stores({
      timeEntries: "id, accountId, projectId, date",
    });
    // v10: Tagebuch / täglicher Check-in (metrics-Objekt braucht keine
    // Migration, da nicht indiziert).
    this.version(10).stores({
      checkins: "id, accountId, date",
    });
    // v11: Horizonte – Ziele über Zeithorizonte + Aktions-/Erfolgs-Einträge.
    this.version(11).stores({
      horizonGoals: "id, accountId, horizon",
      goalLogs: "id, accountId, goalId",
    });
    // v12: Unternehmen – Firmen, Kanäle, Content, Investitionen, Einnahmen, Ideen.
    this.version(12).stores({
      companies: "id, accountId",
      channels: "id, accountId, companyId",
      contentItems: "id, accountId, companyId, stage",
      investments: "id, accountId, companyId",
      revenueStreams: "id, accountId, companyId",
      businessIdeas: "id, accountId, companyId",
    });
    // v13: Unternehmens-Notizen (freie Aufzeichnungen).
    this.version(13).stores({
      companyNotes: "id, accountId, companyId",
    });
    // v14: Lokale Auto-Backup-Schnappschüsse (Wiederherstellung bei Fehlgriffen).
    this.version(14).stores({
      backups: "id, createdAt",
    });
    // v15: Geburtstage (jährliche Anzeige im Kalender).
    this.version(15).stores({
      birthdays: "id, accountId, month, day",
    });
    // v16: Bildschirmzeit (manuell, Fokus auf Social-Media-Reduktion).
    this.version(16).stores({
      screenTime: "id, accountId, date",
    });
    // v17: Eigene Tracker (nutzerdefinierte Kennzahlen im Tagebuch).
    this.version(17).stores({
      customMetrics: "id, accountId",
    });
    // v18: Persönliches Profil (Vorwissen der App über dich).
    this.version(18).stores({
      profiles: "id, accountId",
    });
  }
}

export const db = new LifeOsDB();

// Sync konfigurieren, sobald eine URL vorhanden ist. Offline-first: schlägt das
// fehl (z. B. keine Verbindung), bleibt die App lokal voll nutzbar.
if (cloudUrl) {
  try {
    (db as unknown as { cloud: { configure: (o: object) => void } }).cloud.configure({
      databaseUrl: cloudUrl,
      requireAuth: false,
    });
  } catch (err) {
    console.error("Dexie Cloud konnte nicht konfiguriert werden:", err);
  }
}
