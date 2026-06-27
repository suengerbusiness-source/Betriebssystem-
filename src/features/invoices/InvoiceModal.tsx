import { useEffect, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { clients, invoices } from "@/data/repo";
import { VAT_RATES, type Invoice, type InvoiceItem } from "@/data/types";
import { todayISODate } from "@/lib/format";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { computeTotals } from "./invoice.utils";

const emptyItem = (): InvoiceItem => ({ description: "", quantity: 1, unitPrice: 0, vatRate: 19 });

export function InvoiceModal({
  open,
  onClose,
  accountId,
  editing,
  defaultNumber,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  editing?: Invoice | null;
  defaultNumber: string;
}) {
  const clientList = useLiveQuery(() => clients.list(accountId), [accountId]) ?? [];

  const [number, setNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [kleinunternehmer, setKleinunternehmer] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setNumber(editing.number);
      setClientId(editing.clientId ?? "");
      setClientName(editing.clientName);
      setDate(editing.date);
      setDueDate(editing.dueDate ?? "");
      setItems(editing.items.length ? editing.items.map((i) => ({ ...i })) : [emptyItem()]);
      setKleinunternehmer(editing.kleinunternehmer);
      setNotes(editing.notes ?? "");
    } else {
      setNumber(defaultNumber);
      setClientId("");
      setClientName("");
      setDate(todayISODate());
      setDueDate("");
      setItems([emptyItem()]);
      setKleinunternehmer(false);
      setNotes("");
    }
  }, [open, editing, defaultNumber]);

  const totals = computeTotals(items, kleinunternehmer);

  function setItem(i: number, patch: Partial<InvoiceItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function pickClient(id: string) {
    setClientId(id);
    const c = clientList.find((x) => x.id === id);
    if (c) setClientName(c.name);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!number.trim()) return setError("Bitte eine Rechnungsnummer angeben.");
    if (!clientName.trim()) return setError("Bitte einen Kunden wählen oder eingeben.");
    const cleanItems = items.filter((i) => i.description.trim() || i.unitPrice);
    if (cleanItems.length === 0) return setError("Bitte mindestens eine Position eingeben.");
    const payload = {
      number: number.trim(),
      clientId: clientId || undefined,
      clientName: clientName.trim(),
      date,
      dueDate: dueDate || undefined,
      items: cleanItems,
      kleinunternehmer,
      notes: notes.trim() || undefined,
    };
    if (editing) await invoices.update(editing.id, payload);
    else await invoices.create({ accountId, status: "draft", ...payload });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Rechnung ${editing.number}` : "Neue Rechnung"} className="max-w-2xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="i-number">Nummer</Label>
            <Input id="i-number" value={number} onChange={(e) => setNumber(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="i-date">Datum</Label>
            <Input id="i-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="i-due">Fällig bis</Label>
            <Input id="i-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="i-client-sel">Kunde</Label>
            <Select id="i-client-sel" value={clientId} onChange={(e) => pickClient(e.target.value)} className="h-9">
              <option value="">— wählen —</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {!clientId && (
          <div>
            <Label htmlFor="i-clientname">Kundenname (manuell)</Label>
            <Input id="i-clientname" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Name / Firma" className="h-9" />
          </div>
        )}

        {/* Positionen */}
        <div>
          <Label>Positionen</Label>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={it.description}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  placeholder="Beschreibung"
                  className="h-9 flex-1"
                />
                <Input
                  inputMode="decimal"
                  value={String(it.quantity)}
                  onChange={(e) => setItem(i, { quantity: Number(e.target.value.replace(",", ".")) || 0 })}
                  className="h-9 w-14"
                  aria-label="Menge"
                />
                <Input
                  inputMode="decimal"
                  value={String(it.unitPrice)}
                  onChange={(e) => setItem(i, { unitPrice: Number(e.target.value.replace(",", ".")) || 0 })}
                  className="h-9 w-24"
                  aria-label="Einzelpreis (netto)"
                  placeholder="€ netto"
                />
                <Select
                  value={String(it.vatRate)}
                  onChange={(e) => setItem(i, { vatRate: Number(e.target.value) })}
                  className="h-9 w-20"
                  disabled={kleinunternehmer}
                  aria-label="USt-Satz"
                >
                  {VAT_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </Select>
                <button type="button" onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Position entfernen">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setItems((a) => [...a, emptyItem()])}>
            <Plus size={15} /> Position
          </Button>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={kleinunternehmer} onChange={(e) => setKleinunternehmer(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Kleinunternehmer (§19 UStG – keine USt ausweisen)
        </label>

        {/* Summen */}
        <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Netto</span><span className="tabular-nums">{formatCurrency(totals.net)}</span></div>
          {!kleinunternehmer && totals.vatByRate.map((v) => (
            <div key={v.rate} className="flex justify-between"><span className="text-muted-foreground">USt {v.rate}%</span><span className="tabular-nums">{formatCurrency(v.vat)}</span></div>
          ))}
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>Gesamt</span><span className="tabular-nums">{formatCurrency(totals.gross)}</span></div>
        </div>

        <div>
          <Label htmlFor="i-notes">Notiz / Zahlungshinweis (optional)</Label>
          <Textarea id="i-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z. B. Zahlbar innerhalb 14 Tagen auf IBAN…" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit">{editing ? "Speichern" : "Anlegen"}</Button>
        </div>
      </form>
    </Modal>
  );
}
