import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Rocket, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { customMetrics as customMetricsRepo } from "@/data/repo";
import { journalToday } from "@/features/journal/checkin.utils";

/*
  Einmalige Level-up-Nachricht: Zeigt eine kurze Feier, wenn ein Ziel-Tracker
  heute ein Level aufgestiegen ist – höchstens einmal je (Tracker, Level).
*/

const SEEN_KEY = "lifeos.levelUpSeen";

function loadSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as string[]; } catch { return []; }
}
function saveSeen(ids: string[]): void {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* egal */ }
}

export function LevelUpToaster() {
  const { account } = useAuth();
  const accId = account?.id;
  const metrics = useLiveQuery(() => (accId ? customMetricsRepo.list(accId) : []), [accId]) ?? [];
  const [show, setShow] = useState<{ label: string; level: number; target: number } | null>(null);
  const timer = useRef<number | null>(null);

  const today = journalToday();
  const pending = useMemo(
    () => metrics.filter((m) => m.levelUpAt === today && (m.level ?? 1) > 1 && m.target != null),
    [metrics, today],
  );

  useEffect(() => {
    if (!accId || pending.length === 0 || show) return;
    const seen = loadSeen();
    const fresh = pending.find((m) => !seen.includes(`${m.id}-${m.level}`));
    if (!fresh) return;
    setShow({ label: fresh.label, level: fresh.level!, target: fresh.target! });
    saveSeen([...new Set([...seen, `${fresh.id}-${fresh.level}`])]);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(null), 7000);
  }, [accId, pending, show]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-[101] flex justify-center px-4">
      <div className="flex max-w-md items-center gap-3 rounded-2xl border border-primary/40 bg-card px-4 py-3 shadow-pop animate-fade-in">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Rocket size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Level {show.level}: {show.label} 🚀</p>
          <p className="text-xs text-muted-foreground">Eine Woche durchgezogen – dein Ziel steigt auf {show.target}. Stark, weiter so.</p>
        </div>
        <button onClick={() => setShow(null)} className="text-muted-foreground hover:text-foreground" aria-label="Schließen"><X size={16} /></button>
      </div>
    </div>
  );
}
