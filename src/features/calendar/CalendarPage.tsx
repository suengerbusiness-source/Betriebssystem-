import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { events } from "@/data/repo";
import { EVENT_COLORS, colorHex, type CalendarEvent, type Priority } from "@/data/types";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { EventModal } from "./EventModal";
import {
  WEEKDAY_LABELS,
  eventsOnDay,
  monthGridDays,
  weekDays,
  type CalendarView,
} from "./calendar.utils";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Monat" },
  { value: "week", label: "Woche" },
  { value: "day", label: "Tag" },
];

export function CalendarPage() {
  const { account } = useAuth();
  const all =
    useLiveQuery(() => (account ? events.list(account.id) : []), [account?.id]) ?? [];

  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  // Filter (Spec: viele Sortier-/Filtersysteme)
  const [fColor, setFColor] = useState("all");
  const [fCategory, setFCategory] = useState("all");
  const [fPriority, setFPriority] = useState("all");

  const categories = useMemo(
    () => [...new Set(all.map((e) => e.category).filter(Boolean) as string[])].sort(),
    [all],
  );

  const filtered = useMemo(
    () =>
      all.filter(
        (e) =>
          (fColor === "all" || e.color === fColor) &&
          (fCategory === "all" || e.category === fCategory) &&
          (fPriority === "all" || e.priority === fPriority),
      ),
    [all, fColor, fCategory, fPriority],
  );

  function openNew(day?: Date) {
    setEditing(null);
    setDefaultDate(day);
    setModalOpen(true);
  }

  // Schnellaktion aus der Command-Palette (?neu=1) -> Termin-Modal öffnen.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("neu") === "1") {
      openNew();
      params.delete("neu");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  function openEdit(ev: CalendarEvent) {
    setEditing(ev);
    setModalOpen(true);
  }

  function navigate(delta: number) {
    if (view === "month") setCursor((c) => addMonths(c, delta));
    else if (view === "week") setCursor((c) => addDays(c, delta * 7));
    else setCursor((c) => addDays(c, delta));
  }

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: de })
      : view === "week"
        ? `KW ${format(cursor, "w", { locale: de })} · ${format(cursor, "MMMM yyyy", { locale: de })}`
        : format(cursor, "EEEE, d. MMMM yyyy", { locale: de });

  return (
    <div>
      <PageHeader
        title="Kalender"
        subtitle="Plane farbig, filtere nach allem, behalte den Überblick."
        actions={
          <Button onClick={() => openNew(view === "month" ? undefined : cursor)}>
            <Plus size={18} /> Termin
          </Button>
        }
      />

      {/* Steuerleiste */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Zurück">
            <ChevronLeft size={18} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Weiter">
            <ChevronRight size={18} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Heute
          </Button>
          <span className="ml-1 font-medium capitalize">{title}</span>
        </div>

        <div className="inline-flex rounded-md bg-secondary p-1">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                view === v.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filterzeile */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter size={15} /> Filter:
        </span>
        <Select value={fColor} onChange={(e) => setFColor(e.target.value)} className="h-9 w-auto">
          <option value="all">Alle Farben</option>
          {EVENT_COLORS.map((c) => (
            <option key={c.token} value={c.token}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className="h-9 w-auto">
          <option value="all">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="h-9 w-auto">
          <option value="all">Alle Prioritäten</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </Select>
      </div>

      {view === "month" && (
        <MonthView cursor={cursor} events={filtered} onAdd={openNew} onSelect={openEdit} />
      )}
      {view === "week" && (
        <WeekView cursor={cursor} events={filtered} onAdd={openNew} onSelect={openEdit} />
      )}
      {view === "day" && <DayView cursor={cursor} events={filtered} onSelect={openEdit} />}

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        defaultDate={defaultDate}
      />
    </div>
  );
}

/* ---------- Monatsansicht ---------- */
function MonthView({
  cursor,
  events: evs,
  onAdd,
  onSelect,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onAdd: (d: Date) => void;
  onSelect: (e: CalendarEvent) => void;
}) {
  const days = monthGridDays(cursor);
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsOnDay(evs, day);
          const inMonth = isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "group min-h-[7rem] border-b border-r border-border p-1.5 transition-colors hover:bg-secondary/30",
                !inMonth && "bg-background/40 text-muted-foreground",
              )}
              onClick={() => onAdd(day)}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    today && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(ev);
                    }}
                    className="flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs hover:opacity-90"
                    style={{ background: colorHex(ev.color) + "22", color: colorHex(ev.color) }}
                  >
                    {!ev.allDay && <span className="font-medium">{formatTime(ev.start)}</span>}
                    <span className="truncate text-foreground">{ev.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1.5 text-xs text-muted-foreground">+{dayEvents.length - 3} mehr</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Wochenansicht ---------- */
function WeekView({
  cursor,
  events: evs,
  onAdd,
  onSelect,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onAdd: (d: Date) => void;
  onSelect: (e: CalendarEvent) => void;
}) {
  const days = weekDays(cursor);
  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = eventsOnDay(evs, day);
        const today = isSameDay(day, new Date());
        return (
          <Card key={day.toISOString()} className="flex min-h-[10rem] flex-col p-2">
            <button
              onClick={() => onAdd(day)}
              className={cn(
                "mb-2 rounded-md px-2 py-1 text-left text-sm font-medium",
                today ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {format(day, "EEE d.", { locale: de })}
            </button>
            <div className="flex-1 space-y-1">
              {dayEvents.map((ev) => (
                <EventChip key={ev.id} ev={ev} onClick={() => onSelect(ev)} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Tagesansicht ---------- */
function DayView({
  cursor,
  events: evs,
  onSelect,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
}) {
  const dayEvents = eventsOnDay(evs, cursor);
  return (
    <Card className="p-4">
      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
          <CalendarDays size={28} className="mb-2" />
          <p>Keine Termine an diesem Tag.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {dayEvents.map((ev) => (
            <li key={ev.id}>
              <button
                onClick={() => onSelect(ev)}
                className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-secondary/40"
              >
                <span className="h-10 w-1 rounded-full" style={{ background: colorHex(ev.color) }} />
                <div className="w-20 shrink-0 text-sm text-muted-foreground">
                  {ev.allDay ? "Ganztägig" : `${formatTime(ev.start)}–${formatTime(ev.end)}`}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ev.title}</p>
                  {ev.category && <p className="text-xs text-muted-foreground">{ev.category}</p>}
                </div>
                <PriorityDot priority={ev.priority} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EventChip({ ev, onClick }: { ev: CalendarEvent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left text-xs hover:opacity-90"
      style={{ background: colorHex(ev.color) + "22" }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorHex(ev.color) }} />
      {!ev.allDay && <span className="text-muted-foreground">{formatTime(ev.start)}</span>}
      <span className="truncate">{ev.title}</span>
    </button>
  );
}

function PriorityDot({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    high: "bg-destructive",
    medium: "bg-warning",
    low: "bg-muted-foreground",
  };
  return <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", map[priority])} title={priority} />;
}
