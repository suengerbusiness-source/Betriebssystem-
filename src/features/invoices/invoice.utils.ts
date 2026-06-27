import type { Invoice, InvoiceItem, InvoiceStatus } from "@/data/types";

export interface InvoiceTotals {
  net: number;
  vat: number;
  gross: number;
  /** USt nach Satz aufgeschlüsselt (für den Ausweis). */
  vatByRate: { rate: number; net: number; vat: number }[];
}

/** Netto/USt/Brutto einer Rechnung berechnen (Kleinunternehmer = keine USt). */
export function computeTotals(items: InvoiceItem[], kleinunternehmer: boolean): InvoiceTotals {
  let net = 0;
  let vat = 0;
  const byRate = new Map<number, { net: number; vat: number }>();
  for (const it of items) {
    const lineNet = (it.quantity || 0) * (it.unitPrice || 0);
    const rate = kleinunternehmer ? 0 : it.vatRate || 0;
    const lineVat = (lineNet * rate) / 100;
    net += lineNet;
    vat += lineVat;
    const cur = byRate.get(rate) ?? { net: 0, vat: 0 };
    cur.net += lineNet;
    cur.vat += lineVat;
    byRate.set(rate, cur);
  }
  return {
    net,
    vat,
    gross: net + vat,
    vatByRate: [...byRate.entries()]
      .filter(([rate]) => rate > 0)
      .map(([rate, v]) => ({ rate, ...v }))
      .sort((a, b) => b.rate - a.rate),
  };
}

/** Bruttobetrag (für Listen/Kennzahlen). */
export function invoiceGross(inv: Invoice): number {
  return computeTotals(inv.items, inv.kleinunternehmer).gross;
}

/** Nächste Rechnungsnummer vorschlagen: JAHR-NNN, fortlaufend. */
export function suggestNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  let max = 0;
  for (const inv of invoices) {
    const m = inv.number.match(new RegExp(`^${year}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function isOverdue(inv: Invoice, today: string): boolean {
  return inv.status === "sent" && !!inv.dueDate && inv.dueDate < today;
}

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
};
