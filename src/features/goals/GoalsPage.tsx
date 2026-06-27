import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Pencil, Plus, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { goals, keyResults } from "@/data/repo";
import { colorHex, type Goal, type KeyResult } from "@/data/types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalModal } from "./GoalModal";
import { currentYear, goalProgress, krProgress, periodLabel } from "./goals.utils";

export function GoalsPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const allGoals = useLiveQuery(() => (accId ? goals.list(accId) : []), [accId]) ?? [];
  const allKrs = useLiveQuery(() => (accId ? keyResults.list(accId) : []), [accId]) ?? [];

  const [year, setYear] = useState(currentYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const krsByGoal = useMemo(() => {
    const map = new Map<string, KeyResult[]>();
    for (const k of allKrs) {
      const arr = map.get(k.goalId) ?? [];
      arr.push(k);
      map.set(k.goalId, arr);
    }
    return map;
  }, [allKrs]);

  const yearGoals = allGoals.filter((g) => g.timeframe === "year");
  const yearGoalsThis = yearGoals.filter((g) => g.period === year);
  const quarterGoalsThis = allGoals
    .filter((g) => g.timeframe === "quarter" && g.period.startsWith(year))
    .sort((a, b) => a.period.localeCompare(b.period));

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(g: Goal) {
    setEditing(g);
    setModalOpen(true);
  }

  const empty = yearGoalsThis.length === 0 && quarterGoalsThis.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ziele"
        subtitle="Jahresvision → Quartalsziele → messbare Schlüsselergebnisse."
        actions={
          <Button onClick={openNew}>
            <Plus size={18} /> Ziel
          </Button>
        }
      />

      {/* Jahres-Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setYear((y) => String(Number(y) - 1))} aria-label="Vorheriges Jahr">
          <ChevronLeft size={18} />
        </Button>
        <span className="min-w-[5rem] text-center text-lg font-semibold tracking-tight">{year}</span>
        <Button variant="outline" size="icon" onClick={() => setYear((y) => String(Number(y) + 1))} aria-label="Nächstes Jahr">
          <ChevronRight size={18} />
        </Button>
      </div>

      {empty ? (
        <EmptyState
          icon={<Target size={22} />}
          title={`Noch keine Ziele für ${year}`}
          description="Starte mit einer Jahresvision und brich sie in Quartalsziele mit messbaren Schlüsselergebnissen herunter."
          action={
            <Button onClick={openNew}>
              <Plus size={18} /> Erstes Ziel
            </Button>
          }
        />
      ) : (
        <>
          {yearGoalsThis.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Jahresvision {year}</h3>
              {yearGoalsThis.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  krs={krsByGoal.get(g.id) ?? []}
                  childGoals={quarterGoalsThis.filter((c) => c.parentId === g.id)}
                  childKrs={krsByGoal}
                  onEdit={() => openEdit(g)}
                />
              ))}
            </section>
          )}

          {quarterGoalsThis.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Quartalsziele {year}</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {quarterGoalsThis.map((g) => (
                  <GoalCard key={g.id} goal={g} krs={krsByGoal.get(g.id) ?? []} onEdit={() => openEdit(g)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {accId && (
        <GoalModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          accountId={accId}
          editing={editing}
          yearGoals={yearGoals}
          defaultYear={year}
        />
      )}
    </div>
  );
}

function GoalCard({
  goal: g,
  krs,
  childGoals,
  childKrs,
  onEdit,
}: {
  goal: Goal;
  krs: KeyResult[];
  childGoals?: Goal[];
  childKrs?: Map<string, KeyResult[]>;
  onEdit: () => void;
}) {
  const progress = goalProgress(krs);
  return (
    <Card className="p-5" style={{ borderTop: `3px solid ${colorHex(g.color)}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold tracking-tight">{g.title}</h4>
            <Badge className="text-muted-foreground">{periodLabel(g.period)}</Badge>
          </div>
          {g.why && <p className="mt-1 text-sm text-muted-foreground">{g.why}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tabular-nums" style={{ color: colorHex(g.color) }}>{progress}%</span>
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Bearbeiten">
            <Pencil size={16} />
          </Button>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: colorHex(g.color) }} />
      </div>

      {/* Key Results mit Inline-Aktualisierung */}
      {krs.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {krs.map((k) => (
            <li key={k.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{k.title}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Input
                    key={k.currentValue}
                    inputMode="decimal"
                    defaultValue={String(k.currentValue)}
                    onBlur={(e) => keyResults.update(k.id, { currentValue: Number(e.target.value.replace(",", ".")) || 0 })}
                    className="h-7 w-20 text-right"
                  />
                  / {k.targetValue} {k.unit}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${krProgress(k)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Verknüpfte Quartalsziele (nur Jahresziel) */}
      {childGoals && childGoals.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Quartalsziele</p>
          <div className="flex flex-wrap gap-2">
            {childGoals.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs">
                <span className="font-medium">{periodLabel(c.period).split(" ")[0]}</span>
                <span className="truncate max-w-[10rem]">{c.title}</span>
                <span className="text-muted-foreground">{goalProgress(childKrs?.get(c.id) ?? [])}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
