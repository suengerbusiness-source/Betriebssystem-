/*
  Backup: Ein-Klick Export/Import aller Daten als JSON.
  Schützt vor Datenverlust und macht die "local-first"-Daten portabel.
*/
import { db } from "./db";

export interface BackupFile {
  app: "life-os";
  version: number;
  exportedAt: string;
  data: {
    accounts: unknown[];
    events: unknown[];
    transactions: unknown[];
    visionItems: unknown[];
    projects: unknown[];
    tasks: unknown[];
    budgets: unknown[];
    recurringTemplates: unknown[];
    assets: unknown[];
    deals: unknown[];
    monthlyReviews: unknown[];
    inboxItems: unknown[];
    habits: unknown[];
    habitLogs: unknown[];
    goals: unknown[];
    keyResults: unknown[];
  };
}

const BACKUP_VERSION = 7;

/** Gesamten Datenbestand als JSON-String exportieren. */
export async function exportBackup(): Promise<string> {
  const [accounts, events, transactions, visionItems, projects, tasks, budgets, recurringTemplates, assets, deals, monthlyReviews, inboxItems, habits, habitLogs, goals, keyResults] =
    await Promise.all([
      db.accounts.toArray(),
      db.events.toArray(),
      db.transactions.toArray(),
      db.visionItems.toArray(),
      db.projects.toArray(),
      db.tasks.toArray(),
      db.budgets.toArray(),
      db.recurringTemplates.toArray(),
      db.assets.toArray(),
      db.deals.toArray(),
      db.monthlyReviews.toArray(),
      db.inboxItems.toArray(),
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.goals.toArray(),
      db.keyResults.toArray(),
    ]);

  const file: BackupFile = {
    app: "life-os",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { accounts, events, transactions, visionItems, projects, tasks, budgets, recurringTemplates, assets, deals, monthlyReviews, inboxItems, habits, habitLogs, goals, keyResults },
  };
  return JSON.stringify(file, null, 2);
}

/** Export anstoßen und als Datei herunterladen. */
export async function downloadBackup(): Promise<void> {
  const json = await exportBackup();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `life-os-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Backup importieren. `replace = true` ersetzt den kompletten Bestand,
 * sonst werden Einträge zusammengeführt (per ID überschrieben).
 */
export async function importBackup(json: string, replace = true): Promise<void> {
  const parsed = JSON.parse(json) as BackupFile;
  if (parsed.app !== "life-os" || !parsed.data) {
    throw new Error("Keine gültige Life-OS-Sicherung.");
  }

  const { data } = parsed;
  await db.transaction(
    "rw",
    [
      db.accounts,
      db.events,
      db.transactions,
      db.visionItems,
      db.projects,
      db.tasks,
      db.budgets,
      db.recurringTemplates,
      db.assets,
      db.deals,
      db.monthlyReviews,
      db.inboxItems,
      db.habits,
      db.habitLogs,
      db.goals,
      db.keyResults,
    ],
    async () => {
      if (replace) {
        await Promise.all([
          db.accounts.clear(),
          db.events.clear(),
          db.transactions.clear(),
          db.visionItems.clear(),
          db.projects.clear(),
          db.tasks.clear(),
          db.budgets.clear(),
          db.recurringTemplates.clear(),
          db.assets.clear(),
          db.deals.clear(),
          db.monthlyReviews.clear(),
          db.inboxItems.clear(),
          db.habits.clear(),
          db.habitLogs.clear(),
          db.goals.clear(),
          db.keyResults.clear(),
        ]);
      }
      await Promise.all([
        db.accounts.bulkPut((data.accounts ?? []) as never),
        db.events.bulkPut((data.events ?? []) as never),
        db.transactions.bulkPut((data.transactions ?? []) as never),
        db.visionItems.bulkPut((data.visionItems ?? []) as never),
        db.projects.bulkPut((data.projects ?? []) as never),
        db.tasks.bulkPut((data.tasks ?? []) as never),
        db.budgets.bulkPut((data.budgets ?? []) as never),
        db.recurringTemplates.bulkPut((data.recurringTemplates ?? []) as never),
        db.assets.bulkPut((data.assets ?? []) as never),
        db.deals.bulkPut((data.deals ?? []) as never),
        db.monthlyReviews.bulkPut((data.monthlyReviews ?? []) as never),
        db.inboxItems.bulkPut((data.inboxItems ?? []) as never),
        db.habits.bulkPut((data.habits ?? []) as never),
        db.habitLogs.bulkPut((data.habitLogs ?? []) as never),
        db.goals.bulkPut((data.goals ?? []) as never),
        db.keyResults.bulkPut((data.keyResults ?? []) as never),
      ]);
    },
  );
}
