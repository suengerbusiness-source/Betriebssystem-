import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { CalendarX, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { events } from "@/data/repo";
import { getNtfyTopic } from "@/data/reminders";
import { armEventReminder } from "./eventReminders";
import { EVENT_COLORS, type CalendarEvent, type ColorToken, type Priority, type RecurrenceRule } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { combineDateTime } from "./calendar.utils";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Niedrig" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
];

type RecurMode = "none" | "daily" | "weekly" | "biweekly";
const RECUR_MODES: { value: RecurMode; label: string }[] = [
  { value: "none", label: "Einmalig" },
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "biweekly", label: "Alle 2 Wochen (im Wechsel)" },
];
// Anzeige Mo–So, Werte nach JS-Konvention (0=So … 6=Sa).
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Mo" }, { value: 2, label: "Di" }, { value: 3, label: "Mi" },
  { value: 4, label: "Do" }, { value: 5, label: "Fr" }, { value: 6, label: "Sa" }, { value: 0, label: "So" },
];

function buildRecurrence(mode: RecurMode, weekdays: number[], until: string): RecurrenceRule | undefined {
  if (mode === "none") return undefined;
  const u = until.trim() || undefined;
  if (mode === "daily") return { freq: "daily", interval: 1, ...(u ? { until: u } : {}) };
  const days = [...new Set(weekdays)].sort((a, b) => a - b);
  return { freq: "weekly", interval: mode === "biweekly" ? 2 : 1, weekdays: days, ...(u ? { until: u } : {}) };
}

export function EventModal({
  open,
  onClose,
  editing,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  editing?: CalendarEvent | null;
  defaultDate?: Date;
}) {
  const { account } = useAuth();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<ColorToken>("violet");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState(0);
  const [recurMode, setRecurMode] = useState<RecurMode>("none");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      const s = new Date(editing.start);
      const e = new Date(editing.end);
      setTitle(editing.title);
      setDate(format(s, "yyyy-MM-dd"));
      setEndDate(format(e, "yyyy-MM-dd"));
      setStartTime(format(s, "HH:mm"));
      setEndTime(format(e, "HH:mm"));
      setAllDay(editing.allDay);
      setColor(editing.color);
      setCategory(editing.category ?? "");
      setPriority(editing.priority);
      setDescription(editing.description ?? "");
      setReminder(editing.reminderMinutes ?? 0);
      const rec = editing.recurrence;
      setRecurMode(!rec ? "none" : rec.freq === "daily" ? "daily" : rec.interval > 1 ? "biweekly" : "weekly");
      setWeekdays(rec?.weekdays ?? []);
      setUntil(rec?.until ?? "");
    } else {
      const base = defaultDate ?? new Date();
      const d = format(base, "yyyy-MM-dd");
      setTitle("");
      setDate(d);
      setEndDate(d);
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(false);
      setColor("violet");
      setCategory("");
      setPriority("medium");
      setDescription("");
      setReminder(0);
      setRecurMode("none");
      setWeekdays([base.getDay()]);
      setUntil("");
    }
  }, [open, editing, defaultDate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const endDay = endDate || date;
    if (endDay < date) {
      setError("Das Enddatum liegt vor dem Startdatum.");
      return;
    }
    const start = combineDateTime(date, allDay ? "00:00" : startTime);
    const end = combineDateTime(endDay, allDay ? "23:59" : endTime);
    if (end < start) {
      setError("Das Ende liegt vor dem Beginn.");
      return;
    }
    const recurrence = buildRecurrence(recurMode, weekdays, until);
    if (recurrence?.freq === "weekly" && !(recurrence.weekdays?.length)) {
      setError("Bitte mindestens einen Wochentag für die Wiederholung wählen.");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      start,
      end,
      allDay,
      recurrence,
      color,
      category: category.trim() || undefined,
      priority,
      reminderMinutes: reminder || undefined,
    };
    const saved = editing
      ? ({ ...editing, ...payload } as CalendarEvent)
      : await events.create({ accountId: account.id, ...payload });
    if (editing) await events.update(editing.id, payload);
    // Push-Erinnerung einplanen (sofern eingestellt & in Reichweite).
    if (reminder > 0 && !allDay) {
      const scheduledFor = await armEventReminder(saved);
      if (scheduledFor) await events.update(saved.id, { reminderScheduledFor: scheduledFor });
    }
    onClose();
  }

  async function remove() {
    if (editing && confirm("Diesen Termin löschen?")) {
      await events.remove(editing.id);
      onClose();
    }
  }

  async function toggleCancel() {
    if (!editing) return;
    if (editing.cancelled) await events.uncancel(editing.id);
    else await events.cancel(editing.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Termin bearbeiten" : "Neuer Termin"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Titel</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Worum geht es?" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Von</Label>
            <Input id="date" type="date" value={date} onChange={(e) => { setDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} />
          </div>
          <div>
            <Label htmlFor="enddate">Bis</Label>
            <Input id="enddate" type="date" min={date} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        {endDate > date && (
          <p className="-mt-2 text-xs text-muted-foreground">Mehrtägig (z. B. Urlaub) – der Termin erscheint an allen Tagen von … bis.</p>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Ganztägig
        </label>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Beginn</Label>
              <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="end">Ende</Label>
              <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

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
                  "h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition-all",
                  color === c.token ? "ring-2 ring-ring scale-110" : "hover:scale-105",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Wiederholung */}
        <div className="rounded-lg border border-border p-3">
          <Label htmlFor="recur">Wiederholung</Label>
          <Select id="recur" value={recurMode} onChange={(e) => setRecurMode(e.target.value as RecurMode)}>
            {RECUR_MODES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>

          {(recurMode === "weekly" || recurMode === "biweekly") && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">An welchen Wochentagen?</span>
                <button
                  type="button"
                  onClick={() => setWeekdays([1, 2, 3, 4, 5])}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mo–Fr
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((w) => {
                  const on = weekdays.includes(w.value);
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => setWeekdays((ws) => (on ? ws.filter((x) => x !== w.value) : [...ws, w.value]))}
                      className={cn(
                        "h-9 w-10 rounded-lg border text-sm font-medium transition-all",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
              {recurMode === "biweekly" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Aktiv in der Startwoche, die nächste frei, dann wieder aktiv – ideal für Woche-an-Woche-aus.
                </p>
              )}
            </div>
          )}

          {recurMode !== "none" && (
            <div className="mt-3">
              <Label htmlFor="until">Bis (optional)</Label>
              <Input id="until" type="date" min={date} value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">Kategorie</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z. B. Business" />
          </div>
          <div>
            <Label htmlFor="priority">Priorität</Label>
            <Select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!allDay && (
          <div>
            <Label htmlFor="reminder">Push-Erinnerung vor Beginn</Label>
            <Select id="reminder" value={reminder} onChange={(e) => setReminder(Number(e.target.value))}>
              <option value={0}>Keine</option>
              <option value={10}>10 Minuten vorher</option>
              <option value={30}>30 Minuten vorher</option>
            </Select>
            {reminder > 0 && !getNtfyTopic() && (
              <p className="mt-1 text-xs text-warning">
                Für Push-Erinnerungen die „Hintergrund-Erinnerungen" in den Einstellungen einrichten.
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="desc">Notiz (optional)</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {editing ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" onClick={toggleCancel} className={editing.cancelled ? "text-primary" : "text-warning"}>
                {editing.cancelled ? <><RotateCcw size={16} /> Reaktivieren</> : <><CalendarX size={16} /> Absagen</>}
              </Button>
              <Button type="button" variant="ghost" onClick={remove} className="text-destructive">
                <Trash2 size={16} /> Löschen
              </Button>
            </div>
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
