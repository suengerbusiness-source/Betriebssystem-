import { useEffect, useRef, useState, type FormEvent } from "react";
import { Paperclip, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { transactions } from "@/data/repo";
import { MODES, type Transaction, type TxMode, type TxType } from "@/data/types";
import { todayISODate } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./finance.utils";

type Attachment = { name: string; dataUrl: string };

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
  const { defaultMode } = useMode();
  const [type, setType] = useState<TxType>("expense");
  const [mode, setMode] = useState<TxMode>("private");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setMode(editing.mode ?? "private");
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(editing.date);
      setNote(editing.note ?? "");
      setAttachments(editing.attachments ?? []);
    } else {
      setType("expense");
      setMode(defaultMode);
      setAmount("");
      setCategory("");
      setDate(todayISODate());
      setNote("");
      setAttachments([]);
    }
    setError(null);
  }, [open, editing, defaultMode]);

  function onPickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setAttachments((a) => [...a, { name: file.name, dataUrl: String(reader.result) }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

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
    const atts = attachments.length ? attachments : undefined;
    if (editing) {
      await transactions.update(editing.id, { type, mode, amount: value, category: cat, date, note: note.trim() || undefined, attachments: atts });
    } else {
      await transactions.create({
        accountId: account.id,
        type,
        mode,
        amount: value,
        currency: "EUR",
        category: cat,
        date,
        note: note.trim() || undefined,
        attachments: atts,
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

        {/* Modus-Umschalter (Privat/Business) */}
        <div className="grid grid-cols-2 gap-2 rounded-md bg-secondary p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded px-3 py-2 text-sm font-medium transition-colors",
                mode === m.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
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

        {/* Belege */}
        <div>
          <Label>Belege (optional)</Label>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple onChange={onPickReceipt} className="hidden" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip size={15} /> Beleg anhängen
            </Button>
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs">
                <a href={a.dataUrl} target="_blank" rel="noreferrer" className="max-w-[10rem] truncate hover:underline" title={a.name}>
                  {a.name}
                </a>
                <button type="button" onClick={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Beleg entfernen">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
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
