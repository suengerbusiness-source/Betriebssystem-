import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Coins, Plus, Trash2, TrendingUp } from "lucide-react";
import { revenueStreams as streamsRepo } from "@/data/repo";
import { REVENUE_KINDS, type RevenueKind } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";

export function RevenueTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const all = useLiveQuery(() => streamsRepo.list(accountId), [accountId]) ?? [];
  const list = all.filter((r) => r.companyId === companyId).sort((a, b) => (b.monthlyAmount ?? 0) - (a.monthlyAmount ?? 0));

  const [name, setName] = useState("");
  const [kind, setKind] = useState<RevenueKind>("adsense");
  const [amount, setAmount] = useState("");

  const total = list.reduce((s, r) => s + (r.monthlyAmount ?? 0), 0);

  async function add() {
    if (!name.trim()) return;
    const value = amount ? Number(amount.replace(",", ".")) : undefined;
    await streamsRepo.create({ accountId, companyId, name: name.trim(), kind, monthlyAmount: value && value > 0 ? value : undefined });
    setName("");
    setAmount("");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Einnahmen / Monat" value={formatCurrency(total)} icon={<TrendingUp size={18} />} tone="positive" />
        <StatTile label="Hochgerechnet / Jahr" value={formatCurrency(total * 12)} icon={<Coins size={18} />} />
      </div>

      <Card>
        <CardHeader title="Einnahmequelle hinzufügen" subtitle="AdSense, Sponsoring, Affiliate, Shop, Dienstleistung – alle Standbeine." icon={<Coins size={18} />} />
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="rv-name">Name</Label>
              <Input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. YouTube AdSense" className="h-9" onKeyDown={(e) => e.key === "Enter" && add()} />
            </div>
            <div>
              <Label htmlFor="rv-kind">Art</Label>
              <Select id="rv-kind" value={kind} onChange={(e) => setKind(e.target.value as RevenueKind)} className="h-9">
                {REVENUE_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rv-amount">€ / Monat</Label>
              <Input id="rv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="h-9" />
            </div>
            <div className="flex items-end">
              <Button onClick={add} className="h-9 w-full"><Plus size={16} /> Hinzufügen</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon={<Coins size={22} />} title="Noch keine Einnahmequellen" description="Trag deine Einnahmeströme ein – auch geplante für Shop & Affiliate." />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <ul className="divide-y divide-border">
              {list.map((r) => (
                <li key={r.id} className="group flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <TrendingUp size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.name}</p>
                    <Badge className="mt-0.5 text-muted-foreground">{REVENUE_KINDS.find((k) => k.value === r.kind)?.label}</Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      inputMode="decimal"
                      defaultValue={r.monthlyAmount ?? ""}
                      onBlur={(e) => streamsRepo.update(r.id, { monthlyAmount: Number(e.target.value.replace(",", ".")) || undefined })}
                      className="h-8 w-24 text-right text-sm"
                      aria-label="Monatsbetrag"
                    />
                    <span className="text-xs text-muted-foreground">€/Mon.</span>
                    <button onClick={() => streamsRepo.remove(r.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Löschen">
                      <Trash2 size={15} />
                    </button>
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
