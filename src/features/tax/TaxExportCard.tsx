import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, Receipt } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { invoices, transactions } from "@/data/repo";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { buildTaxCsv, downloadCsv, eurSummary } from "./tax.utils";

/*
  EÜR-/Steuer-Export (Business) für ein Jahr: Einnahmen, Ausgaben, Überschuss,
  vereinnahmte USt aus bezahlten Rechnungen + CSV-Export für den Steuerberater.
  Hinweis: keine Steuerberatung – nur eine Übersicht deiner erfassten Daten.
*/
export function TaxExportCard() {
  const { account } = useAuth();
  const accId = account?.id;
  const txs = useLiveQuery(() => (accId ? transactions.list(accId) : []), [accId]) ?? [];
  const invs = useLiveQuery(() => (accId ? invoices.list(accId) : []), [accId]) ?? [];

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const summary = useMemo(() => eurSummary(txs, invs, year), [txs, invs, year]);

  function exportCsv() {
    downloadCsv(`euer-business-${year}.csv`, buildTaxCsv(txs, year));
  }

  return (
    <Card>
      <CardHeader
        title="Steuer & EÜR (Business)"
        subtitle="Einnahmenüberschuss-Übersicht und CSV-Export für den Steuerberater."
        icon={<Receipt size={18} />}
        action={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setYear((y) => String(Number(y) - 1))} aria-label="Vorheriges Jahr">
              <ChevronLeft size={16} />
            </Button>
            <span className="min-w-[3.5rem] text-center font-medium">{year}</span>
            <Button variant="outline" size="icon" onClick={() => setYear((y) => String(Number(y) + 1))} aria-label="Nächstes Jahr">
              <ChevronRight size={16} />
            </Button>
          </div>
        }
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Einnahmen" value={summary.income} tone="positive" />
          <Mini label="Ausgaben" value={summary.expense} tone="negative" />
          <Mini label="Überschuss" value={summary.profit} tone={summary.profit >= 0 ? "positive" : "negative"} />
          <Mini label="USt vereinnahmt" value={summary.vatCollected} />
        </div>

        {summary.expenseByCategory.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Ausgaben nach Kategorie</p>
            <ul className="space-y-1 text-sm">
              {summary.expenseByCategory.map((c) => (
                <li key={c.category} className="flex justify-between">
                  <span className="text-muted-foreground">{c.category}</span>
                  <span className="tabular-nums">{formatCurrency(c.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCsv}>
            <FileSpreadsheet size={18} /> EÜR-CSV {year} exportieren
          </Button>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Download size={13} className="mt-0.5 shrink-0" />
          Hinweis: Dies ist eine Übersicht deiner erfassten Business-Daten, keine
          Steuerberatung. USt-Detail stammt aus bezahlten Rechnungen.
        </p>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold tabular-nums", tone === "positive" && "text-success", tone === "negative" && "text-destructive")}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
