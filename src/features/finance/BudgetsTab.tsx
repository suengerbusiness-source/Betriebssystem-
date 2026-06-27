import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { budgets } from "@/data/repo";
import type { Transaction } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { EXPENSE_CATEGORIES, monthLabel } from "./finance.utils";

/*
  Budgets je Kategorie: Soll (monatliches Limit) vs. Ist (Ausgaben im Monat).
  Farbe der Leiste signalisiert den Stand (grün < 80% < gelb < 100% < rot).
*/
export function BudgetsTab({
  accountId,
  txs,
  month,
}: {
  accountId: string;
  txs: Transaction[];
  month: string;
}) {
  const list = useLiveQuery(() => budgets.list(accountId), [accountId]) ?? [];
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");

  // Ist-Ausgaben je Kategorie im gewählten Monat.
  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of txs) {
      if (tx.type !== "expense" || !tx.date.startsWith(month)) continue;
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
    }
    return map;
  }, [txs, month]);

  const totalLimit = list.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = list.reduce((s, b) => s + (spentByCategory.get(b.category) ?? 0), 0);

  async function add() {
    const value = Number(limit.replace(",", "."));
    const cat = category.trim();
    if (!cat || !Number.isFinite(value) || value <= 0) return;
    if (list.some((b) => b.category.toLowerCase() === cat.toLowerCase())) return;
    await budgets.create({ accountId, category: cat, monthlyLimit: value });
    setCategory("");
    setLimit("");
  }

  const usedCats = new Set(list.map((b) => b.category.toLowerCase()));
  const suggestions = EXPENSE_CATEGORIES.filter((c) => !usedCats.has(c.toLowerCase()));

  return (
    <div className="space-y-4">
      {list.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Budget gesamt ({monthLabel(month)})</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{formatCurrency(totalLimit)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Davon ausgegeben</p>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold tabular-nums",
                totalSpent > totalLimit ? "text-destructive" : "text-success",
              )}
            >
              {formatCurrency(totalSpent)}
            </p>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="Budgets je Kategorie" subtitle="Lege monatliche Limits fest und behalte den Ist-Stand im Blick." icon={<PiggyBank size={18} />} />
        <CardContent className="space-y-4">
          {/* Hinzufügen */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="b-cat">Kategorie</Label>
              <Input id="b-cat" list="budget-cats" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z. B. Lebensmittel" className="h-9" />
              <datalist id="budget-cats">
                {suggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="w-32">
              <Label htmlFor="b-limit">Limit / Monat</Label>
              <Input
                id="b-limit"
                inputMode="decimal"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="€"
                className="h-9"
              />
            </div>
            <Button onClick={add} className="h-9">
              <Plus size={16} /> Budget
            </Button>
          </div>

          {list.length === 0 ? (
            <EmptyState icon={<PiggyBank size={22} />} title="Noch keine Budgets" description="Setze ein erstes Limit, z. B. für Lebensmittel oder Freizeit." />
          ) : (
            <ul className="space-y-3">
              {list
                .slice()
                .sort((a, b) => a.category.localeCompare(b.category))
                .map((b) => {
                  const spent = spentByCategory.get(b.category) ?? 0;
                  const pct = b.monthlyLimit ? Math.min(Math.round((spent / b.monthlyLimit) * 100), 999) : 0;
                  const tone =
                    spent > b.monthlyLimit ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-success";
                  return (
                    <li key={b.id} className="group">
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{b.category}</span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums text-muted-foreground">
                            {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
                          </span>
                          <button
                            onClick={() => budgets.remove(b.id)}
                            className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            aria-label="Budget löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      {spent > b.monthlyLimit && (
                        <p className="mt-1 text-xs text-destructive">
                          {formatCurrency(spent - b.monthlyLimit)} über Budget
                        </p>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
