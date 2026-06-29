import type {
  BusinessIdea,
  Channel,
  ContentItem,
  Investment,
  RevenueStream,
} from "@/data/types";

/** Große Zahlen kompakt: 12.300 -> „12,3k", 1.200.000 -> „1,2 Mio.". */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000) {
    const v = n / 1_000_000;
    return `${(Math.round(v * 10) / 10).toString().replace(".", ",")} Mio.`;
  }
  if (Math.abs(n) >= 1000) {
    const v = n / 1000;
    return `${(Math.round(v * 10) / 10).toString().replace(".", ",")}k`;
  }
  return new Intl.NumberFormat("de-DE").format(n);
}

/** Priorisierung einer Idee: viel Wirkung, wenig Aufwand zuerst. */
export function ideaScore(i: Pick<BusinessIdea, "impact" | "effort">): number {
  return (i.impact ?? 0) * 2 - (i.effort ?? 0);
}

export interface CompanyStats {
  followers: number;
  channelsActive: number;
  published: number;
  views: number;
  contentTotal: number;
  invested: number;
  recurringMonthly: number;
  monthlyRevenue: number;
  contentRevenue: number;
  ideasOpen: number;
}

/** Kennzahlen eines Unternehmens aus allen zugeordneten Daten verdichten. */
export function companyStats(
  channels: Channel[],
  content: ContentItem[],
  investments: Investment[],
  streams: RevenueStream[],
  ideas: BusinessIdea[],
): CompanyStats {
  const followers = channels.reduce((s, c) => s + (c.followers ?? 0), 0);
  const channelsActive = channels.filter((c) => c.status === "active").length;
  const published = content.filter((c) => c.stage === "published").length;
  const views = content.reduce((s, c) => s + (c.views ?? 0), 0);
  const contentRevenue = content.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const invested = investments.reduce((s, i) => s + i.amount, 0);
  const recurringMonthly = investments.filter((i) => i.recurring).reduce((s, i) => s + i.amount, 0);
  const monthlyRevenue = streams.reduce((s, r) => s + (r.monthlyAmount ?? 0), 0);
  const ideasOpen = ideas.filter((i) => i.status !== "done" && i.status !== "dropped").length;
  return {
    followers,
    channelsActive,
    published,
    views,
    contentTotal: content.length,
    invested,
    recurringMonthly,
    monthlyRevenue,
    contentRevenue,
    ideasOpen,
  };
}

/** Content-Anzahl je Pipeline-Stufe. */
export function stageCounts(content: ContentItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of content) map[c.stage] = (map[c.stage] ?? 0) + 1;
  return map;
}
