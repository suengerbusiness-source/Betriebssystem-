import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  ListChecks,
  NotebookPen,
  Repeat,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { greetingForHour } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/Card";
import type { FocusItem, FocusKind } from "./focus";

const KIND_ICON: Record<FocusKind, LucideIcon> = {
  checkin: NotebookPen,
  target: Dumbbell,
  coach: Sparkles,
  task: ListChecks,
  event: CalendarDays,
  habit: Repeat,
};

/** Die eine wichtigste Sache jetzt – plus die nächsten paar. */
export function FocusHero({ items, name }: { items: FocusItem[]; name?: string }) {
  const greeting = greetingForHour(new Date().getHours());

  if (items.length === 0) {
    return (
      <Card className="border-success/30 bg-gradient-to-br from-success/5 to-transparent">
        <CardContent className="flex items-center gap-4 py-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
            <CheckCircle2 size={24} />
          </span>
          <div>
            <p className="text-lg font-semibold">Alles im grünen Bereich 🎉</p>
            <p className="text-sm text-muted-foreground">Kein offener Punkt gerade. Genieß den Moment – oder leg freiwillig nach.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [top, ...rest] = items;
  const Icon = KIND_ICON[top.kind] ?? Sparkles;
  const isAlert = top.severity === "alert" || top.urgency >= 88;

  return (
    <div className="space-y-3">
      {/* Hero: der eine wichtigste Schritt */}
      <Link to={top.to} className="block">
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-6 shadow-card transition-colors sm:p-7",
          isAlert ? "border-warning/40 bg-gradient-to-br from-warning/10 to-transparent" : "border-primary/30 bg-gradient-to-br from-primary/10 to-transparent",
        )}>
          <div className={cn("pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl", isAlert ? "bg-warning/15" : "bg-primary/15")} />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{greeting}{name ? `, ${name}` : ""} · Dein nächster Schritt</p>
            <div className="mt-2 flex items-start gap-3">
              <span className={cn("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", isAlert ? "bg-warning/20 text-warning" : "bg-primary/15 text-primary")}>
                {top.severity === "alert" ? <AlertTriangle size={22} /> : <Icon size={22} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold leading-tight tracking-tight">{top.title}</p>
                {top.reason && <p className="mt-1 text-sm text-muted-foreground">{top.reason}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background">
                  {top.action} <ArrowRight size={15} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Danach dran */}
      {rest.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Danach dran</p>
            <ul className="space-y-0.5">
              {rest.slice(0, 4).map((it) => {
                const ItIcon = KIND_ICON[it.kind] ?? Sparkles;
                return (
                  <li key={it.id}>
                    <Link to={it.to} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary/60">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", it.severity === "alert" ? "bg-destructive/15 text-destructive" : it.severity === "warn" ? "bg-warning/15 text-warning" : "bg-secondary text-foreground/80")}>
                        <ItIcon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{it.title}</span>
                        {it.reason && <span className="block truncate text-xs text-muted-foreground">{it.reason}</span>}
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
