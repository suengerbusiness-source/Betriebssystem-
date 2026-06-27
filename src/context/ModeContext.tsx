import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ModeFilter, Transaction, TxMode } from "@/data/types";

/*
  Globaler Finanz-Modus: Business / Privat / Beides.
  Steuert, welche Buchungen in den Finanz- und Analyse-Ansichten gezählt werden.
  Wird in localStorage gemerkt, damit die Wahl einen Neustart überlebt.
*/
interface ModeCtx {
  mode: ModeFilter;
  setMode: (m: ModeFilter) => void;
  /** Standard-Modus für neue Buchungen, wenn „Beides" aktiv ist. */
  defaultMode: TxMode;
}

const Ctx = createContext<ModeCtx | null>(null);
const STORAGE_KEY = "life-os.financeMode";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ModeFilter>(
    () => (localStorage.getItem(STORAGE_KEY) as ModeFilter | null) ?? "both",
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Bei aktivem Einzelmodus erben neue Buchungen diesen, sonst „privat".
  const defaultMode: TxMode = mode === "business" ? "business" : "private";

  return <Ctx.Provider value={{ mode, setMode: setModeState, defaultMode }}>{children}</Ctx.Provider>;
}

export function useMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMode muss innerhalb von ModeProvider stehen");
  return ctx;
}

/** Prüft, ob eine Buchung zum aktiven Modus-Filter passt (Altdaten = privat). */
export function txMatchesMode(tx: Transaction, filter: ModeFilter): boolean {
  if (filter === "both") return true;
  return (tx.mode ?? "private") === filter;
}
