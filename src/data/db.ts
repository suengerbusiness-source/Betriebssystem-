import Dexie, { type Table } from "dexie";
import type {
  Account,
  Asset,
  Budget,
  CalendarEvent,
  Deal,
  Goal,
  MonthlyReview,
  Project,
  RecurringTemplate,
  Task,
  Transaction,
  VisionItem,
} from "./types";

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
  // Bereits angelegt für spätere Phasen:
  goals!: Table<Goal, string>;

  constructor() {
    super("life-os");
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
  }
}

export const db = new LifeOsDB();
