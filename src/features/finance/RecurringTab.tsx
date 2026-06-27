import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Plus, Repeat, Trash2 } from "lucide-react";
import { useMode } from "@/context/ModeContext";
import { recurringTemplates, transactions } from "@/data/repo";
import { MODES, type Transaction, type TxMode, type TxType } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, monthLabel } from "./finance.utils";

/*
  Wiederkehrende Buchungen als Vorlagen. Per Klick wird eine Vorlage für den
  gewählten Monat gebucht. Doppelbuchungen werden über templateId+Monat
  verhindert – bewusst nutzergesteuert (kein stiller Hintergrund-Job).
*/
export function RecurringTab({
  accountId,
  txs,
  month,
}: {
  accountId: string;
  txs: Transaction[];
  month: string;
}) {
  const templates = useLiveQuery(() => recurringTemplates.list(accountId), [accountId]) ?? [];
  const { defaultMode } = useMode();

  const [type, setType] = useState<TxType>("expense");
  const [mode, setMode] = useState<TxMode>(defaultMode);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [day, setDay] = useState("1");

  const bookedTemplateIds = useMemo(() => {
    const set = new Set<string>();
    for (const tx of txs) {
      if (tx.templateId && tx.date.startsWith(month)) set.add(tx.templateId);
    }
    return set;
  }, [txs, month]);

  async function addTemplate() {
    const value = Number(amount.replace(",", "."));
    const cat = category.trim();
    const d = Math.min(Math.max(parseInt(day, 10) || 1, 1), 28);
    if (!cat || !Number.isFinite(value) || value <= 0) return;
    await recurringTemplates.create({ accountId, type, mode, amount: value, category: cat, dayOfMonth: d });
    setAmount("");
    setCategory("");
    setDay("1");
  }

  async function book(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t || bookedTemplateIds.has(t.id)) return;
    const date = `${month}-${String(t.dayOfMonth).padStart(2, "0")}`;
    await transactions.create({
      accountId,
      type: t.type,
      mode: t.mode ?? "private",
      amount: t.amount,
      currency: "EUR",
      category: t.category,
      note: t.note,
      date,
      templateId: t.id,
    });
  }

  async function bookAll() {
    for (const t of templates) {
      if (!bookedTemplateIds.has(t.id)) await book(t.id);
    }
  }

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const openCount = templates.filter((t) => !bookedTemplateIds.has(t.id)).length;

  return (
    <Card>
      <CardHeader
        title="Wiederkehrende Buchungen"
        subtitle={`Vorlagen für regelmäßige Ein-/Ausgaben – buchen für ${monthLabel(month)}.`}
        icon={<Repeat size={18} />}
        action={
          templates.length > 0 && openCount > 0 ? (
            <Button size="sm" onClick={bookAll}>
              Alle buchen ({openCount})
            </Button>
          ) : undefined
        }
      />
      <CardContent className="space-y-4">
        {/* Vorlage hinzufügen */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="inline-flex rounded-md bg-secondary p-1">
            {(["expense", "income"] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded px-2.5 py-1.5 text-sm font-medium transition-colors",
                  type === t ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
              >
                {t === "income" ? "Einnahme" : "Ausgabe"}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-md bg-secondary p-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={cn(
                  "rounded px-2.5 py-1.5 text-sm font-medium transition-colors",
                  mode === m.value ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="w-24">
            <Label htmlFor="r-amount">Betrag</Label>
            <Input id="r-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="€" className="h-9" />
          </div>
          <div className="min-w-[8rem] flex-1">
            <Label htmlFor="r-cat">Kategorie</Label>
            <Input id="r-cat" list="rec-cats" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z. B. Miete" className="h-9" />
            <datalist id="rec-cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="w-20">
            <Label htmlFor="r-day">Tag</Label>
            <Input id="r-day" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} placeholder="1–28" className="h-9" />
          </div>
          <Button onClick={addTemplate} className="h-9">
            <Plus size={16} /> Vorlage
          </Button>
        </div>

        {templates.length === 0 ? (
          <EmptyState icon={<Repeat size={22} />} title="Keine Vorlagen" description="Lege z. B. Miete, Gehalt oder Abos als wiederkehrende Buchung an." />
        ) : (
          <ul className="divide-y divide-border">
            {templates
              .slice()
              .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
              .map((t) => {
                const booked = bookedTemplateIds.has(t.id);
                return (
                  <li key={t.id} className="group flex items-center gap-3 py-3">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                      <Repeat size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.category}</p>
                      <p className="text-xs text-muted-foreground">Jeden {t.dayOfMonth}. · {t.type === "income" ? "Einnahme" : "Ausgabe"}</p>
                    </div>
                    <p className={cn("shrink-0 font-semibold tabular-nums", t.type === "income" ? "text-success" : "text-foreground")}>
                      {t.type === "income" ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </p>
                    {booked ? (
                      <span className="flex shrink-0 items-center gap-1 text-sm text-success">
                        <Check size={16} /> Gebucht
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => book(t.id)}>
                        Buchen
                      </Button>
                    )}
                    <button
                      onClick={() => recurringTemplates.remove(t.id)}
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Vorlage löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
