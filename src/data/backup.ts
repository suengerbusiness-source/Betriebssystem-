/*
  Backup: Export/Import ALLER Daten als JSON + lokale Auto-Schnappschüsse.

  „Wasserdicht": Der Export geht generisch über db.tables – jede (auch künftige)
  Tabelle ist automatisch dabei, nichts wird vergessen. Zusätzlich legt die App
  lokale Schnappschüsse an, um Fehlgriffe (versehentliches Löschen / falscher
  Import) rückgängig machen zu können.
*/
import { db } from "./db";
import { uid } from "@/lib/crypto";
import type { BackupSnapshot } from "./types";

const BACKUP_VERSION = 14;
/** Diese interne Tabelle gehört NICHT in den Export (sonst Backups-in-Backups). */
const EXCLUDE = new Set(["backups"]);
/** Auto-Schnappschüsse oberhalb dieser Größe überspringen (Speicher schonen). */
const MAX_SNAPSHOT_BYTES = 6 * 1024 * 1024;
const KEEP_SNAPSHOTS = 3;
const LAST_BACKUP_KEY = "lifeos.lastBackupAt";

export interface BackupFile {
  app: "life-os";
  version: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

function exportTables() {
  return db.tables.filter((t) => !EXCLUDE.has(t.name));
}

/** Gesamten Datenbestand als JSON-String exportieren (alle Tabellen). */
export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  await Promise.all(exportTables().map(async (t) => { data[t.name] = await t.toArray(); }));
  const file: BackupFile = { app: "life-os", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
  return JSON.stringify(file, null, 2);
}

/** Export anstoßen und als Datei herunterladen (zählt als „echte" Sicherung). */
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
  try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch { /* egal */ }
}

/** Zeitpunkt der letzten heruntergeladenen Sicherung (oder null). */
export function lastBackupAt(): string | null {
  try { return localStorage.getItem(LAST_BACKUP_KEY); } catch { return null; }
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
  const data = parsed.data;
  const tables = exportTables();
  await db.transaction("rw", tables, async () => {
    if (replace) await Promise.all(tables.map((t) => t.clear()));
    await Promise.all(
      tables
        .filter((t) => Array.isArray(data[t.name]))
        .map((t) => t.bulkPut((data[t.name] ?? []) as never)),
    );
  });
}

/* -------------------- Lokale Auto-Schnappschüsse -------------------- */

/** Einen Schnappschuss anlegen (mit Größen-Begrenzung) und alte ausdünnen. */
export async function createSnapshot(label = "Automatisch"): Promise<BackupSnapshot | null> {
  const json = await exportBackup();
  const size = new Blob([json]).size;
  if (size > MAX_SNAPSHOT_BYTES) return null; // zu groß (z. B. viele Bilder) -> überspringen
  const snap: BackupSnapshot = { id: uid(), createdAt: Date.now(), label, size, json };
  await db.backups.add(snap);
  // Nur die neuesten KEEP_SNAPSHOTS behalten.
  const all = await db.backups.orderBy("createdAt").reverse().toArray();
  const stale = all.slice(KEEP_SNAPSHOTS);
  if (stale.length) await db.backups.bulkDelete(stale.map((s) => s.id));
  return snap;
}

/** Höchstens ein automatischer Schnappschuss pro Kalendertag. */
export async function maybeDailySnapshot(): Promise<void> {
  const since = Date.now() - 20 * 60 * 60 * 1000; // ~1 Tag
  const recent = await db.backups.where("createdAt").above(since).filter((s) => s.label === "Automatisch").count();
  if (recent > 0) return;
  await createSnapshot("Automatisch").catch(() => {});
}

/** Übersicht der vorhandenen Schnappschüsse (ohne den großen JSON-Inhalt). */
export async function listSnapshots(): Promise<Omit<BackupSnapshot, "json">[]> {
  const all = await db.backups.orderBy("createdAt").reverse().toArray();
  return all.map(({ json: _json, ...meta }) => meta);
}

/** Aus einem Schnappschuss wiederherstellen (legt vorher einen Sicherungs-Snapshot an). */
export async function restoreSnapshot(id: string): Promise<void> {
  const snap = await db.backups.get(id);
  if (!snap) throw new Error("Schnappschuss nicht gefunden.");
  await createSnapshot("Vor Wiederherstellung").catch(() => {});
  await importBackup(snap.json, true);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.backups.delete(id);
}
