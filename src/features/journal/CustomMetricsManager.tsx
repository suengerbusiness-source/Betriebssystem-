import { useState } from "react";
import { Check, Plus, Settings2, Trash2, X } from "lucide-react";
import { customMetrics as customMetricsRepo } from "@/data/repo";
import type { CustomMetric, CustomMetricKind } from "@/data/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Input";
import { CUSTOM_ICON_CHOICES, customIcon, formatMetricValue, customToDescriptor } from "./checkin.metrics";

/*
  Verwaltung der eigenen Tracker („Bausteine"): anlegen, bearbeiten, löschen.
  Neue Tracker erscheinen sofort als eigene Sektion im Abend-Check-in und fließen
  in Auswertung & KI-Export ein.
*/

const KIND_LABEL: Record<CustomMetricKind, string> = {
  bool: "Ja / Nein",
  scale: "Skala 1–10",
  count: "Anzahl",
  minutes: "Minuten",
  hours: "Stunden",
};

/** Sinnvolle Vorgaben je Art (Bereich, Schritt, Startwert). */
function presetFor(kind: CustomMetricKind): Pick<CustomMetric, "min" | "max" | "step" | "default" | "unit"> {
  switch (kind) {
    case "bool": return { min: 0, max: 1, step: 1, default: 0 };
    case "scale": return { min: 1, max: 10, step: 1, default: 5 };
    case "count": return { min: 0, max: 5000, step: 1, default: 0, unit: "" };
    case "minutes": return { min: 0, max: 600, step: 5, default: 0, unit: "min" };
    case "hours": return { min: 0, max: 24, step: 0.5, default: 0, unit: "h" };
  }
}

interface Draft {
  label: string;
  kind: CustomMetricKind;
  higherIsBetter: boolean;
  icon: string;
  unit: string;
  /** Tagesziel (count) als String im Formular. */
  target: string;
  trackWeight: boolean;
}

const emptyDraft = (): Draft => ({ label: "", kind: "bool", higherIsBetter: false, icon: "star", unit: "", target: "", trackWeight: false });

/** Fertige Vorlagen für häufige Tracker – ein Tipp genügt. */
interface Template { label: string; unit?: string; icon: string; target?: number; trackWeight?: boolean; higherIsBetter: boolean; }
const TEMPLATES: Template[] = [
  { label: "Extra-Protein", unit: "g", icon: "pill", higherIsBetter: true },
  { label: "Bizeps Curls", unit: "Wdh", icon: "dumbbell", target: 100, trackWeight: true, higherIsBetter: true },
  { label: "Situps", unit: "Wdh", icon: "dumbbell", target: 100, higherIsBetter: true },
  { label: "Klimmzüge", unit: "Wdh", icon: "dumbbell", target: 100, trackWeight: true, higherIsBetter: true },
  { label: "Squats", unit: "Wdh", icon: "dumbbell", target: 100, trackWeight: true, higherIsBetter: true },
];

export function CustomMetricsManager({ accountId, metrics }: { accountId: string; metrics: CustomMetric[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const active = metrics.filter((m) => !m.archived).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  const exists = (label: string) => active.some((m) => m.label.toLowerCase() === label.toLowerCase());

  async function save() {
    const label = draft.label.trim();
    if (!label) return;
    const preset = presetFor(draft.kind);
    const unit = draft.unit.trim() || preset.unit || undefined;
    const target = draft.kind === "count" && draft.target.trim() ? Math.max(1, Math.round(Number(draft.target))) : undefined;
    await customMetricsRepo.create({
      accountId,
      label,
      kind: draft.kind,
      ...preset,
      unit,
      higherIsBetter: draft.higherIsBetter,
      icon: draft.icon,
      ...(draft.kind === "bool" ? { lowLabel: "Nein", highLabel: "Ja" } : {}),
      ...(target ? { target } : {}),
      ...(draft.kind === "count" && draft.trackWeight ? { trackWeight: true } : {}),
      order: active.length,
    });
    setDraft(emptyDraft());
    setAdding(false);
  }

  async function addTemplate(t: Template) {
    if (exists(t.label)) return; // schon vorhanden -> nicht doppelt anlegen
    const preset = presetFor("count");
    await customMetricsRepo.create({
      accountId,
      label: t.label,
      kind: "count",
      ...preset,
      unit: t.unit || undefined,
      higherIsBetter: t.higherIsBetter,
      icon: t.icon,
      ...(t.target ? { target: t.target } : {}),
      ...(t.trackWeight ? { trackWeight: true } : {}),
      order: active.length,
    });
  }

  return (
    <Card>
      <CardHeader
        title="Eigene Tracker"
        subtitle="Bau dir eigene Gewohnheiten & Kennzahlen – sie erscheinen im Check-in und in der Auswertung."
        icon={<Settings2 size={18} />}
        action={
          !adding ? (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus size={15} /> Neu
            </Button>
          ) : undefined
        }
      />
      <CardContent className="space-y-4">
        {active.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">
            Noch keine eigenen Tracker. Beispiele: „Onanie" (Ja/Nein), „Kaffee" (Anzahl),
            „Meditation" (Minuten) – so erkennst du später Zusammenhänge wie „gestern X → heute wenig Energie".
          </p>
        )}

        {!adding && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Schnell hinzufügen</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => {
                const already = exists(t.label);
                return (
                  <button
                    key={t.label}
                    type="button"
                    disabled={already}
                    onClick={() => addTemplate(t)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      already ? "cursor-default border-border text-muted-foreground/50" : "border-primary/40 text-primary hover:bg-primary/10",
                    )}
                  >
                    {already ? <Check size={13} /> : <Plus size={13} />}
                    {t.label}{t.target ? ` · Ziel ${t.target}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {active.length > 0 && (
          <ul className="space-y-2">
            {active.map((m) => {
              const Icon = customIcon(m.icon);
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABEL[m.kind]}
                      {m.unit ? ` · ${m.unit}` : ""}
                      {m.target ? ` · Ziel ${m.target}` : ""}
                      {m.trackWeight ? " · mit kg" : ""} · {m.higherIsBetter ? "gut, wenn hoch" : "gut, wenn niedrig"}
                    </p>
                  </div>
                  <Badge className="hidden text-muted-foreground sm:inline-flex">
                    {formatMetricValue(customToDescriptor(m), m.kind === "bool" ? 1 : m.default)}
                  </Badge>
                  <button
                    onClick={() => confirm(`Tracker „${m.label}" löschen? Bereits erfasste Werte bleiben in alten Einträgen erhalten.`) && customMetricsRepo.remove(m.id)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Tracker löschen"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {adding && (
          <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div>
              <Label htmlFor="cm-label">Name des Trackers</Label>
              <Input
                id="cm-label"
                autoFocus
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="z. B. Onanie, Kaffee, Meditation, Lesen…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cm-kind">Art</Label>
                <Select
                  id="cm-kind"
                  value={draft.kind}
                  onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as CustomMetricKind, unit: "" }))}
                >
                  {(Object.keys(KIND_LABEL) as CustomMetricKind[]).map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="cm-dir">Bewertung</Label>
                <Select
                  id="cm-dir"
                  value={draft.higherIsBetter ? "high" : "low"}
                  onChange={(e) => setDraft((d) => ({ ...d, higherIsBetter: e.target.value === "high" }))}
                >
                  <option value="high">Höher / Ja ist besser</option>
                  <option value="low">Niedriger / Nein ist besser</option>
                </Select>
              </div>
            </div>

            {draft.kind === "count" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cm-unit">Einheit (optional)</Label>
                    <Input
                      id="cm-unit"
                      value={draft.unit}
                      onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                      placeholder="z. B. Wdh, Tassen, g"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cm-target">Tagesziel (optional)</Label>
                    <Input
                      id="cm-target"
                      inputMode="numeric"
                      value={draft.target}
                      onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value.replace(/\D/g, "") }))}
                      placeholder="z. B. 100 – baut eine Strähne auf"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.trackWeight} onChange={(e) => setDraft((d) => ({ ...d, trackWeight: e.target.checked }))} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                  Zusätzlich Gewicht in kg erfassen (z. B. Kraftübungen)
                </label>
              </>
            )}

            <div>
              <Label>Symbol</Label>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_ICON_CHOICES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, icon: c.key }))}
                      title={c.label}
                      aria-label={c.label}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-all",
                        draft.icon === c.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setDraft(emptyDraft()); }}>
                <X size={15} /> Abbrechen
              </Button>
              <Button size="sm" onClick={save} disabled={!draft.label.trim()}>
                <Check size={15} /> Tracker anlegen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
