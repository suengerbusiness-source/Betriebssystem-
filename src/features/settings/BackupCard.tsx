import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Download, History, Info, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createSnapshot, deleteSnapshot, downloadBackup, importBackup, lastBackupAt, listSnapshots, restoreSnapshot } from "@/data/backup";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const fmtWhen = (ms: number) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(ms);
const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function BackupCard() {
  const { refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const snapshots = useLiveQuery(() => listSnapshots(), []) ?? [];
  const since = daysSince(lastBackupAt());

  async function onExport() {
    await downloadBackup();
    setStatus("Backup heruntergeladen. Leg die Datei sicher ab (z. B. Cloud-Speicher).");
  }

  async function onSnapshot() {
    const s = await createSnapshot("Manuell");
    setStatus(s ? "Lokaler Schnappschuss angelegt." : "Datenmenge zu groß für einen lokalen Schnappschuss – nutze den Datei-Export.");
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Import ersetzt alle aktuellen Daten. Vorher wird automatisch ein Schnappschuss angelegt. Fortfahren?")) {
      e.target.value = "";
      return;
    }
    try {
      await createSnapshot("Vor Import").catch(() => {});
      const text = await file.text();
      await importBackup(text, true);
      await refresh();
      setStatus("Backup erfolgreich importiert.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import fehlgeschlagen.");
    } finally {
      e.target.value = "";
    }
  }

  async function onRestore(id: string) {
    if (!confirm("Diesen Schnappschuss wiederherstellen? Der aktuelle Stand wird vorher gesichert.")) return;
    try {
      await restoreSnapshot(id);
      await refresh();
      setStatus("Aus Schnappschuss wiederhergestellt.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Wiederherstellung fehlgeschlagen.");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Backup & Wiederherstellung"
        subtitle="Alle Daten exportieren, lokale Schnappschüsse anlegen und Fehlgriffe rückgängig machen."
        icon={<Download size={18} />}
      />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onExport}><Download size={18} /> Exportieren (Datei)</Button>
          <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={18} /> Importieren</Button>
          <Button variant="outline" onClick={onSnapshot}><Save size={18} /> Lokal sichern</Button>
        </div>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock size={15} />
          {since === null
            ? "Noch keine Datei-Sicherung – exportiere einmal und leg die Datei sicher ab."
            : since === 0
              ? "Letzte Datei-Sicherung: heute."
              : `Letzte Datei-Sicherung: vor ${since} ${since === 1 ? "Tag" : "Tagen"}.`}
        </p>

        {/* Lokale Schnappschüsse */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <History size={13} /> Lokale Schnappschüsse (auf diesem Gerät)
          </p>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Schnappschüsse. Die App legt automatisch täglich einen an.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{fmtWhen(s.createdAt)} · {fmtSize(s.size)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onRestore(s.id)}><RotateCcw size={14} /> Wiederherstellen</Button>
                  <button onClick={() => deleteSnapshot(s.id)} className="text-muted-foreground hover:text-destructive" aria-label="Löschen"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Schnappschüsse schützen vor Fehlgriffen auf <strong className="text-foreground">diesem Gerät</strong>. Gegen Geräteverlust hilft nur der
            <strong className="text-foreground"> Datei-Export</strong> (oder der Geräte-Sync oben).
          </p>
        </div>

        {status && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Info size={15} /> {status}</p>
        )}
      </CardContent>
    </Card>
  );
}
