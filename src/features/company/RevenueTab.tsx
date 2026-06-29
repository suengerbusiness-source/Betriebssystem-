import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CheckCircle2, Clock, Coins, Link2, Plus, TrendingUp, Trash2 } from "lucide-react";
import { channels as channelsRepo, transactions } from "@/data/repo";
import type { Transaction } from "@/data/types";
import { formatCurrency, formatDate, todayISODate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { currentMonthKey, monthLabel, relativeDayLabel } from "@/features/finance/finance.utils";
import { platformOf } from "./company.platforms";
import { COMPANY_INCOME_CATEGORIES } from "./company.utils";

/**
 * Einnahmen des Unternehmens als echte Buchungen – geplant oder vergangen,
 * beliebig oft pro Monat (TikTok Partnerprogramm, Shop, Live …). Sie liegen im
 * gemeinsamen Finanz-Ledger (companyId), erscheinen also automatisch in den
 * Finanzen und können nicht doppelt vorkommen.
 */
export function RevenueTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const allTxs = useLiveQuery(() => transactions.list(accountId), [accountId]) ?? [];
  const allChannels = useLiveQuery(() => channelsRepo.list(accountId), [accountId]) ?? [];
  const companyChannels = allChannels.filter((c) => c.companyId === companyId);
  const channelById = useMemo(() => new Map(allChannels.map((c) => [c.id, c])), [allChannels]);

  const income = useMemo(
    () => allTxs.filter((t) => t.type === "income" && t.companyId === companyId),
    [allTxs, companyId],
  );

  const today = todayISODate();
  const month = currentMonthKey();
  const thisMonthActual = income.filter((t) => !t.planned && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  const thisMonthPlanned = income.filter((t) => t.planned && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  const total = income.filter((t) => !t.planned).reduce((s, t) => s + t.amount, 0);

  // Nach Monat gruppieren (neueste zuerst), inkl. Ist-Summe je Monat.
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of income) {
      const key = t.date.slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        items: items.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
        sum: items.filter((t) => !t.planned).reduce((s, t) => s + t.amount, 0),
      }));
  }, [income]);

  // Formular
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(COMPANY_INCOME_CATEGORIES[0]);
  const [channelId, setChannelId] = useState("");
  const [date, setDate] = useState(today);
  const [planned, setPlanned] = useState(false);

  function onDate(value: string) {
    setDate(value);
    setPlanned(value > today);
  }

  async function add() {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    await transactions.create({
      accountId,
      type: "income",
      amount: value,
      currency: "EUR",
      category: category.trim() || "Einnahme",
      date,
      mode: "business",
      planned: planned || undefined,
      companyId,
      channelId: channelId || undefined,
    });
    setAmount("");
    setPlanned(false);
    setDate(todayISODate());
  }

  async function markDone(t: Transaction) {
    await transactions.update(t.id, { planned: false });
  }
  async function remove(t: Transaction) {
    if (confirm("Diese Einnahme löschen? (wird auch aus den Finanzen entfernt)")) await transactions.remove(t.id);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Einnahmen diesen Monat" value={formatCurrency(thisMonthActual)} icon={<TrendingUp size={18} />} tone="positive" hint={thisMonthPlanned > 0 ? `+ ${formatCurrency(thisMonthPlanned)} geplant` : undefined} />
        <StatTile label="Geplant (Monat)" value={formatCurrency(thisMonthPlanned)} icon={<Clock size={18} />} />
        <StatTile label="Erfasst gesamt" value={formatCurrency(total)} icon={<Coins size={18} />} />
      </div>

      <Card>
        <CardHeader title="Einnahme verbuchen" subtitle="Geplant oder vergangen, beliebig oft pro Monat." icon={<Coins size={18} />} />
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <Label htmlFor="rv-amount">Betrag (€)</Label>
              <Input id="rv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="h-9" onKeyDown={(e) => e.key === "Enter" && add()} autoFocus />
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="rv-cat">Quelle</Label>
              <Input id="rv-cat" list="rv-cats" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z. B. TikTok Partnerprogramm" className="h-9" />
              <datalist id="rv-cats">
                {COMPANY_INCOME_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="rv-chan">Kanal</Label>
              <Select id="rv-chan" value={channelId} onChange={(e) => setChannelId(e.target.value)} className="h-9">
                <option value="">— keiner —</option>
                {companyChannels.map((c) => (
                  <option key={c.id} value={c.id}>{platformOf(c.kind).label} · {c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rv-date">Datum</Label>
              <Input id="rv-date" type="date" value={date} onChange={(e) => onDate(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-end">
              <Button onClick={add} className="h-9 w-full"><Plus size={16} /> Buchen</Button>
            </div>
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={planned} onChange={(e) => setPlanned(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            <span>Geplant / voraussichtlich (zählt separat, nicht in die Ist-Summe)</span>
          </label>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 size={13} /> Jede Einnahme erscheint automatisch in den Finanzen – einmal erfasst, überall sichtbar, nie doppelt.
          </p>
        </CardContent>
      </Card>

      {income.length === 0 ? (
        <EmptyState icon={<Coins size={22} />} title="Noch keine Einnahmen" description="Verbuche deine erste Einnahme – z. B. TikTok Partnerprogramm, Shop oder Live." />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader title={monthLabel(g.key)} subtitle={`${g.items.length} ${g.items.length === 1 ? "Buchung" : "Buchungen"}`} action={<span className="text-sm font-semibold tabular-nums text-success">{formatCurrency(g.sum)}</span>} />
              <CardContent>
                <ul className="divide-y divide-border">
                  {g.items.map((t) => {
                    const ch = t.channelId ? channelById.get(t.channelId) : undefined;
                    const p = ch ? platformOf(ch.kind) : undefined;
                    const overdue = t.planned && t.date < today;
                    return (
                      <li key={t.id} className="group flex items-center gap-3 py-3">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", t.planned ? (overdue ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground") : "bg-success/15 text-success")}>
                          {t.planned ? (overdue ? <AlertTriangle size={17} /> : <Clock size={17} />) : <TrendingUp size={17} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">{t.category}</p>
                            {p && (
                              <Badge className="gap-1" style={{ borderColor: p.color, color: p.color }}>
                                <p.icon size={11} /> {p.label}
                              </Badge>
                            )}
                            {t.planned && (
                              <Badge className={cn(overdue ? "border-warning/40 text-warning" : "text-muted-foreground")}>
                                {overdue ? "fällig" : relativeDayLabel(t.date)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(t.date, "EEE, d. MMM yyyy")}</p>
                        </div>
                        <p className={cn("shrink-0 font-semibold tabular-nums", t.planned ? "text-muted-foreground" : "text-success")}>+ {formatCurrency(t.amount)}</p>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {t.planned && (
                            <Button size="sm" variant="outline" onClick={() => markDone(t)} title="Als erhalten buchen">
                              <CheckCircle2 size={14} /> <span className="hidden sm:inline">Erhalten</span>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => remove(t)} aria-label="Löschen">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
