import { useEffect, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { RefreshCw, Wifi } from "lucide-react";
import type { PlatformKind } from "@/data/types";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchLiveStats, type LiveStats, type PlatformStat } from "@/lib/liveStats";
import { PLATFORMS } from "./company.platforms";
import { compactNumber } from "./company.utils";

const SHOWN: PlatformKind[] = ["youtube", "instagram", "facebook", "tiktok"];
const PREV_KEY = "lifeos.liveStatsPrev";

/**
 * Zeigt die automatisch (alle 12 h) abgerufenen Plattform-Kennzahlen. Lädt nur
 * die kleine stats.json der eigenen Seite und vergleicht mit dem letzten Stand,
 * um Zuwachs/Verlust an Followern anzuzeigen.
 */
export function LiveStatsCard() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [deltas, setDeltas] = useState<Partial<Record<PlatformKind, number>>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLiveStats().then((data) => {
      if (!active) return;
      setLoaded(true);
      if (!data) return;
      setStats(data);

      // Delta gegenüber letztem gespeicherten Stand (anderer Zeitstempel).
      try {
        const prev = JSON.parse(localStorage.getItem(PREV_KEY) || "null") as LiveStats | null;
        if (prev && prev.updatedAt !== data.updatedAt) {
          const d: Partial<Record<PlatformKind, number>> = {};
          for (const k of SHOWN) {
            const a = data.platforms[k]?.followers;
            const b = prev.platforms[k]?.followers;
            if (a != null && b != null) d[k] = a - b;
          }
          setDeltas(d);
        }
        if (data.updatedAt && (!prev || prev.updatedAt !== data.updatedAt)) {
          localStorage.setItem(PREV_KEY, JSON.stringify(data));
        }
      } catch {
        /* localStorage egal */
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!loaded) return null;

  const anyConfigured = stats ? SHOWN.some((k) => stats.platforms[k]?.configured) : false;
  const updated = stats?.updatedAt ? formatDistanceToNow(parseISO(stats.updatedAt), { addSuffix: true, locale: de }) : null;

  return (
    <Card>
      <CardHeader
        title="Live-Daten"
        subtitle="Automatisch aktualisiert · alle 12 Std."
        icon={<Wifi size={18} />}
        action={updated ? <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw size={12} /> {updated}</span> : undefined}
      />
      <CardContent>
        {!anyConfigured && (
          <p className="mb-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            Noch nicht eingerichtet. Sobald die Zugangsdaten (YouTube, Instagram, Facebook, TikTok) als
            GitHub-Secrets hinterlegt sind, erscheinen hier alle 12 Stunden automatisch Follower, Aufrufe und mehr.
            Anleitung: <span className="font-medium text-foreground">docs/live-daten.md</span>.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHOWN.map((k) => (
            <PlatformTile key={k} kind={k} stat={stats?.platforms[k]} delta={deltas[k]} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformTile({ kind, stat, delta }: { kind: PlatformKind; stat?: PlatformStat; delta?: number }) {
  const p = PLATFORMS[kind];
  const Icon = p.icon;
  const live = stat?.ok;
  const extras: string[] = [];
  if (stat?.views != null) extras.push(`${compactNumber(stat.views)} Aufrufe`);
  if (stat?.likes != null) extras.push(`${compactNumber(stat.likes)} Likes`);
  if (stat?.videos != null) extras.push(`${compactNumber(stat.videos)} Videos`);

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: p.color }}>
          <Icon size={15} />
        </span>
        <span className="text-sm font-medium">{p.label}</span>
      </div>

      {live ? (
        <>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-2xl font-bold tabular-nums leading-none">{stat?.followers != null ? compactNumber(stat.followers) : "–"}</p>
            {delta !== undefined && delta !== 0 && (
              <span className={cn("text-xs font-semibold", delta > 0 ? "text-success" : "text-destructive")}>
                {delta > 0 ? "+" : ""}{compactNumber(delta)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Follower</p>
          {extras.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">{extras.join(" · ")}</p>}
        </>
      ) : stat?.configured ? (
        <p className="mt-3 text-xs text-warning">Abruf fehlgeschlagen – Zugangsdaten prüfen.</p>
      ) : (
        <Badge className="mt-3 text-muted-foreground">noch nicht verbunden</Badge>
      )}
    </div>
  );
}
