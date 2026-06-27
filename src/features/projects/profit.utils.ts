import type { Project, TimeEntry, Transaction } from "@/data/types";

export interface ProjectProfit {
  minutes: number;
  hours: number;
  income: number;
  expense: number;
  profit: number;
  /** Effektiver Stundenertrag = Einnahmen / Stunden. */
  ratePerHour: number | null;
}

/** Rentabilität eines Projekts aus zugeordneten Buchungen + Zeiteinträgen. */
export function projectProfit(
  project: Project,
  txs: Transaction[],
  entries: TimeEntry[],
): ProjectProfit {
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    if (tx.projectId !== project.id) continue;
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  let minutes = 0;
  for (const e of entries) {
    if (e.projectId === project.id) minutes += e.minutes;
  }
  const hours = minutes / 60;
  return {
    minutes,
    hours,
    income,
    expense,
    profit: income - expense,
    ratePerHour: hours > 0 ? income / hours : null,
  };
}

/** Minuten -> "2h 30m" / "45m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
