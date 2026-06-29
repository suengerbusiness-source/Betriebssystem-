import type { Channel, ContentItem, Investment, Transaction } from "@/data/types";

/** Vorschläge für Einnahme-Kategorien (frei erweiterbar). */
export const COMPANY_INCOME_CATEGORIES = [
  "TikTok Partnerprogramm",
  "Creator Fund",
  "Shop",
  "Live-Geschenke",
  "Sponsoring",
  "Affiliate",
  "AdSense / Werbung",
  "Dienstleistung",
  "Sonstiges",
];

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

export interface CompanyStats {
  followers: number;
  channelsActive: number;
  published: number;
  views: number;
  contentTotal: number;
  invested: number;
  recurringMonthly: number;
  /** Ist-Einnahmen des laufenden Monats (aus dem Finanz-Ledger). */
  monthlyRevenue: number;
  /** Geplante Einnahmen des laufenden Monats. */
  plannedRevenue: number;
  /** Bisher insgesamt erfasste (gebuchte) Einnahmen. */
  totalRevenue: number;
}

/**
 * Kennzahlen eines Unternehmens. Einnahmen kommen direkt aus den zugeordneten
 * Finanz-Buchungen (companyId) – so gibt es keine doppelte Erfassung.
 */
export function companyStats(
  channels: Channel[],
  content: ContentItem[],
  investments: Investment[],
  incomeTxs: Transaction[],
  monthKey: string,
): CompanyStats {
  const followers = channels.reduce((s, c) => s + (c.followers ?? 0), 0);
  const channelsActive = channels.filter((c) => c.status === "active").length;
  const published = content.filter((c) => c.stage === "published").length;
  const views = content.reduce((s, c) => s + (c.views ?? 0), 0);
  const invested = investments.reduce((s, i) => s + i.amount, 0);
  const recurringMonthly = investments.filter((i) => i.recurring).reduce((s, i) => s + i.amount, 0);

  let monthlyRevenue = 0;
  let plannedRevenue = 0;
  let totalRevenue = 0;
  for (const t of incomeTxs) {
    if (!t.planned) totalRevenue += t.amount;
    if (!t.date.startsWith(monthKey)) continue;
    if (t.planned) plannedRevenue += t.amount;
    else monthlyRevenue += t.amount;
  }

  return {
    followers,
    channelsActive,
    published,
    views,
    contentTotal: content.length,
    invested,
    recurringMonthly,
    monthlyRevenue,
    plannedRevenue,
    totalRevenue,
  };
}

/** Content-Anzahl je Pipeline-Stufe. */
export function stageCounts(content: ContentItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of content) map[c.stage] = (map[c.stage] ?? 0) + 1;
  return map;
}
