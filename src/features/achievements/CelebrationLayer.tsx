import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trophy, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { channels as channelsRepo, checkins as checkinsRepo, habitLogs as habitLogsRepo, tasks as tasksRepo } from "@/data/repo";
import { checkinStreak, trackerStreaks } from "@/features/journal/checkin.utils";
import { useCustomMetrics } from "@/features/journal/useCustomMetrics";
import { useLiveStats } from "@/features/company/useLiveStats";
import { TRACKED_PLATFORMS } from "@/features/company/liveStatsHistory";
import { computeAchievements, reachedIds, type Achievement } from "./achievements";
import { Confetti } from "./Confetti";

const SEEN_KEY = "lifeos.achievementsSeen";
const PRAISE = [
  "Stark! {x} geknackt. 💪 Weiter so.",
  "Boom. {x} freigeschaltet. Nicht nachlassen.",
  "Respekt – {x}. Das ist jetzt dein Standard.",
  "{x}! Genau das meine ich. Dranbleiben.",
];

export function CelebrationLayer() {
  const { account } = useAuth();
  const accId = account?.id;
  const live = useLiveStats();
  const [celebrating, setCelebrating] = useState<Achievement | null>(null);
  const timer = useRef<number | null>(null);

  // Roh (undefined = lädt noch) – wichtig, um das Lade-Rennen zu erkennen.
  const csR = useLiveQuery(() => (accId ? checkinsRepo.list(accId) : []), [accId]);
  const hlR = useLiveQuery(() => (accId ? habitLogsRepo.list(accId) : []), [accId]);
  const tsR = useLiveQuery(() => (accId ? tasksRepo.list(accId) : []), [accId]);
  const chR = useLiveQuery(() => (accId ? channelsRepo.list(accId) : []), [accId]);
  const cs = csR ?? [];
  const hl = hlR ?? [];
  const ts = tsR ?? [];
  const ch = chR ?? [];
  const { active: customMetrics } = useCustomMetrics(accId);

  // Erst wenn ALLE Daten (inkl. Live-Stats) geladen sind, ist der Erfolgs-Stand
  // verlässlich. Vorher darf nichts gefeiert oder als „gesehen" gespeichert
  // werden – sonst wird beim Login der leere Zwischenstand als neu gefeiert.
  const dataLoaded = csR !== undefined && hlR !== undefined && tsR !== undefined && chR !== undefined && live.loaded;

  const achievements = useMemo(() => {
    const liveKinds = TRACKED_PLATFORMS.filter((k) => live.stats?.platforms[k]?.ok);
    const liveF = liveKinds.reduce((s, k) => s + (live.stats?.platforms[k]?.followers ?? 0), 0);
    const manual = ch.filter((c) => !liveKinds.includes(c.kind)).reduce((s, c) => s + (c.followers ?? 0), 0);
    return computeAchievements({
      checkinStreak: checkinStreak(new Set(cs.map((c) => c.date))),
      checkinTotal: cs.length,
      followers: liveF + manual,
      tasksDone: ts.filter((t) => t.done).length,
      habitDone: hl.length,
      trackerStreaks: trackerStreaks(cs, customMetrics).map((s) => ({ id: s.id, label: s.label, streak: s.streak })),
    });
  }, [cs, hl, ts, ch, live.stats, customMetrics]);

  const reachedKey = useMemo(() => reachedIds(achievements).sort().join(","), [achievements]);

  useEffect(() => {
    if (!accId || !dataLoaded) return; // erst mit vollständigen Daten arbeiten
    const key = `${SEEN_KEY}.${accId}`; // pro Konto, damit nichts überläuft
    const reached = reachedKey ? reachedKey.split(",").filter(Boolean) : [];

    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(key);
      seen = raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      seen = null;
    }

    const save = (ids: string[]) => {
      try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* egal */ }
    };

    if (seen === null) {
      // Erststart für dieses Konto: aktuellen Stand als „gesehen" merken – ohne
      // zu feiern (kein Konfetti-Bombardement für längst Erreichtes).
      save(reached);
      return;
    }

    const fresh = reached.filter((id) => !seen!.includes(id));
    if (fresh.length > 0) {
      // Den eindrucksvollsten neuen Erfolg feiern (höchstes Ziel).
      const best = fresh
        .map((id) => achievements.find((a) => a.id === id)!)
        .filter(Boolean)
        .sort((a, b) => b.target - a.target)[0];
      if (best) {
        setCelebrating(best);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCelebrating(null), 7000);
      }
    }
    // „Gesehen" nur ERWEITERN, nie verkleinern – so kann ein kurzzeitig
    // unvollständiger Stand nichts zurücksetzen und nichts doppelt feiern.
    if (fresh.length > 0) save([...new Set([...seen, ...reached])]);
  }, [reachedKey, accId, dataLoaded, achievements]);

  // Timer beim Verlassen aufräumen.
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  if (!celebrating) return null;
  const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)].replace("{x}", celebrating.label);

  return (
    <>
      <Confetti />
      <div className="fixed inset-x-0 bottom-6 z-[101] flex justify-center px-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex max-w-md items-center gap-3 rounded-2xl border border-warning/40 bg-card px-4 py-3 shadow-pop animate-fade-in">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Trophy size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Erfolg freigeschaltet: {celebrating.label}</p>
            <p className="text-xs text-muted-foreground">{praise}</p>
          </div>
          <button onClick={() => setCelebrating(null)} className="text-muted-foreground hover:text-foreground" aria-label="Schließen">
            <X size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
