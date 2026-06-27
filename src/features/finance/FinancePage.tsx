import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { transactions } from "@/data/repo";
import type { Transaction } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TransactionModal } from "./TransactionModal";
import {
  CHART_COLORS,
  currentMonthKey,
  expensesByCategory,
  monthLabel,
  monthlySeries,
  summarizeMonth,
} from "./finance.utils";

export function FinancePage() {
  const { account } = useAuth();
  const txs =
    useLiveQuery(() => (account ? transactions.list(account.id) : []), [account?.id]) ?? [];

  const [month, setMonth] = useState(currentMonthKey());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const summary = useMemo(() => summarizeMonth(txs, month), [txs, month]);
  const series = useMemo(() => monthlySeries(txs, 6), [txs]);
  const byCategory = useMemo(() => expensesByCategory(txs, month), [txs, month]);

  const monthTxs = useMemo(
    () =>
      txs
        .filter((t) => t.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [txs, month],
  );

  function shiftMonth(delta: number) {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + delta);
    setMonth(format(d, "yyyy-MM"));
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setModalOpen(true);
  }

  async function remove(tx: Transaction) {
    if (confirm("Diese Buchung wirklich löschen?")) await transactions.remove(tx.id);
  }

  return (
    <div>
      <PageHeader
        title="Finanzen"
        subtitle="Einnahmen, Ausgaben und deine Monatsübersicht."
        actions={
          <Button onClick={openNew}>
            <Plus size={18} /> Buchung
          </Button>
        }
      />

      {/* Monatsnavigation */}
      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Vorheriger Monat">
          <ChevronLeft size={18} />
        </Button>
        <span className="min-w-[10rem] text-center font-medium">{monthLabel(month)}</span>
        <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Nächster Monat">
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Kennzahlen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Einnahmen"
          value={formatCurrency(summary.income)}
          icon={<ArrowUpRight size={18} />}
          tone="positive"
        />
        <StatTile
          label="Ausgaben"
          value={formatCurrency(summary.expense)}
          icon={<ArrowDownLeft size={18} />}
          tone="negative"
        />
        <StatTile
          label="Saldo"
          value={formatCurrency(summary.balance)}
          icon={<Wallet size={18} />}
          tone={summary.balance >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Diagramme */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Verlauf" subtitle="Letzte 6 Monate" />
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} barGap={4}>
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number, n) => [formatCurrency(v), n === "income" ? "Einnahmen" : "Ausgaben"]}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Ausgaben nach Kategorie" subtitle={monthLabel(month)} />
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Noch keine Ausgaben in diesem Monat.
              </p>
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
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatCurrency(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                  {byCategory.slice(0, 6).map((c, i) => (
                    <li key={c.name} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(c.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buchungsliste */}
      <Card className="mt-4">
        <CardHeader title="Buchungen" subtitle={`${monthTxs.length} im ${monthLabel(month)}`} />
        <CardContent>
          {monthTxs.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} />}
              title="Noch keine Buchungen"
              description="Erfasse deine erste Einnahme oder Ausgabe für diesen Monat."
              action={
                <Button onClick={openNew}>
                  <Plus size={18} /> Buchung hinzufügen
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {monthTxs.map((tx) => (
                <li key={tx.id} className="group flex items-center gap-3 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      tx.type === "income"
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {tx.type === "income" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{tx.category}</p>
                      <Badge className="text-muted-foreground">{formatDate(tx.date, "d. MMM")}</Badge>
                    </div>
                    {tx.note && <p className="truncate text-sm text-muted-foreground">{tx.note}</p>}
                  </div>
                  <p
                    className={`shrink-0 font-semibold tabular-nums ${
                      tx.type === "income" ? "text-success" : "text-foreground"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {formatCurrency(tx.amount)}
                  </p>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tx)} aria-label="Bearbeiten">
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(tx)} aria-label="Löschen">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
