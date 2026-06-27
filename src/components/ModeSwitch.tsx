import { Briefcase, Layers, User } from "lucide-react";
import { useMode } from "@/context/ModeContext";
import type { ModeFilter } from "@/data/types";
import { cn } from "@/lib/cn";

const OPTIONS: { value: ModeFilter; label: string; icon: typeof User }[] = [
  { value: "private", label: "Privat", icon: User },
  { value: "business", label: "Business", icon: Briefcase },
  { value: "both", label: "Beides", icon: Layers },
];

/** Umschalter Business / Privat / Beides (teilt sich den globalen Modus-Status). */
export function ModeSwitch() {
  const { mode, setMode } = useMode();
  return (
    <div className="inline-flex rounded-md bg-secondary p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors",
            mode === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          <Icon size={15} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
