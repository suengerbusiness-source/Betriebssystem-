import { useState } from "react";
import { BellRing, CheckCircle2, ExternalLink, Send } from "lucide-react";
import { clearNtfyTopic, getNtfyTopic, isValidTopic, sendTestNotification, setNtfyTopic, suggestTopic } from "@/data/reminders";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

/*
  Einrichtung der Hintergrund-Erinnerungen (ntfy.sh). Erinnerungen kommen auch
  bei geschlossener App auf dem Handy an – über die kostenlose ntfy-App.
*/
export function RemindersCard() {
  const saved = getNtfyTopic();
  const [topic, setTopic] = useState(saved ?? suggestTopic());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function save() {
    if (!isValidTopic(topic)) {
      setStatus("Bitte 6–64 Zeichen, nur Buchstaben/Zahlen/-/_.");
      return;
    }
    setNtfyTopic(topic);
    setStatus("Thema gespeichert.");
  }

  async function test() {
    if (!isValidTopic(topic)) {
      setStatus("Erst ein gültiges Thema eintragen.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await sendTestNotification(topic);
      setStatus("Test gesendet – schau in die ntfy-App. Kommt nichts an, prüfe das abonnierte Thema.");
    } catch {
      setStatus("Konnte den Test nicht senden (Internet/Thema prüfen).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Hintergrund-Erinnerungen (auch bei geschlossener App)"
        subtitle="Dein Coach meldet sich – Abend-Check-in, Wochenrückblick & gelegentliche Kicks. Kostenlos über die ntfy-App."
        icon={<BellRing size={18} />}
      />
      <CardContent className="space-y-4">
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>
            Lade die App <strong className="text-foreground">„ntfy"</strong> aufs Handy (App Store / Google Play) –
            oder öffne <a href="https://ntfy.sh/app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">ntfy.sh/app <ExternalLink size={12} /></a>.
          </li>
          <li>Denk dir unten ein <strong className="text-foreground">geheimes Thema</strong> aus (wie ein Passwort) und <strong className="text-foreground">abonniere genau dieses</strong> in der ntfy-App.</li>
          <li>Trag dasselbe Thema bei GitHub als Secret <code className="rounded bg-secondary px-1">NTFY_TOPIC</code> ein (Settings → Secrets → Actions). Dann verschickt der Zeitplan die Erinnerungen.</li>
        </ol>

        <div>
          <Label htmlFor="ntfy-topic">Geheimes Thema</Label>
          <div className="flex gap-2">
            <Input id="ntfy-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="lifeos-xxxxxx" className="h-9" />
            <Button onClick={save} className="h-9">Speichern</Button>
            <Button variant="outline" onClick={test} disabled={busy} className="h-9">
              <Send size={15} /> {busy ? "Senden…" : "Test"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Wähl etwas schwer Erratbares – wer dein Thema kennt, kann dir Nachrichten schicken.</p>
        </div>

        {status && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 size={15} className="text-success" /> {status}
          </p>
        )}

        {saved && (
          <button onClick={() => { clearNtfyTopic(); setStatus("Thema entfernt."); }} className="text-xs text-muted-foreground hover:text-destructive">
            Thema entfernen
          </button>
        )}
      </CardContent>
    </Card>
  );
}
