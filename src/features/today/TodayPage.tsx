import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { isSameDay, parseISO } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  Inbox,
  ListChecks,
  NotebookPen,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkins, events, habitLogs, habits, inboxItems, projects, tasks } from "@/data/repo";
import { EVENT_COLORS, colorHex, type Task } from "@/data/types";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { computeStreak, todayKey } from "./today.utils";

export function TodayPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const today = todayKey();
  const now = new Date();

  const allTasks = useLiveQuery(() => (accId ? tasks.list(accId) : []), [accId]) ?? [];
  const inbox = useLiveQuery(() => (accId ? inboxItems.list(accId) : []), [accId]) ?? [];
  const evs = useLiveQuery(() => (accId ? events.list(accId) : []), [accId]) ?? [];
  const habitList = useLiveQuery(() => (accId ? habits.list(accId) : []), [accId]) ?? [];
  const logs = useLiveQuery(() => (accId ? habitLogs.list(accId) : []), [accId]) ?? [];
  const projectList = useLiveQuery(() => (accId ? projects.list(accId) : []), [accId]) ?? [];
  const projectName = (id?: string) => projectList.find((p) => p.id === id)?.title;
  const todayCheckin = useLiveQuery(() => (accId ? checkins.getByDate(accId, today) : undefined), [accId, today]);
  const checkedInToday = !!todayCheckin;

  const [capture, setCapture] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newHabit, setNewHabit] = useState("");

  // Aufgaben für heute: eingeplant heute oder (offen und überfällig/heute fällig).
  const todayTasks = useMemo(
    () =>
      allTasks
        .filter(
          (t) =>
            t.scheduledFor === today ||
            (!t.done && t.dueDate && t.dueDate <= today),
        )
        .sort(
          (a, b) =>
            Number(a.done) - Number(b.done) ||
            (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
        ),
    [allTasks, today],
  );
  const openToday = todayTasks.filter((t) => !t.done).length;

  const todayEvents = useMemo(
    () => evs.filter((e) => isSameDay(parseISO(e.start), now)).sort((a, b) => a.start.localeCompare(b.start)),
    [evs],
  );

  // Streak + Heute-Status je Gewohnheit.
  const logsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of logs) {
      const s = map.get(l.habitId) ?? new Set<string>();
      s.add(l.date);
      map.set(l.habitId, s);
    }
    return map;
  }, [logs]);

  async function addCapture(e: FormEvent) {
    e.preventDefault();
    if (!accId || !capture.trim()) return;
    await inboxItems.create(accId, capture.trim());
    setCapture("");
  }

  async function convertInbox(id: string, text: string) {
    if (!accId) return;
    await tasks.create({ accountId: accId, title: text, done: false, scheduledFor: today });
    await inboxItems.remove(id);
  }

  async function addTask() {
    if (!accId || !newTask.trim()) return;
    await tasks.create({ accountId: accId, title: newTask.trim(), done: false, scheduledFor: today });
    setNewTask("");
  }

  async function addHabit(e: KeyboardEvent) {
    if (e.key !== "Enter" || !accId || !newHabit.trim()) return;
    const color = EVENT_COLORS[habitList.length % EVENT_COLORS.length].token;
    await habits.create({ accountId: accId, title: newHabit.trim(), color, order: Date.now() });
    setNewHabit("");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Heute" subtitle={formatDate(now, "EEEE, d. MMMM yyyy")} />

      {/* Quick Capture */}
      <form onSubmit={addCapture}>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-soft focus-within:ring-2 focus-within:ring-ring/40">
          <Sparkles size={18} className="ml-1 shrink-0 text-primary" />
          <input
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
            placeholder="Schnell erfassen – Gedanke, Aufgabe, Idee… (Enter)"
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" disabled={!capture.trim()}>
            <Plus size={16} /> Erfassen
          </Button>
        </div>
      </form>

      {!checkedInToday && (
        <Link
          to="/tagebuch"
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <NotebookPen size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Abend-Check-in offen</p>
            <p className="text-xs text-muted-foreground">Stimmung, Energie, Schlaf & Co. in einer Minute festhalten.</p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-primary" />
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Linke Spalte: Inbox + Aufgaben */}
        <div className="space-y-4 lg:col-span-2">
          {inbox.length > 0 && (
            <Card>
              <CardHeader title="Eingang" subtitle="Einsortieren: in Aufgabe umwandeln oder verwerfen" icon={<Inbox size={18} />} />
              <CardContent>
                <ul className="space-y-2">
                  {inbox
                    .slice()
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((item) => (
                      <li key={item.id} className="group flex items-center gap-2 rounded-xl border border-border p-2.5">
                        <span className="min-w-0 flex-1 truncate text-sm">{item.text}</span>
                        <Button size="sm" variant="outline" onClick={() => convertInbox(item.id, item.text)}>
                          <ArrowRight size={14} /> Aufgabe
                        </Button>
                        <button onClick={() => inboxItems.remove(item.id)} className="text-muted-foreground hover:text-destructive" aria-label="Verwerfen">
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader title="Aufgaben heute" subtitle={`${openToday} offen`} icon={<ListChecks size={18} />} />
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTask())}
                  placeholder="Aufgabe für heute…"
                  className="h-9"
                />
                <Button size="icon" variant="secondary" onClick={addTask} aria-label="Aufgabe hinzufügen">
                  <Plus size={16} />
                </Button>
              </div>

              {todayTasks.length === 0 ? (
                <EmptyState icon={<ListChecks size={22} />} title="Nichts für heute geplant" description="Wirf oben etwas in den Eingang oder lege direkt eine Aufgabe an." />
              ) : (
                <ul className="divide-y divide-border">
                  {todayTasks.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} projectName={projectName(t.projectId)} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rechte Spalte: Termine + Gewohnheiten */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Termine heute"
              icon={<CalendarDays size={18} />}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/kalender"><ArrowRight size={16} /></Link>
                </Button>
              }
            />
            <CardContent>
              {todayEvents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Keine Termine heute.</p>
              ) : (
                <ul className="space-y-2">
                  {todayEvents.map((ev) => (
                    <li key={ev.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                      <span className="h-8 w-1.5 rounded-full" style={{ background: colorHex(ev.color) }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ev.allDay ? "Ganztägig" : `${formatTime(ev.start)}–${formatTime(ev.end)}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Gewohnheiten" subtitle="Täglich abhaken, Strähne halten" icon={<Repeat size={18} />} />
            <CardContent className="space-y-3">
              <Input
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyDown={addHabit}
                placeholder="Neue Gewohnheit… (Enter)"
                className="h-9"
              />
              {habitList.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Noch keine Gewohnheiten.</p>
              ) : (
                <ul className="space-y-1.5">
                  {habitList
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((h) => {
                      const dates = logsByHabit.get(h.id) ?? new Set<string>();
                      const doneToday = dates.has(today);
                      const streak = computeStreak(dates, now);
                      return (
                        <li key={h.id} className="group flex items-center gap-2.5">
                          <button
                            onClick={() => accId && habitLogs.toggle(accId, h.id, today)}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                              doneToday ? "text-white" : "border-border text-transparent hover:border-primary",
                            )}
                            style={doneToday ? { background: colorHex(h.color), borderColor: colorHex(h.color) } : undefined}
                            aria-label="Heute abhaken"
                          >
                            <Check size={15} />
                          </button>
                          <span className={cn("flex-1 truncate text-sm", doneToday && "text-muted-foreground")}>{h.title}</span>
                          {streak > 0 && (
                            <Badge className="gap-1 border-warning/40 text-warning">
                              <Flame size={12} /> {streak}
                            </Badge>
                          )}
                          <button onClick={() => habits.remove(h.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Gewohnheit löschen">
                            <Trash2 size={14} />
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task: t, today, projectName }: { task: Task; today: string; projectName?: string }) {
  const overdue = !t.done && t.dueDate && t.dueDate < today;
  return (
    <li className="group flex items-center gap-3 py-2.5">
      <button
        onClick={() => tasks.update(t.id, { done: !t.done })}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          t.done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary",
        )}
        aria-label="Erledigt umschalten"
      >
        {t.done && <Check size={13} />}
      </button>
      <span className={cn("min-w-0 flex-1 truncate text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</span>
      {projectName && <Badge className="shrink-0 text-muted-foreground">{projectName}</Badge>}
      {overdue && <Badge className="shrink-0 border-destructive/40 text-destructive">überfällig</Badge>}
      <button onClick={() => tasks.remove(t.id)} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Löschen">
        <Trash2 size={14} />
      </button>
    </li>
  );
}
