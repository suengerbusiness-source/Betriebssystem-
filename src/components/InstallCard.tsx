import { CheckCircle2, Download, Share, Smartphone } from "lucide-react";
import { usePWA } from "@/context/PWAContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/*
  Installationskarte für die Einstellungen.
  - Bereits installiert -> Bestätigung.
  - Android/Chrome/Edge -> echter Installieren-Button (beforeinstallprompt).
  - iOS -> Kurzanleitung "Teilen → Zum Home-Bildschirm".
*/
export function InstallCard() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWA();

  return (
    <Card>
      <CardHeader
        title="Als App installieren"
        subtitle="Life-OS auf Handy, iPad oder Desktop installieren – offline nutzbar."
        icon={<Smartphone size={18} />}
      />
      <CardContent>
        {isInstalled ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 size={16} /> Life-OS ist installiert. 🎉
          </p>
        ) : canInstall ? (
          <Button onClick={promptInstall}>
            <Download size={18} /> Jetzt installieren
          </Button>
        ) : isIOS ? (
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">So installierst du Life-OS auf dem iPhone/iPad:</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Tippe in Safari unten auf <Share size={14} className="inline" /> <strong>Teilen</strong>.
              </li>
              <li>
                Wähle <strong>„Zum Home-Bildschirm"</strong>.
              </li>
              <li>
                Bestätige mit <strong>„Hinzufügen"</strong>.
              </li>
            </ol>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Öffne Life-OS in Chrome oder Edge und nutze „Installieren" in der
            Adressleiste bzw. im Browser-Menü. (Im Entwicklungsmodus ist die
            Installation noch nicht aktiv – erst im Produktions-Build.)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
