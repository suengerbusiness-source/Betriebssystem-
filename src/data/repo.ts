/*
  Repository-Schicht: die öffentliche Daten-API für die UI.

  Die Oberfläche importiert NUR aus dieser Datei (nicht aus db.ts), damit der
  Storage austauschbar bleibt. Alle Schreibvorgänge setzen Zeitstempel und IDs.
*/
import { db } from "./db";
import { uid } from "@/lib/crypto";
import type {
  Account,
  Asset,
  Budget,
  CalendarEvent,
  Deal,
  Project,
  RecurringTemplate,
  Task,
  Transaction,
  VisionItem,
} from "./types";

const now = () => Date.now();

/* ---------- Konten ---------- */

export const accounts = {
  all: () => db.accounts.toArray(),
  count: () => db.accounts.count(),
  get: (id: string) => db.accounts.get(id),
  getByName: (name: string) =>
    db.accounts.where("name").equalsIgnoreCase(name).first(),
  create: async (data: Omit<Account, "id" | "createdAt">): Promise<Account> => {
    const account: Account = { ...data, id: uid(), createdAt: now() };
    await db.accounts.add(account);
    return account;
  },
};

/* ---------- Kalender ---------- */

export const events = {
  list: (accountId: string) =>
    db.events.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">,
  ): Promise<CalendarEvent> => {
    const ev: CalendarEvent = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.events.add(ev);
    return ev;
  },
  update: (id: string, patch: Partial<CalendarEvent>) =>
    db.events.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.events.delete(id),
};

/* ---------- Finanzen ---------- */

export const transactions = {
  list: (accountId: string) =>
    db.transactions.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<Transaction> => {
    const tx: Transaction = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.transactions.add(tx);
    return tx;
  },
  update: (id: string, patch: Partial<Transaction>) =>
    db.transactions.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.transactions.delete(id),
};

/* ---------- Vision Board ---------- */

export const visionItems = {
  list: (accountId: string) =>
    db.visionItems.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<VisionItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<VisionItem> => {
    const item: VisionItem = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.visionItems.add(item);
    return item;
  },
  update: (id: string, patch: Partial<VisionItem>) =>
    db.visionItems.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.visionItems.delete(id),
};

/* ---------- Budgets ---------- */

export const budgets = {
  list: (accountId: string) =>
    db.budgets.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<Budget, "id" | "createdAt" | "updatedAt">,
  ): Promise<Budget> => {
    const b: Budget = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.budgets.add(b);
    return b;
  },
  update: (id: string, patch: Partial<Budget>) =>
    db.budgets.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.budgets.delete(id),
};

/* ---------- Wiederkehrende Vorlagen ---------- */

export const recurringTemplates = {
  list: (accountId: string) =>
    db.recurringTemplates.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<RecurringTemplate, "id" | "createdAt" | "updatedAt">,
  ): Promise<RecurringTemplate> => {
    const t: RecurringTemplate = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.recurringTemplates.add(t);
    return t;
  },
  update: (id: string, patch: Partial<RecurringTemplate>) =>
    db.recurringTemplates.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.recurringTemplates.delete(id),
};

/* ---------- Vermögen / Net-Worth ---------- */

export const assets = {
  list: (accountId: string) =>
    db.assets.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Asset, "id" | "createdAt" | "updatedAt">): Promise<Asset> => {
    const a: Asset = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.assets.add(a);
    return a;
  },
  update: (id: string, patch: Partial<Asset>) =>
    db.assets.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.assets.delete(id),
};

/* ---------- Pipeline / Deals ---------- */

export const deals = {
  list: (accountId: string) =>
    db.deals.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Deal, "id" | "createdAt" | "updatedAt">): Promise<Deal> => {
    const d: Deal = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.deals.add(d);
    return d;
  },
  update: (id: string, patch: Partial<Deal>) =>
    db.deals.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.deals.delete(id),
};

/* ---------- Projekte & Aufgaben ---------- */

export const projects = {
  list: (accountId: string) =>
    db.projects.where("accountId").equals(accountId).toArray(),
  get: (id: string) => db.projects.get(id),
  create: async (
    data: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project> => {
    const p: Project = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.projects.add(p);
    return p;
  },
  update: (id: string, patch: Partial<Project>) =>
    db.projects.update(id, { ...patch, updatedAt: now() }),
  remove: async (id: string) => {
    // Aufgaben des Projekts mitlöschen, damit keine Waisen zurückbleiben.
    await db.tasks.where("projectId").equals(id).delete();
    await db.projects.delete(id);
  },
};

export const tasks = {
  list: (accountId: string) =>
    db.tasks.where("accountId").equals(accountId).toArray(),
  listByProject: (projectId: string) =>
    db.tasks.where("projectId").equals(projectId).toArray(),
  create: async (
    data: Omit<Task, "id" | "createdAt" | "updatedAt">,
  ): Promise<Task> => {
    const t: Task = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.tasks.add(t);
    return t;
  },
  update: (id: string, patch: Partial<Task>) =>
    db.tasks.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.tasks.delete(id),
};

/** Dexie-DB-Handle nur für Backup/Restore (kapselt sonst niemand an). */
export { db as _db };
