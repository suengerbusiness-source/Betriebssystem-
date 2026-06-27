import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { isSameDay, isAfter, parseISO, startOfDay } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { events, transactions, visionItems } from "@/data/repo";
import { colorHex } from "@/data/types";
import { formatCurrency, formatDate, formatTime, greetingForHour } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { currentMonthKey, summarizeMonth } from "@/features/finance/finance.utils";

export function DashboardPage() {
  const { account } = useAuth();
  const accId = account?.id;

  const evs = useLiveQuery(() => (accId ? events.list(accId) : []), [accId]) ?? [];
  const txs = useLiveQuery(() => (accId ? transactions.list(accId) : []), [accId]) ?? [];
  const vision = useLiveQuery(() => (accId ? visionItems.list(accId) : []), [accId]) ?? [];

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

  const openTasksCount = todayEvents.length;
  const visionHighlight = vision[Math.floor(Math.random() * Math.max(vision.length, 1))];

  return (
    <div className="space-y-6">
      {/* Daily Briefing */}
      <div className="rounded-lg border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <p className="text-sm text-muted-foreground">{formatDate(now, "EEEE, d. MMMM yyyy")}</p>
        <h2 className="mt-1 text-2xl font-semibold">
          {greeting}, {name}! 👋
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Heute stehen <strong className="text-foreground">{todayEvents.length}</strong>{" "}
          {todayEvents.length === 1 ? "Termin" : "Termine"} an. Dein Monatssaldo liegt bei{" "}
          <strong className={month.balance >= 0 ? "text-success" : "text-destructive"}>
            {formatCurrency(month.balance)}
          </strong>
          {month.balance >= 0 ? " – im Plan. " : " – behalte die Ausgaben im Blick. "}
          {vision.length > 0 && "Vergiss deine Vision nicht."}
        </p>
      </div>

      {/* Kennzahlen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Termine heute" value={openTasksCount} icon={<CalendarDays size={18} />} />
        <StatTile
          label="Einnahmen (Monat)"
          value={formatCurrency(month.income)}
          icon={<TrendingUp size={18} />}
          tone="positive"
        />
        <StatTile
          label="Ausgaben (Monat)"
          value={formatCurrency(month.expense)}
          icon={<Wallet size={18} />}
          tone="negative"
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
                  <li key={ev.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                    <span className="h-9 w-1 rounded-full" style={{ background: colorHex(ev.color) }} />
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
    </div>
  );
}
