import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleDollarSign, Landmark, Plus, Trash2, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { assets, companies as companiesRepo } from "@/data/repo";
import { ASSET_CATEGORIES, MODES, type Asset, type TxMode } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { parseISO } from "date-fns";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHART_COLORS } from "./finance.utils";
import { AssetSellModal } from "./AssetSellModal";

/*
  Vermögensübersicht / Net-Worth-Tracker.
  Netto-Vermögen = Summe der Positionen − Summe der Schulden (liability).
  Positionen lassen sich Privat/Business (+ Unternehmen) zuordnen und verkaufen.
*/
export function AssetsTab({ accountId }: { accountId: string }) {
  const list = useLiveQuery(() => assets.list(accountId), [accountId]) ?? [];
  const companies = useLiveQuery(() => companiesRepo.list(accountId), [accountId]) ?? [];
  const companyName = (id?: string) => companies.find((c) => c.id === id)?.name;

  const active = list.filter((a) => !a.sold);
  const sold = list.filter((a) => a.sold).sort((a, b) => (b.soldAt ?? "").localeCompare(a.soldAt ?? ""));

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(ASSET_CATEGORIES[0]);
  const [value, setValue] = useState("");
  const [liability, setLiability] = useState(false);
  const [mode, setMode] = useState<TxMode>("private");
  const [companyId, setCompanyId] = useState<string>("");
  const [selling, setSelling] = useState<Asset | null>(null);

  const totals = useMemo(() => {
    let assetSum = 0;
    let debtSum = 0;
    for (const a of active) {
      if (a.liability) debtSum += a.value;
      else assetSum += a.value;
    }
    return { assetSum, debtSum, net: assetSum - debtSum };
  }, [active]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of active) {
      if (a.liability) continue;
      map.set(a.category, (map.get(a.category) ?? 0) + a.value);
    }
    return [...map.entries()].map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value);
  }, [active]);

  async function add() {
    const v = Number(value.replace(",", "."));
    if (!name.trim() || !Number.isFinite(v) || v <= 0) return;
    await assets.create({
      accountId,
      name: name.trim(),
      category,
      value: v,
      liability,
      mode,
      companyId: mode === "business" ? companyId || undefined : undefined,
    });
    setName("");
    setValue("");
    setLiability(false);
  }

  function modeLabel(a: Asset): string {
    if (a.mode === "business") {
      const cn2 = companyName(a.companyId);
      return cn2 ? `Business: ${cn2}` : "Business";
    }
    return "Privat";
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
              <div className="w-32">
                <Label htmlFor="a-mode">Zuordnung</Label>
                <Select id="a-mode" value={mode} onChange={(e) => setMode(e.target.value as TxMode)} className="h-9">
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
              </div>
              {mode === "business" && companies.length > 0 && (
                <div className="w-40">
                  <Label htmlFor="a-comp">Unternehmen</Label>
                  <Select id="a-comp" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-9">
                    <option value="">– wählen –</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              )}
              <label className="flex h-9 cursor-pointer items-center gap-1.5 text-sm">
                <input type="checkbox" checked={liability} onChange={(e) => setLiability(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Schuld
              </label>
              <Button onClick={add} className="h-9">
                <Plus size={16} />
              </Button>
            </div>

            {active.length === 0 ? (
              <EmptyState icon={<Landmark size={22} />} title="Noch keine Positionen" description="Erfasse dein erstes Konto, Investment oder eine Schuld." />
            ) : (
              <ul className="divide-y divide-border">
                {active
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((a) => (
                    <li key={a.id} className="group flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{a.name}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{a.category}{a.liability && " · Schuld"}</span>
                          <Badge className={cn("px-1.5 py-0", a.mode === "business" ? "border-primary/40 text-primary" : "text-muted-foreground")}>
                            {modeLabel(a)}
                          </Badge>
                        </p>
                      </div>
                      <p className={cn("shrink-0 font-semibold tabular-nums", a.liability ? "text-destructive" : "text-foreground")}>
                        {a.liability ? "−" : ""}
                        {formatCurrency(a.value)}
                      </p>
                      {!a.liability && (
                        <button
                          onClick={() => setSelling(a)}
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-success group-hover:opacity-100"
                          aria-label="Verkaufen"
                          title="Verkaufen"
                        >
                          <CircleDollarSign size={16} />
                        </button>
                      )}
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

            {sold.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Verkauft</p>
                <ul className="divide-y divide-border">
                  {sold.map((a) => (
                    <li key={a.id} className="group flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-muted-foreground line-through">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {modeLabel(a)}{a.soldAt ? ` · ${formatDate(parseISO(a.soldAt), "d. MMM yyyy")}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-success">+{formatCurrency(a.soldPrice ?? 0)}</p>
                      <button
                        onClick={() => assets.remove(a.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Eintrag löschen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
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

      {selling && (
        <AssetSellModal asset={selling} companies={companies} accountId={accountId} onClose={() => setSelling(null)} />
      )}
    </div>
  );
}
