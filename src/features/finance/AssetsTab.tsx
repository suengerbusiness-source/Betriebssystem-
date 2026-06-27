import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Landmark, Plus, Trash2, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { assets } from "@/data/repo";
import { ASSET_CATEGORIES } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHART_COLORS } from "./finance.utils";

/*
  Vermögensübersicht / Net-Worth-Tracker.
  Netto-Vermögen = Summe der Positionen − Summe der Schulden (liability).
*/
export function AssetsTab({ accountId }: { accountId: string }) {
  const list = useLiveQuery(() => assets.list(accountId), [accountId]) ?? [];

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(ASSET_CATEGORIES[0]);
  const [value, setValue] = useState("");
  const [liability, setLiability] = useState(false);

  const totals = useMemo(() => {
    let assetSum = 0;
    let debtSum = 0;
    for (const a of list) {
      if (a.liability) debtSum += a.value;
      else assetSum += a.value;
    }
    return { assetSum, debtSum, net: assetSum - debtSum };
  }, [list]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of list) {
      if (a.liability) continue;
      map.set(a.category, (map.get(a.category) ?? 0) + a.value);
    }
    return [...map.entries()].map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value);
  }, [list]);

  async function add() {
    const v = Number(value.replace(",", "."));
    if (!name.trim() || !Number.isFinite(v) || v <= 0) return;
    await assets.create({ accountId, name: name.trim(), category, value: v, liability });
    setName("");
    setValue("");
    setLiability(false);
  }

  return (
    <div className="space-y-4">
      {/* Netto-Vermögen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 sm:col-span-1">
          <p className="text-sm text-muted-foreground">Netto-Vermögen</p>
          <p className={cn("mt-2 text-2xl font-semibold tabular-nums", totals.net >= 0 ? "text-success" : "text-destructive")}>
            {formatCurrency(totals.net)}
          </p>
        </Card>
        <StatTile label="Vermögen" value={formatCurrency(totals.assetSum)} icon={<TrendingUp size={18} />} tone="positive" />
        <StatTile label="Schulden" value={formatCurrency(totals.debtSum)} icon={<Landmark size={18} />} tone={totals.debtSum > 0 ? "negative" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Positionen verwalten */}
        <Card className="lg:col-span-3">
          <CardHeader title="Positionen" subtitle="Konten, Investitionen, Immobilien, Schulden …" icon={<Landmark size={18} />} />
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[9rem] flex-1">
                <Label htmlFor="a-name">Bezeichnung</Label>
                <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Tagesgeld" className="h-9" />
              </div>
              <div className="w-40">
                <Label htmlFor="a-cat">Kategorie</Label>
                <Select id="a-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9">
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-28">
                <Label htmlFor="a-val">Wert (€)</Label>
                <Input id="a-val" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="h-9" />
              </div>
              <label className="flex h-9 cursor-pointer items-center gap-1.5 text-sm">
                <input type="checkbox" checked={liability} onChange={(e) => setLiability(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Schuld
              </label>
              <Button onClick={add} className="h-9">
                <Plus size={16} />
              </Button>
            </div>

            {list.length === 0 ? (
              <EmptyState icon={<Landmark size={22} />} title="Noch keine Positionen" description="Erfasse dein erstes Konto, Investment oder eine Schuld." />
            ) : (
              <ul className="divide-y divide-border">
                {list
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((a) => (
                    <li key={a.id} className="group flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.category}{a.liability && " · Schuld"}</p>
                      </div>
                      <p className={cn("shrink-0 font-semibold tabular-nums", a.liability ? "text-destructive" : "text-foreground")}>
                        {a.liability ? "−" : ""}
                        {formatCurrency(a.value)}
                      </p>
                      <button
                        onClick={() => assets.remove(a.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Position löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Aufteilung */}
        <Card className="lg:col-span-2">
          <CardHeader title="Aufteilung" subtitle="Vermögen nach Kategorie" />
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Noch keine Vermögenswerte.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {byCategory.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                        formatter={(v: number) => formatCurrency(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                  {byCategory.map((c, i) => (
                    <li key={c.name} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">{formatCurrency(c.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
