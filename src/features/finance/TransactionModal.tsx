import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { transactions } from "@/data/repo";
import type { Transaction, TxType } from "@/data/types";
import { todayISODate } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./finance.utils";

/** Anlegen/Bearbeiten einer Buchung. */
export function TransactionModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
}) {
  const { account } = useAuth();
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(editing.date);
      setNote(editing.note ?? "");
    } else {
      setType("expense");
      setAmount("");
      setCategory("");
      setDate(todayISODate());
      setNote("");
    }
    setError(null);
  }, [open, editing]);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Bitte einen gültigen Betrag eingeben.");
      return;
    }
    const cat = category.trim() || "Sonstiges";
    if (editing) {
      await transactions.update(editing.id, { type, amount: value, category: cat, date, note: note.trim() || undefined });
    } else {
      await transactions.create({
        accountId: account.id,
        type,
        amount: value,
        currency: "EUR",
        category: cat,
        date,
        note: note.trim() || undefined,
      });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Buchung bearbeiten" : "Neue Buchung"}
      description="Erfasse eine Einnahme oder Ausgabe."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Typ-Umschalter */}
        <div className="grid grid-cols-2 gap-2 rounded-md bg-secondary p-1">
          {(["expense", "income"] as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded px-3 py-2 text-sm font-medium transition-colors",
                type === t
                  ? t === "income"
                    ? "bg-success text-white"
                    : "bg-destructive text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "income" ? "Einnahme" : "Ausgabe"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Betrag (€)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="date">Datum</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="category">Kategorie</Label>
          <Input
            id="category"
            list="cat-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="z. B. Lebensmittel"
          />
          <datalist id="cat-suggestions">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="note">Notiz (optional)</Label>
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">{editing ? "Speichern" : "Hinzufügen"}</Button>
        </div>
      </form>
    </Modal>
  );
}
