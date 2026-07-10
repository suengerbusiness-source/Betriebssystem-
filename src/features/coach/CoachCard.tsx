import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bed, Brain, Dumbbell, Smartphone, Sparkles, TrendingUp, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { CoachCategory, CoachSeverity, CoachTip } from "./coach";

const CATEGORY_ICON: Record<CoachCategory, LucideIcon> = {
  training: Dumbbell,
  schlaf: Bed,
  konsum: Smartphone,
  prognose: Sparkles,
  muster: Brain,
  erfolg: Trophy,
};

const SEVERITY_STYLE: Record<CoachSeverity, { box: string; icon: string; label: string }> = {
  alert: { box: "border-destructive/40 bg-destructive/5", icon: "bg-destructive/15 text-destructive", label: "Achtung" },
  warn: { box: "border-warning/40 bg-warning/5", icon: "bg-warning/15 text-warning", label: "Hinweis" },
  info: { box: "border-border", icon: "bg-primary/10 text-primary", label: "Tipp" },
  good: { box: "border-success/40 bg-success/5", icon: "bg-success/15 text-success", label: "Stark" },
};

/**
 * Zeigt die automatischen Coach-Hinweise. `filter` grenzt auf Kategorien ein
 * (z. B. auf der Training-Seite), `limit` begrenzt die Anzahl.
 */
export function CoachCard({
  tips,
  limit = 4,
  categories,
  title = "Dein Coach",
  subtitle = "Automatische Hinweise aus deinen Daten – sobald etwas auffällt.",
}: {
  tips: CoachTip[];
  limit?: number;
  categories?: CoachCategory[];
  title?: string;
  subtitle?: string;
}) {
  const shown = (categories ? tips.filter((t) => categories.includes(t.category)) : tips).slice(0, limit);
  if (shown.length === 0) return null;
  const alerts = shown.filter((t) => t.severity === "alert" || t.severity === "warn").length;

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
            const inner = (
              <div className={cn("flex items-start gap-3 rounded-lg border p-3 transition-colors", st.box, t.to && "hover:bg-secondary/40")}>
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", st.icon)}>
                  {t.severity === "alert" ? <AlertTriangle size={16} /> : <Icon size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">{t.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.message}</p>
                  {t.action && (
                    <p className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                      {t.action}{t.to && <ArrowRight size={13} />}
                    </p>
                  )}
                </div>
              </div>
            );
            return <li key={t.id}>{t.to ? <Link to={t.to} className="block">{inner}</Link> : inner}</li>;
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
