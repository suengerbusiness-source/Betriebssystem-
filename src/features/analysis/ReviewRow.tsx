import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Trash2 } from "lucide-react";
import { transactions } from "@/data/repo";
import type { Transaction } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";

/*
  Eine Zeile im Monatsabschluss: einhaken (reviewed), Kategorie + Notiz inline
  bearbeiten ("beschriften"), löschen. Änderungen werden beim Verlassen des
  Feldes gespeichert.
*/
export function ReviewRow({ tx }: { tx: Transaction }) {
  const [category, setCategory] = useState(tx.category);
  const [note, setNote] = useState(tx.note ?? "");

  // Bei externem Wechsel (z. B. Import) Felder synchron halten.
  useEffect(() => {
    setCategory(tx.category);
    setNote(tx.note ?? "");
  }, [tx.id, tx.category, tx.note]);

  function commitCategory() {
    const c = category.trim() || "Sonstiges";
    if (c !== tx.category) void transactions.update(tx.id, { category: c });
  }
  function commitNote() {
    const n = note.trim();
    if (n !== (tx.note ?? "")) void transactions.update(tx.id, { note: n || undefined });
  }

  return (
    <li className={cn("group flex flex-wrap items-center gap-2 py-2.5 sm:flex-nowrap", tx.reviewed && "opacity-60")}>
      {/* Einhaken */}
      <button
        onClick={() => transactions.update(tx.id, { reviewed: !tx.reviewed })}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
          tx.reviewed ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary",
        )}
        aria-label="Geprüft markieren"
      >
        {tx.reviewed && <Check size={14} />}
      </button>

      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          tx.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
        )}
      >
        {tx.type === "income" ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
      </div>

      <span className="w-16 shrink-0 text-xs text-muted-foreground">{formatDate(tx.date, "d. MMM")}</span>

      <Input value={category} onChange={(e) => setCategory(e.target.value)} onBlur={commitCategory} className="h-8 w-32 shrink-0" aria-label="Kategorie" />
      <Input value={note} onChange={(e) => setNote(e.target.value)} onBlur={commitNote} placeholder="Notiz…" className="h-8 min-w-0 flex-1" aria-label="Notiz" />

      {tx.mode === "business" && (
        <span className="shrink-0 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-medium text-primary">Business</span>
      )}

      <span className={cn("w-24 shrink-0 text-right font-semibold tabular-nums", tx.type === "income" ? "text-success" : "text-foreground")}>
        {tx.type === "income" ? "+" : "−"}
        {formatCurrency(tx.amount)}
      </span>

      <button
        onClick={() => confirm("Diese Buchung löschen?") && transactions.remove(tx.id)}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Löschen"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
