import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Pencil,
  Printer,
  Send,
  Trash2,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { clients, invoices, transactions } from "@/data/repo";
import type { Invoice } from "@/data/types";
import { formatCurrency, formatDate, todayISODate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InvoiceModal } from "./InvoiceModal";
import { ClientsModal } from "./ClientsModal";
import { InvoicePrint } from "./InvoicePrint";
import { STATUS_LABEL, invoiceGross, isOverdue, suggestNumber } from "./invoice.utils";

export function InvoicesPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const list = useLiveQuery(() => (accId ? invoices.list(accId) : []), [accId]) ?? [];
  const clientList = useLiveQuery(() => (accId ? clients.list(accId) : []), [accId]) ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [printing, setPrinting] = useState<Invoice | null>(null);
  const today = todayISODate();
  const year = today.slice(0, 4);

  const stats = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let paid = 0;
    for (const inv of list) {
      const g = invoiceGross(inv);
      if (inv.status === "sent") {
        open += g;
        if (isOverdue(inv, today)) overdue += g;
      }
      if (inv.status === "paid" && inv.date.startsWith(year)) paid += g;
    }
    return { open, overdue, paid };
  }, [list, today, year]);

  const sorted = useMemo(
    () => list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)),
    [list],
  );

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(inv: Invoice) {
    setEditing(inv);
    setModalOpen(true);
  }

  async function markSent(inv: Invoice) {
    await invoices.update(inv.id, { status: "sent" });
  }

  async function markPaid(inv: Invoice) {
    if (!accId) return;
    // Verknüpfte Einnahme-Buchung anlegen (Business) – schließt den Kreis.
    const tx = await transactions.create({
      accountId: accId,
      type: "income",
      mode: "business",
      amount: invoiceGross(inv),
      currency: "EUR",
      category: "Rechnung",
      note: `Rechnung ${inv.number} – ${inv.clientName}`,
      date: today,
      reviewed: false,
    });
    await invoices.update(inv.id, { status: "paid", paidTransactionId: tx.id });
  }

  async function revertPaid(inv: Invoice) {
    if (inv.paidTransactionId) await transactions.remove(inv.paidTransactionId);
    await invoices.update(inv.id, { status: "sent", paidTransactionId: undefined });
  }

  async function remove(inv: Invoice) {
    if (!confirm(`Rechnung ${inv.number} löschen?`)) return;
    if (inv.paidTransactionId) await transactions.remove(inv.paidTransactionId);
    await invoices.remove(inv.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rechnungen"
        subtitle="Angebote stellen, Kunden verwalten, USt ausweisen, als PDF drucken."
        actions={
          <>
            <Button variant="outline" onClick={() => setClientsOpen(true)}>
              <Users size={18} /> <span className="hidden sm:inline">Kunden</span>
            </Button>
            <Button onClick={openNew}>
              <FileText size={18} /> Rechnung
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Offen (versendet)" value={formatCurrency(stats.open)} icon={<Send size={18} />} />
        <StatTile label="Überfällig" value={formatCurrency(stats.overdue)} icon={<AlertTriangle size={18} />} tone={stats.overdue > 0 ? "negative" : "default"} />
        <StatTile label={`Bezahlt ${year}`} value={formatCurrency(stats.paid)} icon={<Wallet size={18} />} tone="positive" />
      </div>

      <Card>
        <CardHeader title="Alle Rechnungen" subtitle={`${list.length} gesamt`} />
        <CardContent>
          {list.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="Noch keine Rechnungen"
              description="Erstelle deine erste Rechnung – mit Positionen, USt und als PDF zum Versenden."
              action={
                <Button onClick={openNew}>
                  <FileText size={18} /> Erste Rechnung
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {sorted.map((inv) => {
                const overdue = isOverdue(inv, today);
                return (
                  <li key={inv.id} className="group flex flex-wrap items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{inv.number}</p>
                        <StatusBadge inv={inv} overdue={overdue} />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {inv.clientName} · {formatDate(inv.date, "d. MMM yyyy")}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">{formatCurrency(invoiceGross(inv))}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      {inv.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => markSent(inv)}>
                          <Send size={14} /> Versenden
                        </Button>
                      )}
                      {inv.status === "sent" && (
                        <Button size="sm" onClick={() => markPaid(inv)}>
                          <CheckCircle2 size={14} /> Bezahlt
                        </Button>
                      )}
                      {inv.status === "paid" && (
                        <Button size="sm" variant="ghost" onClick={() => revertPaid(inv)} aria-label="Zahlung zurücknehmen">
                          <Undo2 size={14} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setPrinting(inv)} aria-label="Drucken">
                        <Printer size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(inv)} aria-label="Bearbeiten">
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(inv)} aria-label="Löschen">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {accId && (
        <>
          <InvoiceModal open={modalOpen} onClose={() => setModalOpen(false)} accountId={accId} editing={editing} defaultNumber={suggestNumber(list)} />
          <ClientsModal open={clientsOpen} onClose={() => setClientsOpen(false)} accountId={accId} />
        </>
      )}
      {printing && (
        <InvoicePrint
          invoice={printing}
          account={account}
          client={clientList.find((c) => c.id === printing.clientId)}
          onClose={() => setPrinting(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ inv, overdue }: { inv: Invoice; overdue: boolean }) {
  if (overdue) return <Badge className="border-destructive/40 text-destructive">Überfällig</Badge>;
  const tone =
    inv.status === "paid" ? "border-success/40 text-success" : inv.status === "sent" ? "border-primary/40 text-primary" : "text-muted-foreground";
  return <Badge className={cn(tone)}>{STATUS_LABEL[inv.status]}</Badge>;
}
