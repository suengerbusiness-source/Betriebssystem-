import { useMemo, useState } from "react";
import { Check, Minus, Plus, Save } from "lucide-react";
import type { CheckIn } from "@/data/types";
import { checkins as checkinsRepo } from "@/data/repo";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Label, Textarea } from "@/components/ui/Input";
import {
  CHECKIN_METRICS,
  METRIC_GROUPS,
  formatMetricValue,
  type MetricDescriptor,
} from "./checkin.metrics";
import { wellbeingScore } from "./checkin.utils";

const SPORT_PRESETS = [0, 20, 30, 45, 60, 90];

/**
 * Geführter Abend-Check-in: schnelle 1-Tipp-Skalen, Schlaf/Sport-Regler und
 * drei Reflexionsfelder. Prefill aus dem letzten Eintrag, Ø-Hinweise und ein
 * Live-Score machen die Eingabe „mitdenkend" statt zu einem starren Formular.
 */
export function CheckInForm({
  accountId,
  date,
  existing,
  lastMetrics,
  avgMetrics,
}: {
  accountId: string;
  date: string;
  existing: CheckIn | null;
  /** Werte des jüngsten vorherigen Check-ins (Prefill-Vorschlag). */
  lastMetrics: Record<string, number>;
  /** Durchschnitte der letzten Tage (Ø-Hinweis). */
  avgMetrics: Record<string, number>;
}) {
  const initialMetrics = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of CHECKIN_METRICS) {
      m[d.id] = existing?.metrics?.[d.id] ?? lastMetrics[d.id] ?? d.default;
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [metrics, setMetrics] = useState<Record<string, number>>(initialMetrics);
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [wentBad, setWentBad] = useState(existing?.wentBad ?? "");
  const [learned, setLearned] = useState(existing?.learned ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const score = wellbeingScore(metrics);

  function setMetric(id: string, value: number) {
    setMetrics((m) => ({ ...m, [id]: value }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await checkinsRepo.upsert(accountId, date, {
      metrics,
      wentWell: wentWell.trim() || undefined,
      wentBad: wentBad.trim() || undefined,
      learned: learned.trim() || undefined,
      note: note.trim() || undefined,
      tags: tagList.length ? tagList : undefined,
    });
    setBusy(false);
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader
        title="Abend-Check-in"
        subtitle={existing ? "Heute schon erfasst – du kannst es anpassen." : "Einmal eintragen, der Rest erledigt sich."}
        action={
          score !== null ? (
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums leading-none">{score}</p>
              <p className="text-[11px] text-muted-foreground">Tages-Score</p>
            </div>
          ) : undefined
        }
      />
      <CardContent className="space-y-6">
        {METRIC_GROUPS.map((group) => (
          <div key={group} className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group}</p>
            {CHECKIN_METRICS.filter((m) => m.group === group).map((m) => (
              <MetricRow
                key={m.id}
                metric={m}
                value={metrics[m.id]}
                avg={avgMetrics[m.id]}
                onChange={(v) => setMetric(m.id, v)}
              />
            ))}
          </div>
        ))}

        {/* Reflexion */}
        <div className="space-y-4 border-t border-border pt-5">
          <div>
            <Label htmlFor="ci-well">Was lief gut?</Label>
            <Textarea id="ci-well" value={wentWell} onChange={(e) => { setWentWell(e.target.value); setSaved(false); }} placeholder="Ein Erfolg, ein schöner Moment…" className="min-h-[60px]" />
          </div>
          <div>
            <Label htmlFor="ci-bad">Was lief schlecht?</Label>
            <Textarea id="ci-bad" value={wentBad} onChange={(e) => { setWentBad(e.target.value); setSaved(false); }} placeholder="Was hat genervt oder gefehlt?" className="min-h-[60px]" />
          </div>
          <div>
            <Label htmlFor="ci-learned">Was hast du gelernt?</Label>
            <Textarea id="ci-learned" value={learned} onChange={(e) => { setLearned(e.target.value); setSaved(false); }} placeholder="Eine Erkenntnis für morgen…" className="min-h-[60px]" />
          </div>
          <div>
            <Label htmlFor="ci-note">Freitext (optional)</Label>
            <Textarea id="ci-note" value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} placeholder="Alles, was du festhalten willst." className="min-h-[60px]" />
          </div>
          <div>
            <Label htmlFor="ci-tags">Phasen / Schlagworte (optional)</Label>
            <input
              id="ci-tags"
              value={tags}
              onChange={(e) => { setTags(e.target.value); setSaved(false); }}
              placeholder="z. B. Urlaub, Deadline, krank – mit Komma trennen"
              className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">Hilft später, Phasen gezielt auszuwerten.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {(saved || existing) && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <Check size={16} /> {saved ? "Gespeichert" : "Heute eingecheckt"}
            </span>
          )}
          <Button onClick={save} disabled={busy} size="lg">
            <Save size={18} /> {existing ? "Aktualisieren" : "Check-in speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  metric: m,
  value,
  avg,
  onChange,
}: {
  metric: MetricDescriptor;
  value: number;
  avg?: number;
  onChange: (v: number) => void;
}) {
  const Icon = m.icon;
  return (
    <div data-metric={m.id}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon size={15} />
          </span>
          {m.prompt}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {avg !== undefined && <span>Ø {m.kind === "scale" ? avg.toFixed(1) : Math.round(avg)}</span>}
          <span className="font-semibold tabular-nums text-foreground">{formatMetricValue(m, value)}</span>
        </span>
      </div>

      {m.kind === "scale" ? (
        <ScaleControl metric={m} value={value} onChange={onChange} />
      ) : (
        <RangeControl metric={m} value={value} onChange={onChange} />
      )}
    </div>
  );
}

function ScaleControl({ metric: m, value, onChange }: { metric: MetricDescriptor; value: number; onChange: (v: number) => void }) {
  const options: number[] = [];
  for (let v = m.min; v <= m.max; v += m.step) options.push(v);
  return (
    <>
      <div className="grid grid-cols-5 gap-2">
        {options.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "h-11 rounded-lg border text-sm font-semibold tabular-nums transition-all active:scale-95",
              value === v
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      {(m.lowLabel || m.highLabel) && (
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{m.lowLabel}</span>
          <span>{m.highLabel}</span>
        </div>
      )}
    </>
  );
}

function RangeControl({ metric: m, value, onChange }: { metric: MetricDescriptor; value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(Math.max(v, m.min), m.max);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => onChange(clamp(value - m.step))} aria-label="weniger">
          <Minus size={16} />
        </Button>
        <input
          type="range"
          min={m.min}
          max={m.max}
          step={m.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-[hsl(var(--primary))]"
        />
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => onChange(clamp(value + m.step))} aria-label="mehr">
          <Plus size={16} />
        </Button>
      </div>
      {m.id === "sport" && (
        <div className="flex flex-wrap gap-1.5">
          {SPORT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                value === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p === 0 ? "keiner" : `${p} min`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
