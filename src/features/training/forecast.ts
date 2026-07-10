import { lagLevers, type DayRow } from "@/features/journal/insights";

/*
  „Palantir"-Prognose: nutzt die gelernten zeitversetzten Muster (gestern → heute)
  und die heutigen Werte, um eine vorsichtige Vorhersage für morgen zu treffen –
  z. B. „viel Social heute → morgen wahrscheinlich weniger Energie".
  Bewusst als Hypothese formuliert, nicht als Gewissheit.
*/

export interface Prediction {
  outcome: string;
  driver: string;
  /** Erwartete Veränderung des morgigen Ergebnisses (Skalenpunkte). */
  effect: number;
  /** War der heutige Treiber hoch (true) oder niedrig (false)? */
  todayHigh: boolean;
  n: number;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Vorhersage für morgen aus den heutigen Werten. Für jeden zeitversetzten Hebel
 * wird geprüft, ob der heutige Treiber hoch/niedrig ist, und daraus die
 * erwartete Richtung des morgigen Ergebnisses abgeleitet.
 */
export function forecast(rows: DayRow[], todayValues: Record<string, number>, opts: { minEffect?: number } = {}): Prediction[] {
  const minEffect = opts.minEffect ?? 0.5;
  const lags = lagLevers(rows);
  const out: Prediction[] = [];

  for (const l of lags) {
    const vals = rows.map((r) => r.values[l.driver]).filter((v): v is number => v !== undefined);
    if (vals.length < 4) continue;
    const tv = todayValues[l.driver];
    if (tv === undefined) continue;

    const med = median(vals);
    const isHigh = l.boolDriver ? tv >= 1 : tv > med;
    const isLow = l.boolDriver ? tv < 1 : tv < med;
    if (!isHigh && !isLow) continue;

    // l.delta = Ergebnis am Folgetag: hoch- minus niedrig-Gruppe.
    const effect = isHigh ? l.delta : -l.delta;
    if (Math.abs(effect) < minEffect) continue;
    out.push({ outcome: l.outcome, driver: l.driver, effect, todayHigh: isHigh, n: l.n });
  }

  // Je Ergebnis nur die stärkste Vorhersage, insgesamt höchstens 5.
  out.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  const seen = new Set<string>();
  const result: Prediction[] = [];
  for (const p of out) {
    if (seen.has(p.outcome)) continue;
    seen.add(p.outcome);
    result.push(p);
    if (result.length >= 5) break;
  }
  return result;
}
