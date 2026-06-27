/*
  Repository-Schicht: die öffentliche Daten-API für die UI.

  Die Oberfläche importiert NUR aus dieser Datei (nicht aus db.ts), damit der
  Storage austauschbar bleibt. Alle Schreibvorgänge setzen Zeitstempel und IDs.
*/
import { db } from "./db";
import { uid } from "@/lib/crypto";
import type {
  Account,
  CalendarEvent,
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

/** Dexie-DB-Handle nur für Backup/Restore (kapselt sonst niemand an). */
export { db as _db };
