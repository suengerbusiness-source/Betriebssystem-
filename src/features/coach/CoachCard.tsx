import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bed, Brain, Dumbbell, Smartphone, Sparkles, TrendingUp, Trophy, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { CoachCategory, CoachSeverity, CoachTip } from "./coach";
import { recordFeedback, recordShown } from "./learn";

const CATEGORY_ICON: Record<CoachCategory, LucideIcon> = {
  training: Dumbbell,
  schlaf: Bed,
  konsum: Smartphone,
  prognose: Sparkles,
  muster: Brain,
  erfolg: Trophy,
};

const SEVERITY_STYLE: Record<CoachSeverity, { box: string; icon: string }> = {
  alert: { box: "border-destructive/40 bg-destructive/5", icon: "bg-destructive/15 text-destructive" },
  warn: { box: "border-warning/40 bg-warning/5", icon: "bg-warning/15 text-warning" },
  info: { box: "border-border", icon: "bg-primary/10 text-primary" },
  good: { box: "border-success/40 bg-success/5", icon: "bg-success/15 text-success" },
};

/**
 * Zeigt die automatischen Coach-Hinweise – und LERNT: Antippen zählt als
 * „befolgt", das X als „weggeklickt". Beides fließt in die künftige Auswahl &
 * Reihenfolge ein (siehe learn.ts).
 */
export function CoachCard({
  tips,
  limit = 4,
  categories,
  title = "Dein Coach",
  subtitle = "Automatische Hinweise aus deinen Daten – passt sich deinem Verhalten an.",
}: {
  tips: CoachTip[];
  limit?: number;
  categories?: CoachCategory[];
  title?: string;
  subtitle?: string;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const pool = categories ? tips.filter((t) => categories.includes(t.category)) : tips;
  const shown = pool.filter((t) => !hidden.includes(t.id)).slice(0, limit);

  // Angezeigte Hinweise als „gesehen" lernen (einmal pro Tag je Typ).
  const shownKeys = shown.map((t) => t.learnKey).join(",");
  useEffect(() => {
    if (shown.length > 0) recordShown(shown.map((t) => t.learnKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKeys]);

  if (shown.length === 0) return null;
  const alerts = shown.filter((t) => t.severity === "alert" || t.severity === "warn").length;

  function dismiss(t: CoachTip) {
    recordFeedback(t.learnKey, "dismiss");
    setHidden((h) => [...h, t.id]);
  }

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        icon={<Sparkles size={18} />}
        action={alerts > 0 ? <Badge className="border-warning/40 text-warning">{alerts} aktiv</Badge> : undefined}
      />
      <CardContent>
        <ul className="space-y-2.5">
          {shown.map((t) => {
            const Icon = CATEGORY_ICON[t.category] ?? TrendingUp;
            const st = SEVERITY_STYLE[t.severity];
            const body = (
              <div className={cn("flex items-start gap-3 rounded-lg border p-3 pr-9 transition-colors", st.box, t.to && "hover:bg-secondary/40")}>
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", st.icon)}>
                  {t.severity === "alert" ? <AlertTriangle size={16} /> : <Icon size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.message}</p>
                  {t.action && (
                    <p className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                      {t.action}{t.to && <ArrowRight size={13} />}
                    </p>
                  )}
                </div>
              </div>
            );
            return (
              <li key={t.id} className="group relative">
                {t.to ? (
                  <Link to={t.to} className="block" onClick={() => recordFeedback(t.learnKey, "act")}>{body}</Link>
                ) : body}
                <button
                  onClick={() => dismiss(t)}
                  className="absolute right-2 top-2 rounded p-1 text-muted-foreground/50 transition-colors hover:text-foreground"
                  aria-label="Nicht hilfreich – ausblenden"
                  title="Nicht hilfreich – seltener zeigen"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 px-1 text-[11px] text-muted-foreground">
          Tipp befolgen (antippen) oder wegklicken (✕) – der Coach lernt daraus und zeigt dir mit der Zeit vor allem das, worauf du reagierst.
        </p>
      </CardContent>
    </Card>
  );
}
