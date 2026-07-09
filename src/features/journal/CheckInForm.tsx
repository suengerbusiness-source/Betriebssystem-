import { useEffect, useMemo, useState } from "react";
import { Check, MessageSquarePlus, Minus, Plus, Save } from "lucide-react";
import { checkins as checkinsRepo } from "@/data/repo";
import type { CheckIn } from "@/data/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  CHECKIN_METRICS,
  PHASES,
  SCALE_METRIC_COUNT,
  clockToTime,
  formatMetricValue,
  metricPhase,
  timeToClock,
  type MetricChoice,
  type MetricDescriptor,
} from "./checkin.metrics";
import { journalToday, wellbeingScore } from "./checkin.utils";
import { armCheckinReminders } from "./checkinReminders";

const SPORT_PRESETS = [0, 15, 30, 45, 60, 90];

/** Mengen-/Ja-Nein-Felder starten mit Vorgabewert; Skalen/Zeiten/Auswahl leer. */
function freshMetrics(custom: MetricDescriptor[] = []): Record<string, number> {
  const m: Record<string, number> = {};
  for (const d of [...CHECKIN_METRICS, ...custom]) {
    if (d.kind === "bool") m[d.id] = 0;
    else if (d.kind === "count" || d.kind === "minutes" || d.kind === "hours") m[d.id] = d.default;
  }
  return m;
}

/**
 * Geführter Tages-Check-in – EIN Eintrag pro Tag, den du über den Tag verteilt
 * füllen kannst: „Morgens" (Schlaf), „Über den Tag" (was feststeht) und
 * „Abends" (die Gesamt-Bewertungen). Jedes Speichern aktualisiert denselben
 * Tages-Eintrag (upsert), sodass Teil-Eingaben erhalten bleiben.
 */
export function CheckInForm({
  accountId,
  avgMetrics,
  customMetrics = [],
  entries = [],
}: {
  accountId: string;
  /** Durchschnitte der letzten Einträge (Ø-Hinweis). */
  avgMetrics: Record<string, number>;
  /** Nutzerdefinierte Tracker (erscheinen unter „Über den Tag"). */
  customMetrics?: MetricDescriptor[];
  /** Alle Tages-Einträge (für Vorbelegung & rückwirkendes Bearbeiten). */
  entries?: CheckIn[];
}) {
  const [date, setDate] = useState(journalToday());
  const byDate = useMemo(() => new Map(entries.map((c) => [c.date, c])), [entries]);
  const selected = byDate.get(date);

  const [metrics, setMetrics] = useState<Record<string, number>>(() => freshMetrics(customMetrics));
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [wentWell, setWentWell] = useState("");
  const [wentBad, setWentBad] = useState("");
  const [learned, setLearned] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Eintrag des gewählten Tages laden (bei Datumswechsel oder wenn er neu ankommt).
  useEffect(() => {
    setMetrics({ ...freshMetrics(customMetrics), ...(selected?.metrics ?? {}) });
    setWeights(selected?.weights ?? {});
    setNotes(selected?.metricNotes ?? {});
    setChoices(selected?.choices ?? {});
    setWentWell(selected?.wentWell ?? "");
    setWentBad(selected?.wentBad ?? "");
    setLearned(selected?.learned ?? "");
    setNote(selected?.note ?? "");
    setTags((selected?.tags ?? []).join(", "));
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selected?.id]);

  const score = wellbeingScore(metrics);
  const answeredScales = CHECKIN_METRICS.filter((m) => m.kind === "scale" && metrics[m.id] !== undefined).length;
  const allMetrics = [...CHECKIN_METRICS, ...customMetrics];

  function setMetric(id: string, value: number) {
    setMetrics((m) => ({ ...m, [id]: value }));
    setSaved(false);
  }
  function clearMetric(id: string) {
    setMetrics((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setSaved(false);
  }
  function setChoice(m: MetricDescriptor, opt: MetricChoice) {
    setChoices((c) => ({ ...c, [m.id]: opt.label }));
    if (opt.score !== undefined) setMetric(m.id, opt.score);
    else clearMetric(m.id); // nominale Auswahl (z. B. Ort) fließt nicht numerisch ein
    setSaved(false);
  }
  function setWeight(id: string, value: number) {
    setWeights((w) => ({ ...w, [id]: value }));
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

  async function save() {
    setBusy(true);
    const cleanNotes = Object.fromEntries(
      Object.entries(notes)
        .map(([k, v]) => [k, v.trim()] as const)
        .filter(([, v]) => v.length > 0),
    );
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const cleanWeights = Object.fromEntries(Object.entries(weights).filter(([, v]) => Number.isFinite(v) && v > 0));
    await checkinsRepo.upsert(accountId, date, {
      metrics: { ...metrics },
      metricNotes: Object.keys(cleanNotes).length ? cleanNotes : undefined,
      choices: Object.keys(choices).length ? choices : undefined,
      weights: Object.keys(cleanWeights).length ? cleanWeights : undefined,
      wentWell: wentWell.trim() || undefined,
      wentBad: wentBad.trim() || undefined,
      learned: learned.trim() || undefined,
      note: note.trim() || undefined,
      tags: tagList.length ? tagList : undefined,
    });
    setBusy(false);
    setSaved(true);
    void armCheckinReminders(accountId); // heute erledigt -> Erinnerungen anpassen
  }

  return (
    <Card>
      <CardHeader
        title="Tages-Check-in"
        subtitle={`Fülle ihn über den Tag verteilt – ${answeredScales}/${SCALE_METRIC_COUNT} Bewertungen erfasst.`}
        action={
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none">{score ?? "–"}</p>
            <p className="text-[11px] text-muted-foreground">Tages-Score</p>
          </div>
        }
      />
      <CardContent className="space-y-7">
        {/* Tag wählen – auch rückwirkend nachtragen. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
          <Label htmlFor="ci-date" className="mb-0 text-sm">Tag</Label>
          <Input id="ci-date" type="date" max={journalToday()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-auto" />
          {date !== journalToday() && <span className="text-xs font-medium text-primary">rückwirkender Eintrag</span>}
          {date === journalToday() && <span className="text-xs text-muted-foreground">heute</span>}
        </div>

        {PHASES.map((phase) => {
          const phaseMetrics = allMetrics.filter((m) => metricPhase(m) === phase.key);
          if (phaseMetrics.length === 0 && phase.key !== "evening") return null;
          return (
            <div key={phase.key} className="space-y-4">
              <div className="border-b border-border pb-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">{phase.label}</p>
                <p className="text-[11px] text-muted-foreground">{phase.hint}</p>
              </div>
              {phaseMetrics.map((m) => (
                <MetricRow
                  key={m.id}
                  metric={m}
                  value={metrics[m.id]}
                  weight={weights[m.id]}
                  choiceLabel={choices[m.id]}
                  avg={avgMetrics[m.id]}
                  note={notes[m.id]}
                  commentOpen={openComments.has(m.id)}
                  onChange={(v) => setMetric(m.id, v)}
                  onWeight={(v) => setWeight(m.id, v)}
                  onChoice={(opt) => setChoice(m, opt)}
                  onToggleComment={() => toggleComment(m.id)}
                  onNote={(t) => setMetricNote(m.id, t)}
                />
              ))}

              {phase.key === "evening" && (
                <div className="space-y-4 pt-1">
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
              )}
            </div>
          );
        })}

        <div className="sticky bottom-2 flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <Check size={16} /> Gespeichert
            </span>
          )}
          <Button onClick={save} disabled={busy} size="lg">
            <Save size={18} /> {selected ? "Aktualisieren" : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  metric: m,
  value,
  weight,
  choiceLabel,
  avg,
  note,
  commentOpen,
  onChange,
  onWeight,
  onChoice,
  onToggleComment,
  onNote,
}: {
  metric: MetricDescriptor;
  value: number | undefined;
  weight?: number;
  choiceLabel?: string;
  avg?: number;
  note?: string;
  commentOpen: boolean;
  onChange: (v: number) => void;
  onWeight: (v: number) => void;
  onChoice: (opt: MetricChoice) => void;
  onToggleComment: () => void;
  onNote: (text: string) => void;
}) {
  const Icon = m.icon;
  const showComment = commentOpen || (note ?? "").length > 0;
  const showAvg = avg !== undefined && (m.kind === "scale" || m.kind === "count" || m.kind === "minutes" || m.kind === "hours" || m.kind === "number");
  const noteDefault =
    m.id === "earnedMoney" ? "Womit verdient? (z. B. TikTok-Deal, Verkauf)"
    : m.label === "Extra-Protein" ? "Wodurch? (z. B. Shake, Joghurt, Riegel)"
    : "Warum dieser Wert? Was hat ihn bestimmt? (optional)";

  const reachedTarget = m.target != null && value != null && value >= m.target;
  const display =
    m.kind === "choice" ? choiceLabel
    : value !== undefined ? formatMetricValue(m, value) + (m.trackWeight && weight ? ` · ${weight} kg` : "")
    : undefined;

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
          {m.target != null && <span className="text-muted-foreground/70">Ziel {m.target}</span>}
          {showAvg && <span>Ø {m.kind === "scale" ? avg!.toFixed(1) : Math.round(avg!)}</span>}
          {display !== undefined ? (
            <span className={cn("flex items-center gap-1 font-semibold tabular-nums", reachedTarget ? "text-success" : "text-foreground")}>
              {display}{reachedTarget && <Check size={13} />}
            </span>
          ) : (
            <span className="text-muted-foreground/50">–</span>
          )}
          <button
            type="button"
            onClick={onToggleComment}
            title="Notiz hinzufügen"
            aria-label="Notiz hinzufügen"
            className={cn("transition-colors", showComment ? "text-primary" : "text-muted-foreground/50 hover:text-foreground")}
          >
            <MessageSquarePlus size={15} />
          </button>
        </span>
      </div>

      {m.kind === "scale" ? (
        <ScaleControl metric={m} value={value} onChange={onChange} />
      ) : m.kind === "bool" ? (
        <BoolControl metric={m} value={value ?? 0} onChange={onChange} />
      ) : m.kind === "choice" ? (
        <ChoiceControl metric={m} selected={choiceLabel} onChoice={onChoice} />
      ) : m.kind === "time" ? (
        <TimeControl metric={m} value={value} onChange={onChange} />
      ) : m.kind === "number" ? (
        <NumberControl metric={m} value={value} onChange={onChange} />
      ) : m.kind === "count" ? (
        <CountControl metric={m} value={value} weight={weight} onChange={onChange} onWeight={onWeight} />
      ) : (
        <RangeControl metric={m} value={value ?? m.default} onChange={onChange} />
      )}

      {showComment && (
        <Input
          value={note ?? ""}
          onChange={(e) => onNote(e.target.value)}
          placeholder={noteDefault}
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
      {[{ v: 0, label: no }, { v: 1, label: yes }].map((o) => (
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

function ChoiceControl({ metric: m, selected, onChoice }: { metric: MetricDescriptor; selected?: string; onChoice: (opt: MetricChoice) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(m.choices ?? []).map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChoice(o)}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-95",
            selected === o.label
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

function TimeControl({ metric: m, value, onChange }: { metric: MetricDescriptor; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <Input
      type="time"
      value={value !== undefined ? timeToClock(m, value) : ""}
      onChange={(e) => { if (e.target.value) onChange(clockToTime(m, e.target.value)); }}
      className="h-11 max-w-[10rem] tabular-nums"
      aria-label={m.label}
    />
  );
}

function NumberControl({ metric: m, value, onChange }: { metric: MetricDescriptor; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="decimal"
        min={m.min}
        max={m.max}
        step={m.step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="h-11 max-w-[10rem] text-right tabular-nums"
        aria-label={m.label}
      />
      {m.unit && <span className="text-sm text-muted-foreground">{m.unit}</span>}
    </div>
  );
}

function CountControl({ metric: m, value, weight, onChange, onWeight }: { metric: MetricDescriptor; value: number | undefined; weight?: number; onChange: (v: number) => void; onWeight: (v: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={m.min}
          max={m.max}
          step={m.step}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="h-11 w-28 text-right tabular-nums"
          aria-label={m.label}
          placeholder="0"
        />
        {m.unit && <span className="text-sm text-muted-foreground">{m.unit}</span>}
      </div>
      {m.trackWeight && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">mit</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={weight ?? ""}
            onChange={(e) => onWeight(e.target.value === "" ? 0 : Number(e.target.value))}
            className="h-11 w-24 text-right tabular-nums"
            aria-label={`${m.label} Gewicht in kg`}
            placeholder="kg"
          />
          <span className="text-sm text-muted-foreground">kg</span>
        </div>
      )}
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
