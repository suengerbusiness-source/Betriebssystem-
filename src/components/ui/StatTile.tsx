import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";

/** Kompakte Kennzahl-Kachel für Dashboard & Finanzen. */
export function StatTile({
  label,
  value,
  icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tracking-tight tabular-nums",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
