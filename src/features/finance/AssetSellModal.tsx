import { useState } from "react";
import { assets, transactions } from "@/data/repo";
import { MODES, type Asset, type Company, type TxMode } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Verkauf eines Vermögensgegenstands: Erlös + Datum erfassen, als Privat oder
 * Business (mit Unternehmen) zuordnen und optional direkt als Einnahme buchen.
 * Der Gegenstand wird als „verkauft" markiert (zählt dann nicht mehr ins Netto).
 */
export function AssetSellModal({
  asset,
  companies,
  accountId,
  onClose,
}: {
  asset: Asset;
  companies: Company[];
  accountId: string;
  onClose: () => void;
}) {
  const [price, setPrice] = useState(String(asset.value ?? ""));
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState<TxMode>(asset.mode ?? "private");
  const [companyId, setCompanyId] = useState<string>(asset.companyId ?? companies[0]?.id ?? "");
  const [book, setBook] = useState(true);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    const value = Number(price.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return;
    setBusy(true);
    try {
      const comp = mode === "business" ? companyId || undefined : undefined;
      await assets.update(asset.id, { sold: true, soldAt: date, soldPrice: value, mode, companyId: comp });
      if (book) {
        await transactions.create({
          accountId,
          type: "income",
          mode,
          amount: value,
          currency: "EUR",
          category: "Verkauf",
          date,
          note: `Verkauf: ${asset.name}`,
          companyId: comp,
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`„${asset.name}" verkaufen`} description="Erlös erfassen und zuordnen.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sell-price">Verkaufserlös (€)</Label>
            <Input id="sell-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="sell-date">Datum</Label>
            <Input id="sell-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>
        </div>

        <div>
          <Label htmlFor="sell-mode">Zuordnung</Label>
          <Select id="sell-mode" value={mode} onChange={(e) => setMode(e.target.value as TxMode)} className="h-9">
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </div>

        {mode === "business" && (
          <div>
            <Label htmlFor="sell-company">Unternehmen</Label>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch kein Unternehmen angelegt.</p>
            ) : (
              <Select id="sell-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-9">
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={book} onChange={(e) => setBook(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Erlös als Einnahme in Finanzen buchen ({formatCurrency(Number(price.replace(",", ".")) || 0)})
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={confirm} disabled={busy}>Verkauf bestätigen</Button>
        </div>
      </div>
    </Modal>
  );
}
