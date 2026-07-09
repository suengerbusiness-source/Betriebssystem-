import { compactNumber } from "@/features/company/company.utils";

/*
  Erfolge / Meilensteine – reine Logik. Aus einfachen Kennzahlen werden
  Stufen-Ziele (Badges) abgeleitet. „reached" = freigeschaltet.
*/

export interface Achievement {
  id: string;
  group: string;
  label: string;
  target: number;
  value: number;
  reached: boolean;
}

export interface AchievementInput {
  checkinStreak: number;
  checkinTotal: number;
  followers: number;
  tasksDone: number;
  habitDone: number;
  /** Ziel-Tracker mit laufender Strähne (z. B. „Bizeps Curls", 7 Tage). */
  trackerStreaks?: { id: string; label: string; streak: number }[];
}

interface GroupDef {
  key: string;
  title: string;
  thresholds: number[];
  value: number;
  label: (t: number) => string;
}

export function computeAchievements(input: AchievementInput): Achievement[] {
  const groups: GroupDef[] = [
    { key: "streak", title: "Check-in-Streak", value: input.checkinStreak, thresholds: [3, 7, 14, 30, 60, 100], label: (t) => `${t}-Tage-Streak` },
    { key: "checkins", title: "Check-ins gesamt", value: input.checkinTotal, thresholds: [5, 25, 50, 100, 365], label: (t) => `${t} Check-ins` },
    { key: "followers", title: "Follower", value: input.followers, thresholds: [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000], label: (t) => `${compactNumber(t)} Follower` },
    { key: "tasks", title: "Erledigte Aufgaben", value: input.tasksDone, thresholds: [10, 50, 100, 250, 500, 1000], label: (t) => `${t} Aufgaben` },
    { key: "habits", title: "Gewohnheiten erfüllt", value: input.habitDone, thresholds: [10, 50, 100, 365], label: (t) => `${t}× abgehakt` },
  ];

  // Ziel-Tracker (z. B. Kraftübungen): je Tracker eine eigene Strähnen-Gruppe.
  for (const ts of input.trackerStreaks ?? []) {
    groups.push({
      key: `tracker-${ts.id}`,
      title: `${ts.label}-Strähne`,
      value: ts.streak,
      thresholds: [3, 7, 14, 30, 60, 100],
      label: (t) => `${ts.label}: ${t} Tage in Folge`,
    });
  }

  const out: Achievement[] = [];
  for (const g of groups) {
    for (const t of g.thresholds) {
      out.push({ id: `${g.key}-${t}`, group: g.title, label: g.label(t), target: t, value: g.value, reached: g.value >= t });
    }
  }
  return out;
}

/** IDs aller freigeschalteten Erfolge. */
export function reachedIds(list: Achievement[]): string[] {
  return list.filter((a) => a.reached).map((a) => a.id);
}

export interface GroupView {
  title: string;
  value: number;
  earned: Achievement[];
  next: Achievement | null;
  total: number;
}

/** Erfolge nach Gruppe für die Anzeige (erreichte + nächstes Ziel). */
export function groupAchievements(list: Achievement[]): GroupView[] {
  const byGroup = new Map<string, Achievement[]>();
  for (const a of list) {
    const arr = byGroup.get(a.group) ?? [];
    arr.push(a);
    byGroup.set(a.group, arr);
  }
  return [...byGroup.entries()].map(([title, items]) => {
    const earned = items.filter((a) => a.reached);
    const next = items.find((a) => !a.reached) ?? null;
    return { title, value: items[0]?.value ?? 0, earned, next, total: items.length };
  });
}
