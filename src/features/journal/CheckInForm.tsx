import { useState } from "react";
import { Check, MessageSquarePlus, Minus, Plus, Save } from "lucide-react";
import { checkins as checkinsRepo } from "@/data/repo";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  CHECKIN_METRICS,
  METRIC_GROUPS,
  SCALE_METRIC_COUNT,
  formatMetricValue,
  type MetricDescriptor,
} from "./checkin.metrics";
import { journalToday, wellbeingScore } from "./checkin.utils";
import { armCheckinReminders } from "./checkinReminders";

const SPORT_PRESETS = [0, 15, 30, 45, 60, 90];

/** Faktische Mengen-Felder (auch eigene Tracker) starten mit Vorgabewert. */
function freshMetrics(custom: MetricDescriptor[] = []): Record<string, number> {
  const m: Record<string, number> = {};
  for (const d of [...CHECKIN_METRICS, ...custom]) {
    // Skalen bleiben leer (bewusste Auswahl), Mengen/Ja-Nein bekommen Startwert.
    if (d.kind === "scale") continue;
    m[d.id] = d.kind === "bool" ? 0 : d.default;
  }
  return m;
}

/**
 * Geführter Abend-Check-in. Subjektive Dimensionen werden auf 1–10 erfasst,
 * zu jedem Wert lässt sich optional eine Begründung hinterlegen. Nach dem
 * Speichern wird der Eintrag angelegt und die Maske für einen neuen Eintrag
 * zurückgesetzt (mehrere Einträge pro Tag möglich).
 */
export function CheckInForm({
  accountId,
  avgMetrics,
  customMetrics = [],
}: {
  accountId: string;
  /** Durchschnitte der letzten Einträge (Ø-Hinweis). */
  avgMetrics: Record<string, number>;
  /** Nutzerdefinierte Tracker (erscheinen als eigene Sektion). */
  customMetrics?: MetricDescriptor[];
}) {
  const [metrics, setMetrics] = useState<Record<string, number>>(() => freshMetrics(customMetrics));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [wentWell, setWentWell] = useState("");
  const [wentBad, setWentBad] = useState("");
  const [learned, setLearned] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const score = wellbeingScore(metrics);
  const answeredScales = CHECKIN_METRICS.filter((m) => m.kind === "scale" && metrics[m.id] !== undefined).length;

  function setMetric(id: string, value: number) {
    setMetrics((m) => ({ ...m, [id]: value }));
    setSaved(false);
  }
  function setMetricNote(id: string, text: string) {
    setNotes((n) => ({ ...n, [id]: text }));
    setSaved(false);
  }
  function toggleComment(id: string) {
    setOpenComments((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function reset() {
    setMetrics(freshMetrics(customMetrics));
    setNotes({});
    setOpenComments(new Set());
    setWentWell("");
    setWentBad("");
    setLearned("");
    setNote("");
    setTags("");
  }

  async function save() {
    setBusy(true);
    const cleanNotes = Object.fromEntries(
      Object.entries(notes)
        .map(([k, v]) => [k, v.trim()] as const)
        .filter(([, v]) => v.length > 0),
    );
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await checkinsRepo.create({
      accountId,
      date: journalToday(),
      metrics: { ...metrics },
      metricNotes: Object.keys(cleanNotes).length ? cleanNotes : undefined,
      wentWell: wentWell.trim() || undefined,
      wentBad: wentBad.trim() || undefined,
      learned: learned.trim() || undefined,
      note: note.trim() || undefined,
      tags: tagList.length ? tagList : undefined,
    });
    setBusy(false);
    reset();
    setSaved(true);
    // Heute erledigt -> künftige Erinnerungen dieses Tages nicht mehr einplanen
    // und zugleich die nächsten Tage vorplanen.
    void armCheckinReminders(accountId);
  }

  return (
    <Card>
      <CardHeader
        title="Abend-Check-in"
        subtitle={`${answeredScales}/${SCALE_METRIC_COUNT} Dimensionen erfasst – mit optionaler Begründung je Wert.`}
        action={
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none">{score ?? "–"}</p>
            <p className="text-[11px] text-muted-foreground">Tages-Score</p>
          </div>
        }
      />
      <CardContent className="space-y-6">
        {METRIC_GROUPS.filter((g) => g !== "Eigene Tracker").map((group) => (
          <div key={group} className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group}</p>
            {CHECKIN_METRICS.filter((m) => m.group === group).map((m) => (
              <MetricRow
                key={m.id}
                metric={m}
                value={metrics[m.id]}
                avg={avgMetrics[m.id]}
                note={notes[m.id]}
                commentOpen={openComments.has(m.id)}
                onChange={(v) => setMetric(m.id, v)}
                onToggleComment={() => toggleComment(m.id)}
                onNote={(t) => setMetricNote(m.id, t)}
              />
            ))}
          </div>
        ))}

        {customMetrics.length > 0 && (
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">Eigene Tracker</p>
            {customMetrics.map((m) => (
              <MetricRow
                key={m.id}
                metric={m}
                value={metrics[m.id]}
                avg={avgMetrics[m.id]}
                note={notes[m.id]}
                commentOpen={openComments.has(m.id)}
                onChange={(v) => setMetric(m.id, v)}
                onToggleComment={() => toggleComment(m.id)}
                onNote={(t) => setMetricNote(m.id, t)}
              />
            ))}
          </div>
        )}

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
            <Input
              id="ci-tags"
              value={tags}
              onChange={(e) => { setTags(e.target.value); setSaved(false); }}
              placeholder="z. B. Urlaub, Deadline, krank – mit Komma trennen"
            />
            <p className="mt-1 text-xs text-muted-foreground">Hilft später, Phasen gezielt auszuwerten.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <Check size={16} /> Gespeichert – neuer Eintrag bereit
            </span>
          )}
          <Button onClick={save} disabled={busy} size="lg">
            <Save size={18} /> Check-in speichern
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
  note,
  commentOpen,
  onChange,
  onToggleComment,
  onNote,
}: {
  metric: MetricDescriptor;
  value: number | undefined;
  avg?: number;
  note?: string;
  commentOpen: boolean;
  onChange: (v: number) => void;
  onToggleComment: () => void;
  onNote: (text: string) => void;
}) {
  const Icon = m.icon;
  const showComment = commentOpen || (note ?? "").length > 0;
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
          {value !== undefined ? (
            <span className="font-semibold tabular-nums text-foreground">{formatMetricValue(m, value)}</span>
          ) : (
            <span className="text-muted-foreground/50">–</span>
          )}
          <button
            type="button"
            onClick={onToggleComment}
            title="Begründung hinzufügen"
            aria-label="Begründung hinzufügen"
            className={cn(
              "transition-colors",
              showComment ? "text-primary" : "text-muted-foreground/50 hover:text-foreground",
            )}
          >
            <MessageSquarePlus size={15} />
          </button>
        </span>
      </div>

      {m.kind === "scale" ? (
        <ScaleControl metric={m} value={value} onChange={onChange} />
      ) : m.kind === "bool" ? (
        <BoolControl metric={m} value={value ?? 0} onChange={onChange} />
      ) : (
        <RangeControl metric={m} value={value ?? m.default} onChange={onChange} />
      )}

      {showComment && (
        <Input
          value={note ?? ""}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Warum dieser Wert? Was hat ihn bestimmt? (optional)"
          className="mt-2 h-9 text-sm"
        />
      )}
    </div>
  );
}

function BoolControl({ metric: m, value, onChange }: { metric: MetricDescriptor; value: number; onChange: (v: number) => void }) {
  const yes = m.highLabel || "Ja";
  const no = m.lowLabel || "Nein";
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { v: 0, label: no },
        { v: 1, label: yes },
      ].map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "h-11 rounded-lg border text-sm font-semibold transition-all active:scale-95",
            value === o.v
              ? "border-primary bg-primary text-primary-foreground shadow-soft"
              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ScaleControl({ metric: m, value, onChange }: { metric: MetricDescriptor; value: number | undefined; onChange: (v: number) => void }) {
  const options: number[] = [];
  for (let v = m.min; v <= m.max; v += m.step) options.push(v);
  return (
    <>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {options.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "h-10 rounded-lg border text-sm font-semibold tabular-nums transition-all active:scale-95",
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
              {p === 0 ? "keine" : `${p} min`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
