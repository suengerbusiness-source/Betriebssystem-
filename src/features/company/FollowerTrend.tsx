import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parseISO } from "date-fns";
import { formatDate } from "@/lib/format";
import { compactNumber } from "./company.utils";
import { metricSeries, type HistorySnapshot } from "./liveStatsHistory";

/**
 * Verlaufskurve der Gesamt-Follower (Live-Plattformen) aus den gesammelten
 * Tages-Snapshots. Wächst mit der Zeit – ab 2 Datenpunkten sichtbar.
 */
export function FollowerTrend({ history }: { history: HistorySnapshot[] }) {
  const data = useMemo(
    () => metricSeries(history, "followers").map((p) => ({ day: p.day, value: p.value })),
    [history],
  );

  if (data.length < 2) {
    return (
      <p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        📈 Follower-Verlauf baut sich auf – ab dem zweiten automatischen Abruf erscheint hier deine Kurve.
      </p>
    );
  }

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const up = last >= first;
  const stroke = up ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Follower-Verlauf</p>
        <p className="text-xs text-muted-foreground">
          {compactNumber(last - first) !== "0" && (
            <span className={up ? "text-success" : "text-destructive"}>{last - first > 0 ? "+" : ""}{compactNumber(last - first)} </span>
          )}
          seit Start
        </p>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="follTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tickFormatter={(d: string) => formatDate(parseISO(d), "d.M.")} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              labelFormatter={(d) => formatDate(parseISO(d as string), "EEE, d. MMM yyyy")}
              formatter={(v: number) => [compactNumber(v) + " Follower", ""]}
            />
            <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} fill="url(#follTrend)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
