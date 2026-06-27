import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, Timer, Trash2 } from "lucide-react";
import { timeEntries } from "@/data/repo";
import type { TimeEntry } from "@/data/types";
import { todayISODate, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { formatDuration } from "./profit.utils";

const TIMER_KEY = "life-os.timer";

type RunningTimer = { projectId: string; startedAt: number } | null;

function readTimer(): RunningTimer {
  try {
    return JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
  } catch {
    return null;
  }
}

/*
  Zeiterfassung je Projekt: persistenter Stoppuhr-Timer (übersteht Reload via
  localStorage) + manuelle Einträge. Beim Stoppen wird ein Zeiteintrag angelegt.
*/
export function TimeTracker({
  accountId,
  projectId,
  entries,
}: {
  accountId: string;
  projectId: string;
  entries: TimeEntry[];
}) {
  const [timer, setTimer] = useState<RunningTimer>(() => readTimer());
  const [, forceTick] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const isRunningHere = timer?.projectId === projectId;

  // Live-Ticker, solange ein Timer für DIESES Projekt läuft.
  useEffect(() => {
    if (isRunningHere) {
      intervalRef.current = window.setInterval(() => forceTick((n) => n + 1), 1000);
      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      };
    }
  }, [isRunningHere]);

  function start() {
    const t = { projectId, startedAt: Date.now() };
    localStorage.setItem(TIMER_KEY, JSON.stringify(t));
    setTimer(t);
  }

  async function stop() {
    if (!timer) return;
    const minutes = Math.max(1, Math.round((Date.now() - timer.startedAt) / 60000));
    await timeEntries.create({ accountId, projectId, minutes, date: todayISODate(), description: "Timer" });
    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
  }

  const elapsed = isRunningHere && timer ? Math.floor((Date.now() - timer.startedAt) / 1000) : 0;
  const elapsedLabel = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  // Manueller Eintrag
  const [mDate, setMDate] = useState(todayISODate());
  const [mDesc, setMDesc] = useState("");
  const [mHours, setMHours] = useState("");

  async function addManual() {
    const hours = Number(mHours.replace(",", "."));
    if (!Number.isFinite(hours) || hours <= 0) return;
    await timeEntries.create({ accountId, projectId, minutes: Math.round(hours * 60), date: mDate, description: mDesc.trim() || undefined });
    setMDesc("");
    setMHours("");
  }

  const projectEntries = entries.filter((e) => e.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const totalMinutes = projectEntries.reduce((s, e) => s + e.minutes, 0);

  return (
    <div className="rounded-md border border-border p-3">
      <Label className="mb-2 flex items-center gap-1.5">
        <Timer size={15} /> Zeiterfassung · gesamt {formatDuration(totalMinutes)}
      </Label>

      {/* Stoppuhr */}
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5">
        {isRunningHere ? (
          <>
            <span className="font-mono text-lg font-semibold tabular-nums">{elapsedLabel}</span>
            <Button type="button" size="sm" variant="destructive" onClick={stop} className="ml-auto">
              <Pause size={15} /> Stopp
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">{timer ? "Timer läuft in anderem Projekt" : "Bereit"}</span>
            <Button type="button" size="sm" onClick={start} disabled={!!timer} className="ml-auto">
              <Play size={15} /> Start
            </Button>
          </>
        )}
      </div>

      {/* Manueller Eintrag */}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-32">
          <Label htmlFor="te-date" className="text-xs">Datum</Label>
          <Input id="te-date" type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className="h-8" />
        </div>
        <div className="min-w-[8rem] flex-1">
          <Label htmlFor="te-desc" className="text-xs">Tätigkeit</Label>
          <Input id="te-desc" value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="optional" className="h-8" />
        </div>
        <div className="w-20">
          <Label htmlFor="te-h" className="text-xs">Stunden</Label>
          <Input id="te-h" inputMode="decimal" value={mHours} onChange={(e) => setMHours(e.target.value)} placeholder="1,5" className="h-8" />
        </div>
        <Button type="button" variant="secondary" size="icon" onClick={addManual} className="h-8 w-8" aria-label="Zeit hinzufügen">
          <Plus size={15} />
        </Button>
      </div>

      {projectEntries.length > 0 && (
        <ul className="space-y-1">
          {projectEntries.slice(0, 8).map((e) => (
            <li key={e.id} className="group flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{formatDate(e.date, "d. MMM")}</span>
              <span className="min-w-0 flex-1 truncate">{e.description || "—"}</span>
              <span className="shrink-0 font-medium tabular-nums">{formatDuration(e.minutes)}</span>
              <button type="button" onClick={() => timeEntries.remove(e.id)} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Eintrag löschen">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
