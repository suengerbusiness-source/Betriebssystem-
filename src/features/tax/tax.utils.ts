import type { Invoice, Transaction } from "@/data/types";
import { computeTotals } from "@/features/invoices/invoice.utils";

export interface EurSummary {
  income: number;
  expense: number;
  profit: number;
  /** Vereinnahmte USt aus bezahlten Rechnungen des Jahres. */
  vatCollected: number;
  expenseByCategory: { category: string; amount: number }[];
}

/** EÜR-Übersicht (Business) für ein Jahr. */
export function eurSummary(
  txs: Transaction[],
  invoices: Invoice[],
  year: string,
): EurSummary {
  let income = 0;
  let expense = 0;
  const byCat = new Map<string, number>();
  for (const tx of txs) {
    if ((tx.mode ?? "private") !== "business") continue;
    if (!tx.date.startsWith(year)) continue;
    if (tx.type === "income") income += tx.amount;
    else {
      expense += tx.amount;
      byCat.set(tx.category, (byCat.get(tx.category) ?? 0) + tx.amount);
    }
  }
  let vatCollected = 0;
  for (const inv of invoices) {
    if (inv.status !== "paid" || !inv.date.startsWith(year)) continue;
    vatCollected += computeTotals(inv.items, inv.kleinunternehmer).vat;
  }
  return {
    income,
    expense,
    profit: income - expense,
    vatCollected,
    expenseByCategory: [...byCat.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

function csvEscape(v: string): string {
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Business-Buchungen eines Jahres als CSV (für den Steuerberater). */
export function buildTaxCsv(txs: Transaction[], year: string): string {
  const rows = [["Datum", "Art", "Kategorie", "Betrag", "Notiz", "Beleg"]];
  const yearTxs = txs
    .filter((t) => (t.mode ?? "private") === "business" && t.date.startsWith(year))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const t of yearTxs) {
    rows.push([
      t.date,
      t.type === "income" ? "Einnahme" : "Ausgabe",
      t.category,
      t.amount.toFixed(2).replace(".", ","),
      t.note ?? "",
      t.attachments && t.attachments.length > 0 ? "Ja" : "Nein",
    ]);
  }
  return rows.map((r) => r.map((c) => csvEscape(String(c))).join(";")).join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  // BOM, damit Excel die Umlaute korrekt liest.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
