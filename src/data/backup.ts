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
    goals: unknown[];
  };
}

const BACKUP_VERSION = 1;

/** Gesamten Datenbestand als JSON-String exportieren. */
export async function exportBackup(): Promise<string> {
  const [accounts, events, transactions, visionItems, projects, goals] =
    await Promise.all([
      db.accounts.toArray(),
      db.events.toArray(),
      db.transactions.toArray(),
      db.visionItems.toArray(),
      db.projects.toArray(),
      db.goals.toArray(),
    ]);

  const file: BackupFile = {
    app: "life-os",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { accounts, events, transactions, visionItems, projects, goals },
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
    [db.accounts, db.events, db.transactions, db.visionItems, db.projects, db.goals],
    async () => {
      if (replace) {
        await Promise.all([
          db.accounts.clear(),
          db.events.clear(),
          db.transactions.clear(),
          db.visionItems.clear(),
          db.projects.clear(),
          db.goals.clear(),
        ]);
      }
      await Promise.all([
        db.accounts.bulkPut((data.accounts ?? []) as never),
        db.events.bulkPut((data.events ?? []) as never),
        db.transactions.bulkPut((data.transactions ?? []) as never),
        db.visionItems.bulkPut((data.visionItems ?? []) as never),
        db.projects.bulkPut((data.projects ?? []) as never),
        db.goals.bulkPut((data.goals ?? []) as never),
      ]);
    },
  );
}
