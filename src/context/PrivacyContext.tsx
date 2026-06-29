import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setAmountsHidden } from "@/lib/format";

/*
  Privatsphäre-Modus: blendet alle Geldbeträge in der gesamten App aus, damit
  man die App vorzeigen kann, ohne Finanzen preiszugeben. Die eigentliche
  Maskierung passiert zentral in lib/format.ts; dieser Context hält den Zustand,
  persistiert ihn und sorgt über die Konsumenten (z. B. die Topbar) dafür, dass
  die Oberfläche beim Umschalten neu rendert.
*/

const STORAGE_KEY = "lifeos.hideAmounts";

interface PrivacyContextValue {
  hideAmounts: boolean;
  toggle: () => void;
  setHide: (v: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function initialHidden(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideAmounts, setHide] = useState(initialHidden);

  // Modul-Flag synchron halten, BEVOR die Kinder rendern (gleicher Durchlauf).
  setAmountsHidden(hideAmounts);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, hideAmounts ? "1" : "0");
    } catch {
      /* localStorage nicht verfügbar – egal */
    }
  }, [hideAmounts]);

  const toggle = useCallback(() => setHide((v) => !v), []);
  const value = useMemo<PrivacyContextValue>(() => ({ hideAmounts, toggle, setHide }), [hideAmounts, toggle]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used within a PrivacyProvider");
  return ctx;
}
