import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Target, Trash2 } from "lucide-react";
import { goals, keyResults } from "@/data/repo";
import {
  EVENT_COLORS,
  type ColorToken,
  type Goal,
  type GoalTimeframe,
} from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { krProgress } from "./goals.utils";

export function GoalModal({
  open,
  onClose,
  accountId,
  editing,
  yearGoals,
  defaultYear,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  editing?: Goal | null;
  yearGoals: Goal[];
  defaultYear: string;
}) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>("year");
  const [year, setYear] = useState(defaultYear);
  const [quarter, setQuarter] = useState("1");
  const [parentId, setParentId] = useState("");
  const [color, setColor] = useState<ColorToken>("violet");
  const [error, setError] = useState<string | null>(null);

  // Neues Key Result
  const [krTitle, setKrTitle] = useState("");
  const [krStart, setKrStart] = useState("0");
  const [krTarget, setKrTarget] = useState("100");
  const [krUnit, setKrUnit] = useState("");

  const krs = useLiveQuery(
    () => (editing ? keyResults.list(accountId).then((all) => all.filter((k) => k.goalId === editing.id)) : []),
    [editing?.id, accountId],
  ) ?? [];

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setTitle(editing.title);
      setWhy(editing.why ?? "");
      setTimeframe(editing.timeframe);
      const y = editing.period.slice(0, 4);
      setYear(y);
      const m = editing.period.match(/Q([1-4])/);
      setQuarter(m ? m[1] : "1");
      setParentId(editing.parentId ?? "");
      setColor(editing.color);
    } else {
      setTitle("");
      setWhy("");
      setTimeframe("year");
      setYear(defaultYear);
      setQuarter("1");
      setParentId("");
      setColor("violet");
    }
  }, [open, editing, defaultYear]);

  const parentOptions = useMemo(
    () => yearGoals.filter((g) => g.period === year && g.id !== editing?.id),
    [yearGoals, year, editing?.id],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const period = timeframe === "year" ? year : `${year}-Q${quarter}`;
    const payload = {
      title: title.trim(),
      why: why.trim() || undefined,
      timeframe,
      period,
      parentId: timeframe === "quarter" && parentId ? parentId : undefined,
      color,
      status: editing?.status ?? ("active" as const),
    };
    if (editing) await goals.update(editing.id, payload);
    else await goals.create({ accountId, ...payload });
    onClose();
  }

  async function addKr() {
    if (!editing || !krTitle.trim()) return;
    await keyResults.create({
      accountId,
      goalId: editing.id,
      title: krTitle.trim(),
      startValue: Number(krStart.replace(",", ".")) || 0,
      currentValue: Number(krStart.replace(",", ".")) || 0,
      targetValue: Number(krTarget.replace(",", ".")) || 0,
      unit: krUnit.trim() || undefined,
    });
    setKrTitle("");
    setKrStart("0");
    setKrTarget("100");
    setKrUnit("");
  }

  async function removeGoal() {
    if (editing && confirm("Ziel inkl. Schlüsselergebnissen löschen?")) {
      await goals.remove(editing.id);
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Ziel bearbeiten" : "Neues Ziel"} className="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="g-title">Ziel (Objective)</Label>
          <Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="z. B. Umsatz verdoppeln" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Zeitraum</Label>
            <div className="inline-flex w-full rounded-md bg-secondary p-1">
              {(["year", "quarter"] as GoalTimeframe[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={cn("flex-1 rounded px-2.5 py-1.5 text-sm font-medium transition-colors", timeframe === t ? "bg-card shadow-soft" : "text-muted-foreground")}
                >
                  {t === "year" ? "Jahr" : "Quartal"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="g-year">Jahr</Label>
              <Input id="g-year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} className="h-10" />
            </div>
            {timeframe === "quarter" && (
              <div>
                <Label htmlFor="g-q">Quartal</Label>
                <Select id="g-q" value={quarter} onChange={(e) => setQuarter(e.target.value)} className="h-10">
                  {["1", "2", "3", "4"].map((q) => (
                    <option key={q} value={q}>Q{q}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>

        {timeframe === "quarter" && parentOptions.length > 0 && (
          <div>
            <Label htmlFor="g-parent">Gehört zu Jahresziel (optional)</Label>
            <Select id="g-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— keins —</option>
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="g-why">Warum? (Motivation, optional)</Label>
          <Textarea id="g-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Warum ist dir dieses Ziel wichtig?" />
        </div>

        <div>
          <Label>Farbe</Label>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.token}
                type="button"
                onClick={() => setColor(c.token)}
                aria-label={c.label}
                className={cn("h-7 w-7 rounded-full transition-all", color === c.token ? "ring-2 ring-ring ring-offset-2 ring-offset-card scale-110" : "")}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Key Results (nur beim Bearbeiten) */}
        {editing && (
          <div className="rounded-md border border-border p-3">
            <Label className="mb-2 flex items-center gap-1.5">
              <Target size={15} /> Schlüsselergebnisse (Key Results)
            </Label>
            <ul className="mb-3 space-y-2">
              {krs.map((k) => (
                <li key={k.id} className="group rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{k.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{krProgress(k)}%</span>
                    <button type="button" onClick={() => keyResults.remove(k.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Key Result löschen">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Aktuell</span>
                    <Input
                      key={k.currentValue}
                      inputMode="decimal"
                      defaultValue={String(k.currentValue)}
                      onBlur={(e) => keyResults.update(k.id, { currentValue: Number(e.target.value.replace(",", ".")) || 0 })}
                      className="h-7 w-24"
                    />
                    <span>/ {k.targetValue} {k.unit}</span>
                  </div>
                </li>
              ))}
              {krs.length === 0 && <li className="text-sm text-muted-foreground">Noch keine Key Results.</li>}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <Input value={krTitle} onChange={(e) => setKrTitle(e.target.value)} placeholder="Ergebnis, z. B. Neukunden" className="col-span-2 h-9" />
              <Input value={krStart} onChange={(e) => setKrStart(e.target.value)} placeholder="Start" className="h-9" inputMode="decimal" />
              <Input value={krTarget} onChange={(e) => setKrTarget(e.target.value)} placeholder="Ziel" className="h-9" inputMode="decimal" />
              <Input value={krUnit} onChange={(e) => setKrUnit(e.target.value)} placeholder="Einheit (€, Stk.)" className="h-9" />
              <Button type="button" variant="secondary" onClick={addKr} className="h-9">
                <Plus size={16} /> Key Result
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          {editing ? (
            <Button type="button" variant="ghost" onClick={removeGoal} className="text-destructive">
              <Trash2 size={16} /> Löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
            <Button type="submit">{editing ? "Speichern" : "Anlegen"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
