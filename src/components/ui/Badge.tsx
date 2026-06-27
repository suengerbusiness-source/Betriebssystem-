import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Kleines Label/Chip, z. B. für Kategorien und Prioritäten. */
export function Badge({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={style}
      {...props}
    />
  );
}
