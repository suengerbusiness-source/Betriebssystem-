import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Lightbulb, Plus, Trash2 } from "lucide-react";
import { businessIdeas as ideasRepo } from "@/data/repo";
import { IDEA_KINDS, IDEA_STATUS, type IdeaKind, type IdeaStatus } from "@/data/types";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ideaScore } from "./company.utils";

const RATINGS = [1, 2, 3, 4, 5];

export function IdeasTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const all = useLiveQuery(() => ideasRepo.list(accountId), [accountId]) ?? [];
  const list = all
    .filter((i) => i.companyId === companyId)
    .sort(
      (a, b) =>
        Number(a.status === "done" || a.status === "dropped") - Number(b.status === "done" || b.status === "dropped") ||
        ideaScore(b) - ideaScore(a),
    );

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<IdeaKind>("content");
  const [impact, setImpact] = useState(3);
  const [effort, setEffort] = useState(3);

  async function add() {
    if (!title.trim()) return;
    await ideasRepo.create({ accountId, companyId, title: title.trim(), kind, impact, effort, status: "new" });
    setTitle("");
    setImpact(3);
    setEffort(3);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Idee festhalten" subtitle="Content, Produkte, neue Kanäle, Expansion (Shop, Affiliate), Kooperationen." icon={<Lightbulb size={18} />} />
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="id-title">Idee</Label>
              <Input id="id-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Eigenen Merch-Shop starten" className="h-9" onKeyDown={(e) => e.key === "Enter" && add()} />
            </div>
            <div>
              <Label htmlFor="id-kind">Art</Label>
              <Select id="id-kind" value={kind} onChange={(e) => setKind(e.target.value as IdeaKind)} className="h-9">
                {IDEA_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </Select>
            </div>
            <RatingPicker label="Wirkung" value={impact} onChange={setImpact} />
            <RatingPicker label="Aufwand" value={effort} onChange={setEffort} />
            <Button onClick={add} className="h-9"><Plus size={16} /> Idee</Button>
          </div>
          <p className="text-xs text-muted-foreground">Sortiert nach Priorität: viel Wirkung bei wenig Aufwand zuerst.</p>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon={<Lightbulb size={22} />} title="Noch keine Ideen" description="Sammle hier alles, was dein Business voranbringt – und priorisiere es." />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <ul className="divide-y divide-border">
              {list.map((i) => {
                const done = i.status === "done" || i.status === "dropped";
                return (
                  <li key={i.id} className="group flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                      <Lightbulb size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>{i.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <Badge className="text-muted-foreground">{IDEA_KINDS.find((k) => k.value === i.kind)?.label}</Badge>
                        <span className="text-muted-foreground">Wirkung {i.impact ?? "–"} · Aufwand {i.effort ?? "–"}</span>
                      </div>
                    </div>
                    <Select
                      value={i.status}
                      onChange={(e) => ideasRepo.update(i.id, { status: e.target.value as IdeaStatus })}
                      className="h-8 w-auto shrink-0 text-xs"
                    >
                      {IDEA_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                    <button onClick={() => ideasRepo.remove(i.id)} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Löschen">
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RatingPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex h-9 items-center gap-0.5 rounded-md bg-secondary p-0.5">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={cn(
              "h-8 w-7 rounded text-xs font-semibold transition-colors",
              value === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
