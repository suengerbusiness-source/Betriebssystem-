import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ListChecks,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMode, txMatchesMode } from "@/context/ModeContext";
import { monthlyReviews, transactions } from "@/data/repo";
import type { MonthlyReview } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { ModeSwitch } from "@/components/ModeSwitch";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Input";
import {
  currentMonthKey,
  monthLabel,
  monthlySeries,
  summarizeMonth,
} from "@/features/finance/finance.utils";
import { ReviewRow } from "./ReviewRow";
import { ImportModal } from "./ImportModal";
import { averagesOver, categoryAverages, deltaPercent, monthsBefore } from "./analysis.utils";

const LOOKBACK = 6;

export function AnalysisPage() {
  const { account } = useAuth();
  const { mode, defaultMode } = useMode();
  const accId = account?.id;
  const [importOpen, setImportOpen] = useState(false);

  const allTxs = useLiveQuery(() => (accId ? transactions.list(accId) : []), [accId]) ?? [];
  const reviews = useLiveQuery(() => (accId ? monthlyReviews.list(accId) : []), [accId]) ?? [];

  const [month, setMonth] = useState(currentMonthKey());

  // Buchungen nach Modus filtern (wie in den Finanzen).
  const txs = useMemo(() => allTxs.filter((t) => txMatchesMode(t, mode)), [allTxs, mode]);

  const monthTxs = useMemo(
    () =>
      txs
        .filter((t) => t.date.startsWith(month))
        .sort((a, b) => Number(a.reviewed ?? false) - Number(b.reviewed ?? false) || b.date.localeCompare(a.date)),
    [txs, month],
  );

  const summary = summarizeMonth(txs, month);
  const lookbackKeys = useMemo(() => monthsBefore(month, LOOKBACK), [month]);
  const avg = useMemo(() => averagesOver(txs, lookbackKeys), [txs, lookbackKeys]);
  const series = useMemo(() => monthlySeries(txs, 6), [txs]);
  const catAvgs = useMemo(() => categoryAverages(txs, lookbackKeys), [txs, lookbackKeys]);

  const reviewedCount = monthTxs.filter((t) => t.reviewed).length;
  const reviewProgress = monthTxs.length ? Math.round((reviewedCount / monthTxs.length) * 100) : 0;

  // Aktuelle Ausgaben je Kategorie (für Vergleich mit Schnitt).
  const currentByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense" || !t.date.startsWith(month)) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return map;
  }, [txs, month]);

  function shiftMonth(delta: number) {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + delta);
    setMonth(format(d, "yyyy-MM"));
  }

  // Protokoll für (Monat, Modus) finden oder anlegen.
  const review = reviews.find((r) => r.month === month && (r.mode ?? "both") === mode);

  async function saveNote(note: string) {
    if (accId) await monthlyReviews.upsert(accId, month, mode, { note });
  }
  async function toggleDone() {
    if (accId) await monthlyReviews.upsert(accId, month, mode, { status: review?.status === "done" ? "open" : "done" });
  }
  async function checkAll() {
    await Promise.all(monthTxs.filter((t) => !t.reviewed).map((t) => transactions.update(t.id, { reviewed: true })));
  }

  const done = review?.status === "done";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyse"
        subtitle="Monatsabschluss: prüfen, beschriften, protokollieren – mit Trends & Durchschnitten."
        actions={
          <>
            <ModeSwitch />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload size={18} /> <span className="hidden sm:inline">Kontoauszug</span>
            </Button>
          </>
        }
      />

      {accId && (
        <ImportModal open={importOpen} onClose={() => setImportOpen(false)} accountId={accId} defaultMode={defaultMode} />
      )}

      {/* Monat + Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Vorheriger Monat">
            <ChevronLeft size={18} />
          </Button>
          <span className="min-w-[10rem] text-center font-medium">{monthLabel(month)}</span>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Nächster Monat">
            <ChevronRight size={18} />
          </Button>
        </div>
        {done && (
          <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">
            <CheckCircle2 size={16} /> Monat abgeschlossen
          </span>
        )}
      </div>

      {/* Kennzahlen mit Vergleich zum Schnitt */}
      <div className="grid gap-4 sm:grid-cols-3">
        <CompareTile label="Einnahmen" value={summary.income} avg={avg.income} icon={<TrendingUp size={18} />} goodWhenHigher />
        <CompareTile label="Ausgaben" value={summary.expense} avg={avg.expense} icon={<TrendingDown size={18} />} goodWhenHigher={false} />
        <CompareTile label="Saldo" value={summary.balance} avg={avg.saldo} icon={<Wallet size={18} />} goodWhenHigher />
      </div>
      {avg.activeMonths > 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Durchschnitt der letzten {avg.activeMonths} aktiven {avg.activeMonths === 1 ? "Monat" : "Monate"}: Einnahmen{" "}
          {formatCurrency(avg.income)} · Ausgaben {formatCurrency(avg.expense)} · Saldo {formatCurrency(avg.saldo)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Verlauf */}
        <Card className="lg:col-span-3">
          <CardHeader title="Verlauf" subtitle="Letzte 6 Monate" />
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} barGap={4}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, n) => [formatCurrency(v), n === "income" ? "Einnahmen" : "Ausgaben"]}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Kategorien: aktuell vs. Schnitt */}
        <Card className="lg:col-span-2">
          <CardHeader title="Kategorien" subtitle="Aktueller Monat vs. Schnitt" />
          <CardContent>
            {catAvgs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Noch keine Vergleichsdaten.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {catAvgs.slice(0, 7).map((c) => {
                  const cur = currentByCat.get(c.category) ?? 0;
                  const d = deltaPercent(cur, c.avg);
                  return (
                    <li key={c.category} className="flex items-center justify-between gap-2">
                      <span className="truncate">{c.category}</span>
                      <span className="flex items-center gap-2 tabular-nums">
                        <span className="text-muted-foreground">{formatCurrency(cur)}</span>
                        {d !== null && (
                          <span className={cn("text-xs", d > 0 ? "text-destructive" : "text-success")}>
                            {d > 0 ? "+" : ""}
                            {d}%
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buchungen prüfen */}
      <Card>
        <CardHeader
          title="Buchungen prüfen"
          subtitle={`${reviewedCount}/${monthTxs.length} eingehakt · ${reviewProgress}%`}
          icon={<ListChecks size={18} />}
          action={
            monthTxs.length > 0 && reviewedCount < monthTxs.length ? (
              <Button size="sm" variant="outline" onClick={checkAll}>
                Alle einhaken
              </Button>
            ) : undefined
          }
        />
        <CardContent>
          {monthTxs.length > 0 && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${reviewProgress}%` }} />
            </div>
          )}
          {monthTxs.length === 0 ? (
            <EmptyState icon={<ListChecks size={22} />} title="Keine Buchungen in diesem Monat" description="Erfasse Buchungen oder importiere einen Kontoauszug." />
          ) : (
            <ul className="divide-y divide-border">
              {monthTxs.map((tx) => (
                <ReviewRow key={tx.id} tx={tx} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Protokoll */}
      <Card>
        <CardHeader title="Protokoll" subtitle="Deine Notizen & Erkenntnisse zum Monat" icon={<ClipboardCheck size={18} />} />
        <CardContent className="space-y-3">
          {/* Key inkl. review-id: re-initialisiert, sobald das Protokoll
              asynchron geladen ist (sonst bliebe das Feld leer). */}
          <ProtocolNote key={(review?.id ?? "new") + month + mode} review={review} onSave={saveNote} />
          <div className="flex justify-end">
            <Button variant={done ? "outline" : "primary"} onClick={toggleDone}>
              {done ? "Abschluss aufheben" : "Monat abschließen"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompareTile({
  label,
  value,
  avg,
  icon,
  goodWhenHigher,
}: {
  label: string;
  value: number;
  avg: number;
  icon: React.ReactNode;
  goodWhenHigher: boolean;
}) {
  const d = deltaPercent(value, avg);
  const good = d === null ? undefined : goodWhenHigher ? d >= 0 : d <= 0;
  return (
    <StatTile
      label={label}
      value={formatCurrency(value)}
      icon={icon}
      hint={
        d === null ? (
          "kein Vergleich"
        ) : (
          <span className={cn(good ? "text-success" : "text-destructive")}>
            {d > 0 ? "+" : ""}
            {d}% ggü. Schnitt
          </span>
        )
      }
    />
  );
}

function ProtocolNote({ review, onSave }: { review?: MonthlyReview; onSave: (note: string) => void }) {
  const [note, setNote] = useState(review?.note ?? "");
  return (
    <Textarea
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={() => onSave(note)}
      placeholder="Was ist diesen Monat passiert? Auffälligkeiten, Lernpunkte, nächste Schritte…"
      className="min-h-[120px]"
    />
  );
}
