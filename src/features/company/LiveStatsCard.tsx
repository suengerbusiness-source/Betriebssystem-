import type { ReactNode } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { RefreshCw, Trash2, Wifi } from "lucide-react";
import { channels as channelsRepo } from "@/data/repo";
import type { Channel, PlatformKind } from "@/data/types";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { type LiveStats, type PlatformStat } from "@/lib/liveStats";
import { platformOf } from "./company.platforms";
import { compactNumber } from "./company.utils";

const SHOWN: PlatformKind[] = ["youtube", "instagram", "facebook", "tiktok"];
const fmtDate = (ms: number) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(ms);

interface LiveStatsCardProps {
  stats: LiveStats | null;
  deltas: Partial<Record<PlatformKind, number>>;
  loaded: boolean;
  /** Manuell gepflegte Kanäle – werden als „offline" mit eingeblendet. */
  channels: Channel[];
}

/**
 * Zeigt die automatisch (alle 12 h) abgerufenen Plattform-Kennzahlen sowie die
 * manuell eingetragenen Kanäle (als „offline" markiert) in einer Ansicht.
 */
export function LiveStatsCard({ stats, deltas, loaded, channels }: LiveStatsCardProps) {
  if (!loaded) return null;

  const updated = stats?.updatedAt ? formatDistanceToNow(parseISO(stats.updatedAt), { addSuffix: true, locale: de }) : null;
  const liveKinds = SHOWN.filter((k) => stats?.platforms[k]?.ok);

  // Manuelle Kanäle, deren Plattform NICHT live ist – die zeigen wir „offline".
  const manualByKind = new Map<PlatformKind, Channel[]>();
  for (const c of channels) {
    if (liveKinds.includes(c.kind)) continue; // Live hat Vorrang (keine Doppelung)
    const arr = manualByKind.get(c.kind) ?? [];
    arr.push(c);
    manualByKind.set(c.kind, arr);
  }

  const anyConfigured = stats ? SHOWN.some((k) => stats.platforms[k]?.configured) : false;
  const hasAnyManual = channels.length > 0;

  // Reihenfolge: erst die vier Hauptplattformen, dann übrige manuelle Kanäle.
  const otherManual = channels.filter((c) => !SHOWN.includes(c.kind) && !liveKinds.includes(c.kind));

  return (
    <Card>
      <CardHeader
        title="Live-Daten"
        subtitle="Automatisch (alle 12 Std.) · manuelle Kanäle als 'offline'."
        icon={<Wifi size={18} />}
        action={updated ? <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw size={12} /> {updated}</span> : undefined}
      />
      <CardContent>
        {!anyConfigured && !hasAnyManual && (
          <p className="mb-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            Noch nicht eingerichtet. Sobald die Zugangsdaten (YouTube, Instagram, Facebook, TikTok) als
            GitHub-Secrets hinterlegt sind, erscheinen hier alle 12 Stunden automatisch Follower, Aufrufe und mehr.
            Anleitung: <span className="font-medium text-foreground">docs/live-daten.md</span>.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHOWN.map((k) => {
            const stat = stats?.platforms[k];
            if (stat?.ok) return <LiveTile key={k} kind={k} stat={stat} delta={deltas[k]} />;
            const manual = manualByKind.get(k);
            if (manual && manual.length) return manual.map((c) => <OfflineTile key={c.id} channel={c} />);
            return <NotConnectedTile key={k} kind={k} failed={Boolean(stat?.configured)} />;
          })}
          {otherManual.map((c) => (
            <OfflineTile key={c.id} channel={c} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TileFrame({ kind, name, children }: { kind: PlatformKind; name?: string; children: ReactNode }) {
  const p = platformOf(kind);
  const Icon = p.icon;
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: p.color }}>
          <Icon size={15} />
        </span>
        <span className="truncate text-sm font-medium">{name || p.label}</span>
      </div>
      {children}
    </div>
  );
}

function LiveTile({ kind, stat, delta }: { kind: PlatformKind; stat: PlatformStat; delta?: number }) {
  const extras: string[] = [];
  if (stat.views != null) extras.push(`${compactNumber(stat.views)} Aufrufe`);
  if (stat.likes != null) extras.push(`${compactNumber(stat.likes)} Likes`);
  if (stat.videos != null) extras.push(`${compactNumber(stat.videos)} Videos`);

  return (
    <TileFrame kind={kind}>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-bold tabular-nums leading-none">{stat.followers != null ? compactNumber(stat.followers) : "–"}</p>
        {delta !== undefined && delta !== 0 && (
          <span className={cn("text-xs font-semibold", delta > 0 ? "text-success" : "text-destructive")}>
            {delta > 0 ? "+" : ""}{compactNumber(delta)}
          </span>
        )}
        <Badge className="ml-auto border-success/40 text-success">live</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">Follower</p>
      {extras.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">{extras.join(" · ")}</p>}
    </TileFrame>
  );
}

/** Manuell gepflegter Kanal – mit „offline"-Hinweis, Stand-Datum, Inline-Edit. */
function OfflineTile({ channel }: { channel: Channel }) {
  return (
    <TileFrame kind={channel.kind} name={channel.name}>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-bold tabular-nums leading-none">{compactNumber(channel.followers ?? 0)}</p>
        <Badge className="ml-auto text-muted-foreground">offline</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">Follower · manuell</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-muted-foreground">Follower</span>
          <Input
            inputMode="numeric"
            defaultValue={channel.followers ?? ""}
            onBlur={(e) => channelsRepo.update(channel.id, { followers: Number(e.target.value.replace(/\./g, "")) || 0 })}
            className="h-8 text-right text-sm"
            aria-label="Follower aktualisieren"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-muted-foreground">Videos</span>
          <Input
            inputMode="numeric"
            defaultValue={channel.videos ?? ""}
            onBlur={(e) => channelsRepo.update(channel.id, { videos: Number(e.target.value.replace(/\./g, "")) || 0 })}
            className="h-8 text-right text-sm"
            aria-label="Videos aktualisieren"
          />
        </label>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Stand: {fmtDate(channel.updatedAt)}</span>
        <button onClick={() => channelsRepo.remove(channel.id)} className="text-muted-foreground hover:text-destructive" aria-label="Löschen">
          <Trash2 size={15} />
        </button>
      </div>
    </TileFrame>
  );
}

function NotConnectedTile({ kind, failed }: { kind: PlatformKind; failed: boolean }) {
  return (
    <TileFrame kind={kind}>
      {failed ? (
        <p className="mt-3 text-xs text-warning">Abruf fehlgeschlagen – Zugangsdaten prüfen.</p>
      ) : (
        <Badge className="mt-3 text-muted-foreground">noch nicht verbunden</Badge>
      )}
    </TileFrame>
  );
}
