import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { registerSW } from "virtual:pwa-register";

/*
  Kapselt alles rund um die installierbare/offline-fähige App:
   - Service-Worker-Registrierung + Update-Erkennung
   - "beforeinstallprompt" abfangen, damit wir einen eigenen Installieren-Button
     anbieten können (Android/Chrome/Edge).
   - iOS hat kein Prompt-API -> dort zeigen wir eine kurze Anleitung.
*/
interface PWACtx {
  /** Update steht bereit (neue Version im Hintergrund geladen). */
  needRefresh: boolean;
  /** App ist offline einsatzbereit. */
  offlineReady: boolean;
  /** Installation möglich (Browser hat ein Prompt angeboten). */
  canInstall: boolean;
  /** Läuft bereits als installierte App? */
  isInstalled: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<void>;
  applyUpdate: () => void;
  dismissOfflineReady: () => void;
}

const Ctx = createContext<PWACtx | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateFn, setUpdateFn] = useState<(() => void) | null>(null);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !/crios|fxios/i.test(navigator.userAgent);

  const isInstalled =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // iOS-spezifisch
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });
    setUpdateFn(() => update);

    const onPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function applyUpdate() {
    updateFn?.();
    setNeedRefresh(false);
  }

  return (
    <Ctx.Provider
      value={{
        needRefresh,
        offlineReady,
        canInstall: !!deferredPrompt,
        isInstalled,
        isIOS,
        promptInstall,
        applyUpdate,
        dismissOfflineReady: () => setOfflineReady(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePWA() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePWA muss innerhalb von PWAProvider stehen");
  return ctx;
}
