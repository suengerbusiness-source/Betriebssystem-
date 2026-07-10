import type { DriverModel } from "@/features/journal/models";
import type { Lever } from "@/features/journal/insights";
import { EXPERIMENT_TEMPLATES, templateById, type ExperimentTemplate } from "./templates";

/*
  Experiment-Vorschläge: leitet aus den erkannten Treibern (Modell/Hebel) passende
  Selbstversuche ab – z. B. „Social ist ein starker Negativ-Treiber → 3 Tage kein
  Social Media". So schlägt die App gezielt vor, was zu testen sich lohnt.
*/

const DRIVER_TO_TEMPLATE: Record<string, string> = {
  socialMin: "no-social-3d",
  screenTotal: "phone-detox-24h",
  screenPassive: "phone-detox-24h",
  socialShare: "no-social-3d",
  caffeine: "no-caffeine-afternoon",
  stress: "meditation-2w",
  sleepHours: "sleep-before-23",
  sleepQuality: "screen-fast-evening",
  sport: "walk-daily-2w",
  nutrition: "no-sugar-week",
  entryHour: "sleep-before-23",
  physical: "no-sugar-week",
};

const DEFAULTS = ["walk-daily-2w", "gratitude-week", "no-sweets-24h", "water-2l", "phone-detox-24h"];

export function suggestExperiments(model: DriverModel | null, levers: Lever[], usedTemplateIds: Set<string>, limit = 3): ExperimentTemplate[] {
  const picks: string[] = [];
  if (model) {
    for (const d of model.drivers) {
      if (Math.abs(d.coef) < 0.12) continue;
      const t = DRIVER_TO_TEMPLATE[d.id];
      if (t) picks.push(t);
    }
  }
  for (const l of [...levers].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))) {
    const t = DRIVER_TO_TEMPLATE[l.driver];
    if (t) picks.push(t);
  }
  picks.push(...DEFAULTS);

  const seen = new Set<string>();
  const out: ExperimentTemplate[] = [];
  for (const id of picks) {
    if (seen.has(id) || usedTemplateIds.has(id)) continue;
    const t = templateById(id);
    if (!t) continue;
    seen.add(id);
    out.push(t);
    if (out.length >= limit) break;
  }
  // Falls immer noch Platz: irgendeine ungenutzte Vorlage.
  if (out.length < limit) {
    for (const t of EXPERIMENT_TEMPLATES) {
      if (seen.has(t.id) || usedTemplateIds.has(t.id)) continue;
      out.push(t); seen.add(t.id);
      if (out.length >= limit) break;
    }
  }
  return out;
}
