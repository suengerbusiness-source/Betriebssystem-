import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Plus, Repeat, Trash2, TrendingDown, Wallet } from "lucide-react";
import { investments as investmentsRepo, transactions } from "@/data/repo";
import { INVESTMENT_CATEGORIES, type Investment } from "@/data/types";
import { formatCurrency, formatDate, todayISODate } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseISO } from "date-fns";

export function InvestmentsTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const all = useLiveQuery(() => investmentsRepo.list(accountId), [accountId]) ?? [];
  const list = all.filter((i) => i.companyId === companyId).sort((a, b) => b.date.localeCompare(a.date));

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(INVESTMENT_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [recurring, setRecurring] = useState(false);

  const total = list.reduce((s, i) => s + i.amount, 0);
  const monthly = list.filter((i) => i.recurring).reduce((s, i) => s + i.amount, 0);

  async function add() {
    const value = Number(amount.replace(",", "."));
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return;
    await investmentsRepo.create({ accountId, companyId, title: title.trim(), category, amount: value, date, recurring: recurring || undefined });
    setTitle("");
    setAmount("");
    setRecurring(false);
  }

  /** Investition zusätzlich als Geschäftsausgabe in den Finanzen verbuchen. */
  async function book(i: Investment) {
    if (i.transactionId) return;
    const tx = await transactions.create({
      accountId,
      type: "expense",
      amount: i.amount,
      currency: "EUR",
      category: i.category,
      date: i.date,
      mode: "business",
      note: i.title,
    });
    await investmentsRepo.update(i.id, { transactionId: tx.id });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Investiert gesamt" value={formatCurrency(total)} icon={<TrendingDown size={18} />} tone="negative" />
        <StatTile label="Davon monatlich (Abos)" value={formatCurrency(monthly)} icon={<Repeat size={18} />} />
      </div>

      <Card>
        <CardHeader title="Investition erfassen" subtitle="Equipment, Werbung, Tools, Bildung – was du ins Business steckst." icon={<Wallet size={18} />} />
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label htmlFor="iv-title">Bezeichnung</Label>
              <Input id="iv-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Kamera, Ads-Kampagne" className="h-9" onKeyDown={(e) => e.key === "Enter" && add()} />
            </div>
            <div>
              <Label htmlFor="iv-cat">Kategorie</Label>
              <Select id="iv-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9">
                {INVESTMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="iv-amount">Betrag (€)</Label>
              <Input id="iv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="h-9" />
            </div>
            <div>
              <Label htmlFor="iv-date">Datum</Label>
              <Input id="iv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-end">
              <Button onClick={add} className="h-9 w-full"><Plus size={16} /> Hinzufügen</Button>
            </div>
          </div>
          <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Wiederkehrend (monatliches Abo)
          </label>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon={<Wallet size={22} />} title="Noch keine Investitionen" description="Halte fest, was du investierst – für klare Rentabilität." />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <ul className="divide-y divide-border">
              {list.map((i) => (
                <li key={i.id} className="group flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                    <TrendingDown size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{i.title}</p>
                      <Badge className="text-muted-foreground">{i.category}</Badge>
                      {i.recurring && <Badge className="gap-1 text-muted-foreground"><Repeat size={11} /> mtl.</Badge>}
                      {i.transactionId && <Badge className="gap-1 border-success/40 text-success"><Check size={11} /> in Finanzen</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(parseISO(i.date), "d. MMM yyyy")}</p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">{formatCurrency(i.amount)}</p>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!i.transactionId && (
                      <Button size="sm" variant="outline" onClick={() => book(i)} title="Als Geschäftsausgabe in Finanzen buchen">
                        <Wallet size={14} /> <span className="hidden sm:inline">Buchen</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => investmentsRepo.remove(i.id)} aria-label="Löschen">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
