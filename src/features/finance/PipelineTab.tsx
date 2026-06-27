import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Handshake, Plus } from "lucide-react";
import { deals } from "@/data/repo";
import { DEAL_STAGES, type Deal, type DealStage } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { DealModal } from "./DealModal";

const OPEN_STAGES: DealStage[] = ["idea", "talking", "committed"];

/*
  Pipeline / Mini-CRM für Kooperationen und Deals.
  Kanban über die Phasen Idee → Gespräch → Zugesagt → Abgeschlossen / Abgesagt.
*/
export function PipelineTab({ accountId }: { accountId: string }) {
  const list = useLiveQuery(() => deals.list(accountId), [accountId]) ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [dragOver, setDragOver] = useState<DealStage | null>(null);

  const stats = useMemo(() => {
    let open = 0;
    let committed = 0;
    let closed = 0;
    for (const d of list) {
      if (OPEN_STAGES.includes(d.stage)) open += d.value;
      if (d.stage === "committed") committed += d.value;
      if (d.stage === "closed") closed += d.value;
    }
    return { open, committed, closed };
  }, [list]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(d: Deal) {
    setEditing(d);
    setModalOpen(true);
  }
  async function moveTo(id: string, stage: DealStage) {
    setDragOver(null);
    await deals.update(id, { stage });
  }

  const byStage = (s: DealStage) =>
    list.filter((d) => d.stage === s).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Offene Pipeline" value={formatCurrency(stats.open)} icon={<Handshake size={18} />} />
        <StatTile label="Zugesagt" value={formatCurrency(stats.committed)} tone="positive" />
        <StatTile label="Abgeschlossen" value={formatCurrency(stats.closed)} tone="positive" />
      </div>

      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus size={18} /> Deal
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Handshake size={22} />}
          title="Noch keine Deals"
          description="Erfasse Kooperationen und zukünftige Deals und ziehe sie durch die Phasen."
          action={
            <Button onClick={openNew}>
              <Plus size={18} /> Ersten Deal anlegen
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {DEAL_STAGES.map((col) => {
            const items = byStage(col.value);
            const colTotal = items.reduce((s, d) => s + d.value, 0);
            return (
              <div
                key={col.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.value);
                }}
                onDragLeave={() => setDragOver((d) => (d === col.value ? null : d))}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) void moveTo(id, col.value);
                }}
                className={cn(
                  "rounded-lg border border-border bg-card/40 p-2 transition-colors",
                  dragOver === col.value && "border-primary bg-primary/5",
                )}
              >
                <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                  <span className="text-sm font-medium">{col.label}</span>
                  <Badge className="text-muted-foreground">{items.length}</Badge>
                </div>
                {colTotal > 0 && (
                  <p className="mb-2 px-1.5 text-xs text-muted-foreground">{formatCurrency(colTotal)}</p>
                )}
                <div className="space-y-2">
                  {items.map((d) => (
                    <Card
                      key={d.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}
                      onClick={() => openEdit(d)}
                      className="cursor-pointer p-3 transition-shadow hover:shadow-md active:cursor-grabbing"
                    >
                      <p className="font-medium leading-tight">{d.title}</p>
                      {d.value > 0 && (
                        <p className="mt-1 text-sm font-semibold tabular-nums text-primary">
                          {formatCurrency(d.value)}
                        </p>
                      )}
                      {d.contact && <p className="mt-1 text-xs text-muted-foreground">{d.contact}</p>}
                      {d.nextStep && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRight size={12} /> {d.nextStep}
                        </p>
                      )}
                    </Card>
                  ))}
                  {items.length === 0 && <p className="px-1.5 py-2 text-xs text-muted-foreground">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DealModal open={modalOpen} onClose={() => setModalOpen(false)} accountId={accountId} editing={editing} />
    </div>
  );
}
