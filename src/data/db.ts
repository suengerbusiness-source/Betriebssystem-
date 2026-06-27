import Dexie, { type Table } from "dexie";
import type {
  Account,
  CalendarEvent,
  Goal,
  Project,
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
  // Bereits angelegt für spätere Phasen:
  projects!: Table<Project, string>;
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
  }
}

export const db = new LifeOsDB();
