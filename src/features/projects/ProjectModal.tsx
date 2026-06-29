import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { projects, tasks, timeEntries } from "@/data/repo";
import {
  EVENT_COLORS,
  PROJECT_STATUS,
  type ColorToken,
  type Project,
  type ProjectStatus,
} from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { TimeTracker } from "./TimeTracker";

/*
  Projekt anlegen/bearbeiten. Beim Bearbeiten wird zusätzlich die Aufgabenliste
  verwaltet (hinzufügen, abhaken, löschen) – mit Fortschrittsbalken.
*/
export function ProjectModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Project | null;
}) {
  const { account } = useAuth();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [color, setColor] = useState<ColorToken>("violet");
  const [deadline, setDeadline] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [description, setDescription] = useState("");
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState<string | null>(null);

  const projectTasks =
    useLiveQuery(
      () => (editing ? tasks.listByProject(editing.id) : []),
      [editing?.id],
    ) ?? [];
  const projectTime =
    useLiveQuery(
      () => (editing ? timeEntries.listByProject(editing.id) : []),
      [editing?.id],
    ) ?? [];

  const sortedTasks = useMemo(
    () => [...projectTasks].sort((a, b) => a.createdAt - b.createdAt),
    [projectTasks],
  );
  const doneCount = sortedTasks.filter((t) => t.done).length;
  const progress = sortedTasks.length ? Math.round((doneCount / sortedTasks.length) * 100) : 0;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewTask("");
    if (editing) {
      setTitle(editing.title);
      setStatus(editing.status);
      setColor(editing.color);
      setDeadline(editing.deadline ?? "");
      setHourlyRate(editing.hourlyRate ? String(editing.hourlyRate) : "");
      setDescription(editing.description ?? "");
    } else {
      setTitle("");
      setStatus("idea");
      setColor("violet");
      setDeadline("");
      setHourlyRate("");
      setDescription("");
    }
  }, [open, editing]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const payload = {
      title: title.trim(),
      status,
      color,
      deadline: deadline || undefined,
      hourlyRate: hourlyRate ? Number(hourlyRate.replace(",", ".")) || undefined : undefined,
      description: description.trim() || undefined,
    };
    if (editing) {
      await projects.update(editing.id, payload);
    } else {
      await projects.create({ accountId: account.id, order: Date.now(), ...payload });
    }
    onClose();
  }

  async function addTask() {
    if (!account || !editing || !newTask.trim()) return;
    await tasks.create({ accountId: account.id, projectId: editing.id, title: newTask.trim(), done: false });
    setNewTask("");
  }

  async function removeProject() {
    if (editing && confirm("Projekt inkl. Aufgaben wirklich löschen?")) {
      await projects.remove(editing.id);
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Projekt bearbeiten" : "Neues Projekt"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="p-title">Titel</Label>
          <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Projektname" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p-status">Status</Label>
            <Select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="p-deadline">Deadline (optional)</Label>
            <Input id="p-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>

        <div className="w-40">
          <Label htmlFor="p-rate">Stundensatz (€/h, optional)</Label>
          <Input id="p-rate" inputMode="decimal" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="z. B. 90" />
        </div>

        <div>
          <Label>Farbe</Label>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.token}
                type="button"
                onClick={() => setColor(c.token)}
                aria-label={c.label}
                className={cn(
                  "h-7 w-7 rounded-full transition-all",
                  color === c.token ? "ring-2 ring-ring ring-offset-2 ring-offset-card scale-110" : "",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="p-desc">Beschreibung (optional)</Label>
          <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Aufgaben (nur beim Bearbeiten) */}
        {editing && (
          <div className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Aufgaben</Label>
              <span className="text-xs text-muted-foreground">
                {doneCount}/{sortedTasks.length} erledigt · {progress}%
              </span>
            </div>
            {sortedTasks.length > 0 && (
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            <ul className="mb-2 space-y-1">
              {sortedTasks.map((t) => (
                <li key={t.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => tasks.setDone(t.id, !t.done)}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      t.done ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                    aria-label="Erledigt umschalten"
                  >
                    {t.done && <Check size={13} />}
                  </button>
                  <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>
                    {t.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => tasks.remove(t.id)}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Aufgabe löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addTask();
                  }
                }}
                placeholder="Neue Aufgabe…"
                className="h-9"
              />
              <Button type="button" size="icon" variant="secondary" onClick={addTask} aria-label="Aufgabe hinzufügen">
                <Plus size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Zeiterfassung (nur beim Bearbeiten) */}
        {editing && account && (
          <TimeTracker accountId={account.id} projectId={editing.id} entries={projectTime} />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {editing ? (
            <Button type="button" variant="ghost" onClick={removeProject} className="text-destructive">
              <Trash2 size={16} /> Löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">{editing ? "Speichern" : "Anlegen"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
