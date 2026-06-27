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
  Goal,
  Habit,
  InboxItem,
  KeyResult,
  MonthlyReview,
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

/* ---------- Ziele & OKR ---------- */

export const goals = {
  list: (accountId: string) =>
    db.goals.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Goal, "id" | "createdAt" | "updatedAt">): Promise<Goal> => {
    const g: Goal = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.goals.add(g);
    return g;
  },
  update: (id: string, patch: Partial<Goal>) =>
    db.goals.update(id, { ...patch, updatedAt: now() }),
  remove: async (id: string) => {
    await db.keyResults.where("goalId").equals(id).delete();
    // Verknüpfte Quartalsziele lösen, nicht löschen.
    const children = await db.goals.where("accountId").equals((await db.goals.get(id))?.accountId ?? "").toArray();
    await Promise.all(children.filter((c) => c.parentId === id).map((c) => db.goals.update(c.id, { parentId: undefined })));
    await db.goals.delete(id);
  },
};

export const keyResults = {
  list: (accountId: string) =>
    db.keyResults.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<KeyResult, "id" | "createdAt" | "updatedAt">): Promise<KeyResult> => {
    const k: KeyResult = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.keyResults.add(k);
    return k;
  },
  update: (id: string, patch: Partial<KeyResult>) =>
    db.keyResults.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.keyResults.delete(id),
};

/* ---------- Daily-Driver: Inbox & Gewohnheiten ---------- */

export const inboxItems = {
  list: (accountId: string) =>
    db.inboxItems.where("accountId").equals(accountId).toArray(),
  create: async (accountId: string, text: string): Promise<InboxItem> => {
    const item: InboxItem = { id: uid(), accountId, text, createdAt: now() };
    await db.inboxItems.add(item);
    return item;
  },
  remove: (id: string) => db.inboxItems.delete(id),
};

export const habits = {
  list: (accountId: string) =>
    db.habits.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Habit, "id" | "createdAt" | "updatedAt">): Promise<Habit> => {
    const h: Habit = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.habits.add(h);
    return h;
  },
  update: (id: string, patch: Partial<Habit>) =>
    db.habits.update(id, { ...patch, updatedAt: now() }),
  remove: async (id: string) => {
    await db.habitLogs.where("habitId").equals(id).delete();
    await db.habits.delete(id);
  },
};

export const habitLogs = {
  list: (accountId: string) =>
    db.habitLogs.where("accountId").equals(accountId).toArray(),
  /** Tages-Eintrag einer Gewohnheit umschalten (an/aus). Atomar. */
  toggle: (accountId: string, habitId: string, date: string) =>
    db.transaction("rw", db.habitLogs, async () => {
      const existing = await db.habitLogs
        .where("habitId")
        .equals(habitId)
        .filter((l) => l.date === date)
        .first();
      if (existing) {
        await db.habitLogs.delete(existing.id);
        return false;
      }
      await db.habitLogs.add({ id: uid(), accountId, habitId, date });
      return true;
    }),
};

/* ---------- Monatsabschluss / Analyse ---------- */

export const monthlyReviews = {
  list: (accountId: string) =>
    db.monthlyReviews.where("accountId").equals(accountId).toArray(),
  /**
   * Findet das Protokoll für (Konto, Monat, Modus) und aktualisiert es, sonst
   * wird genau eines angelegt. Atomar (Dexie-Transaktion), damit parallele
   * Aufrufe – z. B. Notiz speichern + Monat abschließen – keine Duplikate
   * erzeugen.
   */
  upsert: (
    accountId: string,
    month: string,
    mode: MonthlyReview["mode"],
    patch: Partial<Pick<MonthlyReview, "note" | "status">>,
  ) =>
    db.transaction("rw", db.monthlyReviews, async () => {
      const existing = (
        await db.monthlyReviews.where("accountId").equals(accountId).toArray()
      ).find((r) => r.month === month && (r.mode ?? "both") === (mode ?? "both"));
      if (existing) {
        await db.monthlyReviews.update(existing.id, { ...patch, updatedAt: now() });
        return existing.id;
      }
      const r: MonthlyReview = {
        id: uid(),
        accountId,
        month,
        mode,
        status: patch.status ?? "open",
        note: patch.note,
        createdAt: now(),
        updatedAt: now(),
      };
      await db.monthlyReviews.add(r);
      return r.id;
    }),
  remove: (id: string) => db.monthlyReviews.delete(id),
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
