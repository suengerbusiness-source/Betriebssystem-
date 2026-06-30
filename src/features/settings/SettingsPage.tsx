import { useRef, useState } from "react";
import { Download, Info, Monitor, ShieldAlert, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { downloadBackup, importBackup } from "@/data/backup";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InstallCard } from "@/components/InstallCard";
import { TaxExportCard } from "@/features/tax/TaxExportCard";
import { SyncCard } from "@/features/sync/SyncCard";
import { RemindersCard } from "@/features/nudges/RemindersCard";

export function SettingsPage() {
  const { account, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onExport() {
    await downloadBackup();
    setStatus("Backup heruntergeladen.");
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Import ersetzt alle aktuellen Daten. Fortfahren?")) {
      e.target.value = "";
      return;
    }
    try {
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

  return (
    <div className="space-y-6">
      <PageHeader title="Einstellungen" subtitle="Konto, Erscheinungsbild, Backup & Sicherheit." />

      {/* Geräte-Sync (Dexie Cloud) */}
      <SyncCard />

      {/* Hintergrund-Erinnerungen (ntfy) */}
      <RemindersCard />

      {/* Steuer & EÜR-Export */}
      <TaxExportCard />

      {/* App-Installation (PWA) */}
      <InstallCard />

      {/* Konto */}
      <Card>
        <CardHeader title="Konto" icon={<Monitor size={18} />} />
        <CardContent className="text-sm">
          <div className="flex justify-between border-b border-border py-2">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{account?.name}</span>
          </div>
          {account?.greetingName && (
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">Begrüßungsname</span>
              <span className="font-medium">{account.greetingName}</span>
            </div>
          )}
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Konto erstellt</span>
            <span className="font-medium">
              {account ? new Date(account.createdAt).toLocaleDateString("de-DE") : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Erscheinungsbild */}
      <Card>
        <CardHeader title="Erscheinungsbild" />
        <CardContent>
          <div className="grid max-w-xs grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-md border p-3 text-sm font-medium transition-colors ${
                  theme === t ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                }`}
              >
                {t === "dark" ? "Dunkel" : "Hell"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader
          title="Backup & Daten"
          subtitle="Exportiere alle Daten als JSON oder stelle ein Backup wieder her."
          icon={<Download size={18} />}
        />
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onExport}>
              <Download size={18} /> Exportieren
            </Button>
            <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload size={18} /> Importieren
            </Button>
          </div>
          {status && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Info size={15} /> {status}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sicherheits-Hinweis (ehrlich, kein falsches Versprechen) */}
      <Card className="border-warning/40">
        <CardHeader title="Sicherheit – ehrlich gesagt" icon={<ShieldAlert size={18} />} />
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Deine Daten liegen <strong className="text-foreground">lokal</strong> in diesem Browser
            (IndexedDB). Passwörter werden nur als Hash gespeichert (PBKDF2), nie im Klartext.
          </p>
          <p>
            Wichtig: Das Passwort schützt den Login, <strong className="text-foreground">verschlüsselt
            aber nicht</strong> die gespeicherten Daten. Wer Zugriff auf dieses entsperrte Gerät/Profil
            hat, kann die Daten lesen. Eine echte Datenbank-Verschlüsselung mit Master-Passwort ist als
            spätere Erweiterung vorgesehen. Mache regelmäßig ein Backup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
