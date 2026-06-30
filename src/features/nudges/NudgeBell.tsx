import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Bell, BellRing, CalendarDays, Check, HardDriveDownload, ListChecks, NotebookPen, Repeat, Wallet, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkins, events, habitLogs, habits, tasks, transactions } from "@/data/repo";
import { lastBackupAt } from "@/data/backup";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { computeNudges, type Nudge, type NudgeKind } from "./nudges";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const KIND_ICON: Record<NudgeKind, LucideIcon> = {
  checkin: NotebookPen,
  habits: Repeat,
  tasks: ListChecks,
  payment: Wallet,
  events: CalendarDays,
  backup: HardDriveDownload,
};

const DOT: Record<Nudge["severity"], string> = {
  high: "bg-destructive",
  due: "bg-warning",
  info: "bg-primary",
};

const NOTIFY_KEY = "lifeos.lastNudgeNotify";

export function NudgeBell() {
  const { account } = useAuth();
  const accId = account?.id;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>(typeof Notification !== "undefined" ? Notification.permission : "denied");
  const ref = useRef<HTMLDivElement>(null);

  const cs = useLiveQuery(() => (accId ? checkins.list(accId) : []), [accId]) ?? [];
  const hs = useLiveQuery(() => (accId ? habits.list(accId) : []), [accId]) ?? [];
  const hl = useLiveQuery(() => (accId ? habitLogs.list(accId) : []), [accId]) ?? [];
  const ts = useLiveQuery(() => (accId ? tasks.list(accId) : []), [accId]) ?? [];
  const tx = useLiveQuery(() => (accId ? transactions.list(accId) : []), [accId]) ?? [];
  const ev = useLiveQuery(() => (accId ? events.list(accId) : []), [accId]) ?? [];

  const nudges = useMemo(
    () => computeNudges({ today: todayKey(), now: new Date(), checkins: cs, habits: hs, habitLogs: hl, tasks: ts, transactions: tx, events: ev, lastBackup: lastBackupAt() }),
    [cs, hs, hl, ts, tx, ev],
  );

  const urgent = nudges.filter((n) => n.severity !== "info").length;
  const count = nudges.length;

  // Außerhalb klicken schließt das Panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Geräte-Benachrichtigung: höchstens einmal pro Tag, nur bei dringenden Punkten.
  useEffect(() => {
    if (perm !== "granted" || urgent === 0) return;
    const today = todayKey();
    if (localStorage.getItem(NOTIFY_KEY) === today) return;
    localStorage.setItem(NOTIFY_KEY, today);
    const top = nudges.find((n) => n.severity !== "info") ?? nudges[0];
    const body = `${urgent} ${urgent === 1 ? "Sache ist" : "Sachen sind"} dran${top ? ` – z. B. ${top.title}` : ""}.`;
    try {
      navigator.serviceWorker?.ready
        .then((reg) => reg.showNotification("Life-OS", { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, tag: "lifeos-nudges" }))
        .catch(() => new Notification("Life-OS", { body }));
    } catch {
      /* Benachrichtigung „best effort" */
    }
  }, [perm, urgent, nudges]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  }

  function go(n: Nudge) {
    setOpen(false);
    navigate(n.to);
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Erinnerungen" className={cn(urgent > 0 && "text-primary")}>
        {urgent > 0 ? <BellRing size={18} /> : <Bell size={18} />}
        {count > 0 && (
          <span className={cn("absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white", urgent > 0 ? "bg-destructive" : "bg-primary")}>
            {count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-fade-in rounded-2xl border border-border bg-card p-2 shadow-pop">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold">Erinnerungen</p>
            {count > 0 && <span className="text-xs text-muted-foreground">{count} offen</span>}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success"><Check size={20} /></span>
              <p className="text-sm font-medium">Alles erledigt 🎉</p>
              <p className="text-xs text-muted-foreground">Keine offenen Punkte für heute.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {nudges.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <li key={n.id}>
                    <button onClick={() => go(n)} className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-secondary/60">
                      <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/80">
                        <Icon size={16} />
                        <span className={cn("absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", DOT[n.severity])} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{n.title}</span>
                        {n.detail && <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {perm === "default" && (
            <button onClick={enableNotifications} className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/60">
              <BellRing size={14} /> Geräte-Erinnerungen aktivieren
            </button>
          )}
          {perm === "granted" && (
            <p className="px-3 py-1.5 text-[11px] text-muted-foreground">Geräte-Erinnerungen aktiv (während die App geöffnet ist).</p>
          )}
        </div>
      )}
    </div>
  );
}
