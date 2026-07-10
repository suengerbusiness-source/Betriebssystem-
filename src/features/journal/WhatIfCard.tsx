import { useState } from "react";
import { FlaskConical, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { metricById } from "./checkin.metrics";
import { labelOf } from "./insights";
import { predictChange, type DriverModel } from "./models";

/*
  „Was-wäre-wenn"-Simulator: nutzt das bereinigte Treiber-Modell (Regression),
  um vorherzusagen, wie sich ein Ergebnis ändert, wenn du einen Treiber
  veränderst – z. B. „Social −30 Min → Energie +0,6".
*/

const SIGNAL_UNIT: Record<string, string> = {
  socialMin: "min", screenTotal: "min", screenPassive: "min", screenProductive: "min",
  socialShare: "%", spending: "€", entryHour: "Uhr", completeness: "%", logEdits: "×", appOpens: "×",
};
function unitFor(id: string): string {
  return metricById(id)?.unit ?? SIGNAL_UNIT[id] ?? "";
}

const num1 = (v: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${num1(Math.abs(v))}`;

/** Runde Schrittweite für den Regler aus der Streuung eines Treibers. */
function niceStep(sd: number): number {
  if (sd >= 40) return 10;
  if (sd >= 10) return 5;
  if (sd >= 2) return 1;
  if (sd >= 0.6) return 0.5;
  return 0.1;
}

export function WhatIfCard({ model }: { model: DriverModel }) {
  const drivers = model.drivers.filter((d) => Math.abs(d.coef) >= 0.05).slice(0, 6);
  const [driverId, setDriverId] = useState(drivers[0]?.id);
  const [delta, setDelta] = useState(0);
  if (drivers.length === 0) return null;

  const driver = drivers.find((d) => d.id === driverId) ?? drivers[0];
  const step = niceStep(driver.sd);
  const range = Math.max(step, Math.round((driver.sd * 2) / step) * step);
  const change = predictChange(model, driver.id, delta) ?? 0;

  // Ergebnis-Grenzen (Skalen 1–10) beim neuen Erwartungswert respektieren.
  const om = metricById(model.outcome);
  const lo = om?.kind === "scale" ? om.min : -Infinity;
  const hi = om?.kind === "scale" ? om.max : Infinity;
  const newVal = Math.max(lo, Math.min(hi, model.outcomeMean + change));
  const up = change > 0;
  const unit = unitFor(driver.id);

  return (
    <Card>
      <CardHeader
        title="Was-wäre-wenn-Simulator"
        subtitle={`Zieh am Regler und sieh, wie sich deine ${labelOf(model.outcome)} voraussichtlich ändert.`}
        icon={<FlaskConical size={18} />}
      />
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Was änderst du?</p>
          <div className="flex flex-wrap gap-1.5">
            {drivers.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { setDriverId(d.id); setDelta(0); }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  d.id === driver.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {labelOf(d.id)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Änderung</span>
            <span className="font-semibold tabular-nums">{signed(delta)}{unit ? ` ${unit}` : ""}</span>
          </div>
          <input
            type="range"
            min={-range}
            max={range}
            step={step}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[hsl(var(--primary))]"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>−{num1(range)}{unit ? ` ${unit}` : ""}</span>
            <span>heute üblich: ~{num1(driver.mean)}{unit ? ` ${unit}` : ""}</span>
            <span>+{num1(range)}{unit ? ` ${unit}` : ""}</span>
          </div>
        </div>

        <div className={cn("flex items-center gap-3 rounded-xl border p-4", delta === 0 ? "border-border" : up ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5")}>
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", delta === 0 ? "bg-secondary text-muted-foreground" : up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {up ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </span>
          <div>
            {delta === 0 ? (
              <p className="text-sm text-muted-foreground">Zieh am Regler, um eine Vorhersage zu sehen.</p>
            ) : (
              <p className="text-sm leading-relaxed">
                {labelOf(driver.id)} {delta > 0 ? "höher" : "niedriger"} → deine <span className="font-semibold">{labelOf(model.outcome)}</span> voraussichtlich{" "}
                <span className={cn("font-semibold", up ? "text-success" : "text-destructive")}>{signed(change)}</span>
                {om?.kind === "scale" && <> (von ~{num1(model.outcomeMean)} auf ~{num1(newVal)})</>}.
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Schätzung aus deinem bereinigten Treiber-Modell (erklärt {Math.round(model.r2 * 100)}%). Ein Modell, keine Garantie – gut zum Ausprobieren.</p>
      </CardContent>
    </Card>
  );
}
