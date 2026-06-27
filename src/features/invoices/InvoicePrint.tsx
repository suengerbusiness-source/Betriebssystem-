import { Printer, X } from "lucide-react";
import type { Account, Client, Invoice } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { STATUS_LABEL, computeTotals } from "./invoice.utils";

/*
  Druckbare Rechnungsansicht. Über die @media-print-Regeln in index.css wird
  beim Drucken nur der Bereich mit der Klasse `print-area` ausgegeben – so lässt
  sich die Rechnung sauber als PDF speichern oder drucken.
*/
export function InvoicePrint({
  invoice,
  account,
  client,
  onClose,
}: {
  invoice: Invoice;
  account: Account | null;
  client?: Client;
  onClose: () => void;
}) {
  const totals = computeTotals(invoice.items, invoice.kleinunternehmer);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl">
        {/* Steuerleiste – wird nicht gedruckt */}
        <div className="no-print mb-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X size={16} /> Schließen
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={16} /> Drucken / Als PDF
          </Button>
        </div>

        <div className="print-area rounded-xl bg-white p-10 text-[13px] text-zinc-800 shadow-pop">
          {/* Kopf */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-zinc-900">{account?.name}</p>
              <p className="text-zinc-500">Rechnungssteller</p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Rechnung</h1>
              <p className="text-zinc-500">Nr. {invoice.number}</p>
            </div>
          </div>

          {/* Empfänger + Eckdaten */}
          <div className="mt-8 flex items-start justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400">Rechnung an</p>
              <p className="mt-1 font-medium text-zinc-900">{invoice.clientName}</p>
              {client?.address && <p className="whitespace-pre-line text-zinc-600">{client.address}</p>}
              {client?.vatId && <p className="text-zinc-500">USt-IdNr.: {client.vatId}</p>}
            </div>
            <div className="text-right text-zinc-600">
              <p>Datum: {formatDate(invoice.date, "d. MMMM yyyy")}</p>
              {invoice.dueDate && <p>Fällig bis: {formatDate(invoice.dueDate, "d. MMMM yyyy")}</p>}
              <p>Status: {STATUS_LABEL[invoice.status]}</p>
            </div>
          </div>

          {/* Positionen */}
          <table className="mt-8 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-300 text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2">Beschreibung</th>
                <th className="py-2 text-right">Menge</th>
                <th className="py-2 text-right">Einzel (netto)</th>
                {!invoice.kleinunternehmer && <th className="py-2 text-right">USt</th>}
                <th className="py-2 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(it.unitPrice)}</td>
                  {!invoice.kleinunternehmer && <td className="py-2 text-right tabular-nums">{it.vatRate}%</td>}
                  <td className="py-2 text-right tabular-nums">{formatCurrency(it.quantity * it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summen */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-zinc-600">
                <span>Netto</span>
                <span className="tabular-nums">{formatCurrency(totals.net)}</span>
              </div>
              {!invoice.kleinunternehmer &&
                totals.vatByRate.map((v) => (
                  <div key={v.rate} className="flex justify-between text-zinc-600">
                    <span>zzgl. USt {v.rate}%</span>
                    <span className="tabular-nums">{formatCurrency(v.vat)}</span>
                  </div>
                ))}
              <div className="flex justify-between border-t border-zinc-300 pt-1 text-base font-semibold text-zinc-900">
                <span>Gesamtbetrag</span>
                <span className="tabular-nums">{formatCurrency(totals.gross)}</span>
              </div>
            </div>
          </div>

          {invoice.kleinunternehmer && (
            <p className="mt-6 text-zinc-500">
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
            </p>
          )}
          {invoice.notes && <p className="mt-6 whitespace-pre-line text-zinc-600">{invoice.notes}</p>}

          <p className="mt-10 border-t border-zinc-200 pt-3 text-center text-xs text-zinc-400">
            Vielen Dank für Ihren Auftrag.
          </p>
        </div>
      </div>
    </div>
  );
}
