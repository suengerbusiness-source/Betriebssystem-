import { useEffect } from "react";
import { CheckCircle2, RefreshCw, X } from "lucide-react";
import { usePWA } from "@/context/PWAContext";
import { Button } from "@/components/ui/Button";

/*
  Dezenter Hinweis unten:
   - "Offline bereit" nach erster Installation des Service Workers
   - "Update verfügbar" wenn eine neue Version geladen wurde
*/
export function PWAToast() {
  const { needRefresh, offlineReady, applyUpdate, dismissOfflineReady } = usePWA();

  // Offline-Hinweis nach kurzer Zeit automatisch ausblenden.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(dismissOfflineReady, 5000);
    return () => clearTimeout(t);
  }, [offlineReady, dismissOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-in sm:left-auto sm:right-4 sm:translate-x-0">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-xl">
        {needRefresh ? (
          <>
            <RefreshCw size={18} className="shrink-0 text-primary" />
            <p className="flex-1 text-sm">Eine neue Version ist verfügbar.</p>
            <Button size="sm" onClick={applyUpdate}>
              Aktualisieren
            </Button>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} className="shrink-0 text-success" />
            <p className="flex-1 text-sm">Life-OS ist jetzt offline einsatzbereit.</p>
            <button
              onClick={dismissOfflineReady}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Schließen"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
