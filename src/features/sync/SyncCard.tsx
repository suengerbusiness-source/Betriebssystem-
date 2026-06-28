import { useState } from "react";
import { CheckCircle2, Cloud, CloudOff, LogIn, LogOut, RefreshCw } from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { clearCloudUrl, getCloudUrl, setCloudUrl } from "@/data/sync";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

/*
  Geräte-Sync (Dexie Cloud) – Einrichtung & Status.
  Gated: Ohne URL bleibt die App rein lokal. Nach Eintragen der URL + Neuladen
  wird das Cloud-Addon aktiv und man kann sich per E-Mail anmelden.
*/
export function SyncCard() {
  const { enabled, user, phase, login, logout } = useSync();
  const currentUrl = getCloudUrl();
  const [url, setUrl] = useState(currentUrl ?? "");
  const [busy, setBusy] = useState(false);

  function activate() {
    if (!url.trim().startsWith("https://")) return;
    setCloudUrl(url.trim());
    location.reload(); // DB mit Addon neu aufbauen
  }

  function deactivate() {
    if (!confirm("Sync deaktivieren? Die App läuft danach wieder rein lokal. Deine Daten bleiben erhalten.")) return;
    clearCloudUrl();
    location.reload();
  }

  async function doLogin() {
    setBusy(true);
    try {
      await login();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Geräte-Sync (Dexie Cloud)"
        subtitle="iPad & Handy auf demselben Stand halten – Ende-zu-Ende-fähig, offline-first."
        icon={enabled ? <Cloud size={18} /> : <CloudOff size={18} />}
      />
      <CardContent className="space-y-4">
        {!currentUrl ? (
          <>
            <p className="text-sm text-muted-foreground">
              Noch nicht eingerichtet. So aktivierst du den Sync (einmalig am Laptop):
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Im Projektordner <code className="rounded bg-secondary px-1">npx dexie-cloud create</code> ausführen.</li>
              <li>E-Mail bestätigen – du bekommst eine Datenbank-URL (<code className="rounded bg-secondary px-1">https://…dexie.cloud</code>).</li>
              <li>URL hier eintragen und aktivieren.</li>
            </ol>
            <div>
              <Label htmlFor="sync-url">Datenbank-URL</Label>
              <div className="flex gap-2">
                <Input id="sync-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.dexie.cloud" className="h-9" />
                <Button onClick={activate} disabled={!url.trim().startsWith("https://")} className="h-9">
                  Aktivieren
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                  enabled ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground",
                )}
              >
                {enabled ? <CheckCircle2 size={15} /> : <CloudOff size={15} />}
                {enabled ? "Sync aktiv" : "Wird geladen…"}
              </span>
              {phase && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw size={13} /> {phase}
                </span>
              )}
            </div>

            <div className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Angemeldet als</span>
                <span className="font-medium">{user?.isLoggedIn ? user.email ?? user.name : "— nicht angemeldet —"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user?.isLoggedIn ? (
                <Button variant="outline" onClick={() => logout()}>
                  <LogOut size={16} /> Abmelden
                </Button>
              ) : (
                <Button onClick={doLogin} disabled={busy}>
                  <LogIn size={16} /> {busy ? "Öffne Anmeldung…" : "Per E-Mail anmelden"}
                </Button>
              )}
              <Button variant="ghost" onClick={deactivate} className="text-muted-foreground">
                Sync deaktivieren
              </Button>
            </div>

            <p className="break-all text-xs text-muted-foreground">URL: {currentUrl}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
