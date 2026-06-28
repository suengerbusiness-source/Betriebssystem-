import { useMemo, useState, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseISO } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Footprints,
  Plus,
  Telescope,
  Trash2,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { goalLogs as logsRepo, horizonGoals as goalsRepo } from "@/data/repo";
import { HORIZONS, type GoalLog, type GoalLogKind, type Horizon, type HorizonGoal } from "@/data/types";
import { formatDate, todayISODate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

/*
  Horizonte: Ziele über Zeithorizonte (Heute … 5 Jahre). Jeder Horizont ist
  eine eigene „Zeile". Zu jedem Ziel lassen sich getane Aktionen und erreichte
  Erfolge festhalten. Bewusst schlank gehalten, aber über GoalLog.kind und die
  HORIZONS-Liste leicht erweiterbar.
*/
export function HorizonsPage() {
  const { account } = useAuth();
  const accId = account?.id;

  const allGoals = useLiveQuery(() => (accId ? goalsRepo.list(accId) : []), [accId]) ?? [];
  const allLogs = useLiveQuery(() => (accId ? logsRepo.list(accId) : []), [accId]) ?? [];

  const logsByGoal = useMemo(() => {
    const map = new Map<string, GoalLog[]>();
    for (const l of allLogs) {
      const arr = map.get(l.goalId) ?? [];
      arr.push(l);
      map.set(l.goalId, arr);
    }
    return map;
  }, [allLogs]);

  const goalsByHorizon = useMemo(() => {
    const map = new Map<Horizon, HorizonGoal[]>();
    for (const g of allGoals) {
      const arr = map.get(g.horizon) ?? [];
      arr.push(g);
      map.set(g.horizon, arr);
    }
    // offen zuerst, darin neueste oben
    for (const arr of map.values()) {
      arr.sort(
        (a, b) => Number(a.status === "done") - Number(b.status === "done") || b.order - a.order,
      );
    }
    return map;
  }, [allGoals]);

  const totalWins = allLogs.filter((l) => l.kind === "win").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horizonte"
        subtitle="Ziele von heute bis in 5 Jahre – mit Aktionen und Erfolgen."
        actions={
          totalWins > 0 ? (
            <Badge className="gap-1.5 border-success/40 px-3 py-1 text-success">
              <Trophy size={14} /> {totalWins} {totalWins === 1 ? "Erfolg" : "Erfolge"}
            </Badge>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {HORIZONS.map((h) => (
          <HorizonLane
            key={h.value}
            horizon={h}
            goals={goalsByHorizon.get(h.value) ?? []}
            logsByGoal={logsByGoal}
            accountId={accId}
          />
        ))}
      </div>
    </div>
  );
}

function HorizonLane({
  horizon: h,
  goals,
  logsByGoal,
  accountId,
}: {
  horizon: (typeof HORIZONS)[number];
  goals: HorizonGoal[];
  logsByGoal: Map<string, GoalLog[]>;
  accountId?: string;
}) {
  const [title, setTitle] = useState("");
  const openCount = goals.filter((g) => g.status === "open").length;

  async function add() {
    if (!accountId || !title.trim()) return;
    await goalsRepo.create({
      accountId,
      horizon: h.value,
      title: title.trim(),
      status: "open",
      order: Date.now(),
    });
    setTitle("");
  }

  return (
    <Card>
      <CardHeader
        title={h.label}
        subtitle={h.hint}
        icon={<Telescope size={18} />}
        action={<Badge className="text-muted-foreground">{openCount} offen</Badge>}
      />
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder={`Ziel für „${h.label}“…`}
            className="h-9"
          />
          <Button size="icon" variant="secondary" onClick={add} aria-label="Ziel hinzufügen">
            <Plus size={16} />
          </Button>
        </div>

        {goals.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Noch kein Ziel – schreib dein erstes oben rein.</p>
        ) : (
          <ul className="space-y-2">
            {goals.map((g) => (
              <GoalRow key={g.id} goal={g} logs={logsByGoal.get(g.id) ?? []} accountId={accountId} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GoalRow({ goal: g, logs, accountId }: { goal: HorizonGoal; logs: GoalLog[]; accountId?: string }) {
  const [open, setOpen] = useState(false);
  const actions = logs.filter((l) => l.kind === "action");
  const wins = logs.filter((l) => l.kind === "win");
  const done = g.status === "done";

  return (
    <li className="rounded-xl border border-border">
      <div className="group flex items-center gap-2.5 p-2.5">
        <button
          onClick={() => goalsRepo.update(g.id, { status: done ? "open" : "done" })}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            done ? "border-success bg-success text-white" : "border-border hover:border-primary",
          )}
          aria-label="Ziel erreicht umschalten"
        >
          {done && <Check size={13} />}
        </button>

        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
            {g.title}
          </span>
          {actions.length > 0 && (
            <Badge className="hidden gap-1 text-muted-foreground sm:inline-flex">
              <Footprints size={11} /> {actions.length}
            </Badge>
          )}
          {wins.length > 0 && (
            <Badge className="gap-1 border-success/40 text-success">
              <Trophy size={11} /> {wins.length}
            </Badge>
          )}
          {open ? <ChevronDown size={16} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
        </button>

        <button
          onClick={() => confirm("Dieses Ziel mit allen Einträgen löschen?") && goalsRepo.remove(g.id)}
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Ziel löschen"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-3">
          <LogSection
            goalId={g.id}
            kind="action"
            logs={actions}
            accountId={accountId}
            label="Aktionen"
            icon={<Footprints size={14} />}
            placeholder="Was hast du dafür getan?"
            tone="muted"
          />
          <LogSection
            goalId={g.id}
            kind="win"
            logs={wins}
            accountId={accountId}
            label="Erfolge"
            icon={<Trophy size={14} />}
            placeholder="Was hast du erreicht?"
            tone="success"
          />
        </div>
      )}
    </li>
  );
}

function LogSection({
  goalId,
  kind,
  logs,
  accountId,
  label,
  icon,
  placeholder,
  tone,
}: {
  goalId: string;
  kind: GoalLogKind;
  logs: GoalLog[];
  accountId?: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  tone: "muted" | "success";
}) {
  const [text, setText] = useState("");

  async function add() {
    if (!accountId || !text.trim()) return;
    await logsRepo.create({ accountId, goalId, kind, text: text.trim(), date: todayISODate() });
    setText("");
  }

  return (
    <div>
      <p className={cn("mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", tone === "success" ? "text-success" : "text-muted-foreground/80")}>
        {icon} {label}
      </p>

      {logs.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {logs
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
            .map((l) => (
              <li key={l.id} className="group flex items-start gap-2 text-sm">
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "success" ? "bg-success" : "bg-muted-foreground/40")} />
                <span className="min-w-0 flex-1">{l.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(parseISO(l.date), "d. MMM")}</span>
                <button
                  onClick={() => logsRepo.remove(l.id)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label={`${label}-Eintrag löschen`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="h-9"
        />
        <Button size="icon" variant="outline" onClick={add} aria-label={`${label} hinzufügen`} className="h-9 w-9 shrink-0">
          <Plus size={15} />
        </Button>
      </div>
    </div>
  );
}
