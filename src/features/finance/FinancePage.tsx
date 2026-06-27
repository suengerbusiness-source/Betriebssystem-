import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { transactions } from "@/data/repo";
import type { Transaction } from "@/data/types";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { TransactionModal } from "./TransactionModal";
import { OverviewTab } from "./OverviewTab";
import { BudgetsTab } from "./BudgetsTab";
import { RecurringTab } from "./RecurringTab";
import { currentMonthKey, monthLabel } from "./finance.utils";

type Tab = "overview" | "budgets" | "recurring";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Übersicht" },
  { value: "budgets", label: "Budgets" },
  { value: "recurring", label: "Wiederkehrend" },
];

export function FinancePage() {
  const { account } = useAuth();
  const accId = account?.id;
  const txs = useLiveQuery(() => (accId ? transactions.list(accId) : []), [accId]) ?? [];

  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonthKey());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

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

  return (
    <div>
      <PageHeader
        title="Finanzen"
        subtitle="Einnahmen, Ausgaben, Budgets und wiederkehrende Buchungen."
        actions={
          <Button onClick={openNew}>
            <Plus size={18} /> Buchung
          </Button>
        }
      />

      {/* Tab-Leiste */}
      <div className="mb-4 inline-flex rounded-md bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Monatsnavigation (für alle Tabs relevant) */}
      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Vorheriger Monat">
          <ChevronLeft size={18} />
        </Button>
        <span className="min-w-[10rem] text-center font-medium">{monthLabel(month)}</span>
        <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Nächster Monat">
          <ChevronRight size={18} />
        </Button>
      </div>

      {tab === "overview" && <OverviewTab txs={txs} month={month} onNew={openNew} onEdit={openEdit} />}
      {tab === "budgets" && accId && <BudgetsTab accountId={accId} txs={txs} month={month} />}
      {tab === "recurring" && accId && <RecurringTab accountId={accId} txs={txs} month={month} />}

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
