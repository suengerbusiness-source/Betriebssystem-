import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { isSameDay, isAfter, parseISO, startOfDay } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { events, projects, tasks, transactions, visionItems } from "@/data/repo";
import { colorHex } from "@/data/types";
import { formatCurrency, formatDate, formatTime, greetingForHour } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { currentMonthKey, summarizeMonth } from "@/features/finance/finance.utils";
import { BriefingCard } from "./BriefingCard";

export function DashboardPage() {
  const { account } = useAuth();
  const accId = account?.id;

  const evs = useLiveQuery(() => (accId ? events.list(accId) : []), [accId]) ?? [];
  const txs = useLiveQuery(() => (accId ? transactions.list(accId) : []), [accId]) ?? [];
  const vision = useLiveQuery(() => (accId ? visionItems.list(accId) : []), [accId]) ?? [];
  const allProjects = useLiveQuery(() => (accId ? projects.list(accId) : []), [accId]) ?? [];
  const allTasks = useLiveQuery(() => (accId ? tasks.list(accId) : []), [accId]) ?? [];

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const name = account?.greetingName || account?.name || "";

  const todayEvents = useMemo(
    () => evs.filter((e) => isSameDay(parseISO(e.start), now)).sort((a, b) => a.start.localeCompare(b.start)),
    [evs],
  );

  const upcoming = useMemo(() => {
    const today0 = startOfDay(now);
    return evs
      .filter((e) => isAfter(parseISO(e.start), today0) || isSameDay(parseISO(e.start), now))
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 5);
  }, [evs]);

  const month = summarizeMonth(txs, currentMonthKey());

  const openTasks = allTasks.filter((t) => !t.done);
  const activeProjects = useMemo(
    () => allProjects.filter((p) => p.status === "active").sort((a, b) => a.order - b.order),
    [allProjects],
  );
  const taskStat = (projectId: string) => {
    const list = allTasks.filter((t) => t.projectId === projectId);
    const done = list.filter((t) => t.done).length;
    return { done, total: list.length };
  };
  const visionHighlight = vision[Math.floor(Math.random() * Math.max(vision.length, 1))];

  return (
    <div className="space-y-6">
      {/* Daily Briefing */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card sm:p-7">
        {/* Dezente Akzent-Aura für das Cockpit-Gefühl. */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarDays size={13} /> {formatDate(now, "EEEE, d. MMMM yyyy")}
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting}, {name}!
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Heute stehen <strong className="text-foreground">{todayEvents.length}</strong>{" "}
            {todayEvents.length === 1 ? "Termin" : "Termine"} an. Dein Monatssaldo liegt bei{" "}
            <strong className={month.balance >= 0 ? "text-success" : "text-destructive"}>
              {formatCurrency(month.balance)}
            </strong>
            {month.balance >= 0 ? " – im Plan. " : " – behalte die Ausgaben im Blick. "}
            {openTasks.length > 0
              ? `Außerdem warten ${openTasks.length} offene ${openTasks.length === 1 ? "Aufgabe" : "Aufgaben"}.`
              : vision.length > 0
                ? "Vergiss deine Vision nicht."
                : ""}
          </p>
        </div>
      </div>

      {/* Lagebericht / Command-Center */}
      <BriefingCard />

      {/* Kennzahlen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Termine heute" value={todayEvents.length} icon={<CalendarDays size={18} />} />
        <StatTile label="Offene Aufgaben" value={openTasks.length} icon={<CheckCircle2 size={18} />} />
        <StatTile
          label="Einnahmen (Monat)"
          value={formatCurrency(month.income)}
          icon={<TrendingUp size={18} />}
          tone="positive"
        />
        <StatTile
          label="Saldo (Monat)"
          value={formatCurrency(month.balance)}
          icon={<Wallet size={18} />}
          tone={month.balance >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Widgets */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Nächste Termine */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Nächste Termine"
            icon={<CalendarDays size={18} />}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/kalender">
                  Kalender <ArrowRight size={16} />
                </Link>
              </Button>
            }
          />
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Keine anstehenden Termine. Zeit, etwas zu planen.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary/50">
                    <span className="h-9 w-1.5 rounded-full" style={{ background: colorHex(ev.color) }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(ev.start, "EEE, d. MMM")}
                        {!ev.allDay && ` · ${formatTime(ev.start)}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Vision-Highlight */}
        <Card>
          <CardHeader
            title="Vision-Highlight"
            icon={<Sparkles size={18} />}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/vision">
                  <ArrowRight size={16} />
                </Link>
              </Button>
            }
          />
          <CardContent>
            {visionHighlight ? (
              <div
                className="rounded-lg border border-border p-4"
                style={{ borderTop: `3px solid ${colorHex(visionHighlight.color)}` }}
              >
                {visionHighlight.kind === "image" && visionHighlight.content ? (
                  <img src={visionHighlight.content} alt="" className="mb-2 w-full rounded-md object-cover" />
                ) : null}
                {visionHighlight.title && <p className="font-medium">{visionHighlight.title}</p>}
                {visionHighlight.content && visionHighlight.kind !== "image" && (
                  <p className="mt-1 text-sm italic text-muted-foreground">„{visionHighlight.content}"</p>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Noch keine Vision festgehalten.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aktive Projekte */}
      {activeProjects.length > 0 && (
        <Card>
          <CardHeader
            title="Aktive Projekte"
            icon={<FolderKanban size={18} />}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/projekte">
                  Projekte <ArrowRight size={16} />
                </Link>
              </Button>
            }
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeProjects.slice(0, 6).map((p) => {
                const s = taskStat(p.id);
                const progress = s.total ? Math.round((s.done / s.total) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    to="/projekte"
                    className="rounded-xl border border-border p-3.5 transition-all hover:bg-secondary/40 hover:shadow-soft"
                    style={{ borderLeft: `3px solid ${colorHex(p.color)}` }}
                  >
                    <p className="truncate font-medium">{p.title}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {s.done}/{s.total} Aufgaben
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progress}%`, background: colorHex(p.color) }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
