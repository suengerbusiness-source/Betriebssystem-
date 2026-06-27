import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { events } from "@/data/repo";
import { EVENT_COLORS, type CalendarEvent, type ColorToken, type Priority } from "@/data/types";
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
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<ColorToken>("violet");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      const s = new Date(editing.start);
      const e = new Date(editing.end);
      setTitle(editing.title);
      setDate(format(s, "yyyy-MM-dd"));
      setStartTime(format(s, "HH:mm"));
      setEndTime(format(e, "HH:mm"));
      setAllDay(editing.allDay);
      setColor(editing.color);
      setCategory(editing.category ?? "");
      setPriority(editing.priority);
      setDescription(editing.description ?? "");
    } else {
      const base = defaultDate ?? new Date();
      setTitle("");
      setDate(format(base, "yyyy-MM-dd"));
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(false);
      setColor("violet");
      setCategory("");
      setPriority("medium");
      setDescription("");
    }
  }, [open, editing, defaultDate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const start = combineDateTime(date, allDay ? "00:00" : startTime);
    const end = combineDateTime(date, allDay ? "23:59" : endTime);
    if (!allDay && end < start) {
      setError("Das Ende liegt vor dem Beginn.");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      start,
      end,
      allDay,
      color,
      category: category.trim() || undefined,
      priority,
    };
    if (editing) await events.update(editing.id, payload);
    else await events.create({ accountId: account.id, ...payload });
    onClose();
  }

  async function remove() {
    if (editing && confirm("Diesen Termin löschen?")) {
      await events.remove(editing.id);
      onClose();
    }
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
            <Label htmlFor="date">Datum</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              Ganztägig
            </label>
          </div>
        </div>

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

        <div>
          <Label htmlFor="desc">Notiz (optional)</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {editing ? (
            <Button type="button" variant="ghost" onClick={remove} className="text-destructive">
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
