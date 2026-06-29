import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink, Plus, Radio, Trash2 } from "lucide-react";
import { channels as channelsRepo } from "@/data/repo";
import { CHANNEL_STATUS, type ChannelStatus, type PlatformKind } from "@/data/types";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PLATFORM_LIST, platformOf } from "./company.platforms";
import { compactNumber } from "./company.utils";
import { LiveStatsCard } from "./LiveStatsCard";
import { ChannelAnalysis, NoLiveHint, TotalsCard } from "./ChannelInsights";
import { useLiveStats } from "./useLiveStats";

const fmtDate = (ms: number) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(ms);

export function ChannelsTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const live = useLiveStats();
  const all = useLiveQuery(() => channelsRepo.list(accountId), [accountId]) ?? [];
  const list = all
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => Number(a.status === "paused") - Number(b.status === "paused") || (b.followers ?? 0) - (a.followers ?? 0));

  const anyLive = live.stats ? Object.values(live.stats.platforms).some((p) => p?.ok) : false;

  const [kind, setKind] = useState<PlatformKind>("tiktok");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [followers, setFollowers] = useState("");

  async function add() {
    if (!name.trim()) return;
    await channelsRepo.create({
      accountId,
      companyId,
      kind,
      name: name.trim(),
      handle: handle.trim() || undefined,
      url: url.trim() || undefined,
      followers: followers ? Number(followers.replace(/\./g, "")) || 0 : undefined,
      status: "active",
      order: Date.now(),
    });
    setName("");
    setHandle("");
    setUrl("");
    setFollowers("");
  }

  return (
    <div className="space-y-4">
      {/* 1) Gesamtübersicht – über den Live-Daten */}
      {anyLive ? <TotalsCard history={live.history} /> : live.loaded ? <NoLiveHint /> : null}

      {/* 2) Live-Daten (automatisch, alle 12 h) */}
      <LiveStatsCard stats={live.stats} deltas={live.deltas} loaded={live.loaded} />

      {/* 3) Kanal anlegen */}
      <Card>
        <CardHeader title="Kanal hinzufügen" subtitle="TikTok, YouTube, Instagram, Shop, Affiliate – alle Standbeine." icon={<Radio size={18} />} />
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-1">
              <Label htmlFor="ch-kind">Plattform</Label>
              <Select id="ch-kind" value={kind} onChange={(e) => setKind(e.target.value as PlatformKind)} className="h-9">
                {PLATFORM_LIST.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="ch-name">Name</Label>
              <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kanalname" className="h-9" onKeyDown={(e) => e.key === "Enter" && add()} />
            </div>
            <div>
              <Label htmlFor="ch-handle">Handle</Label>
              <Input id="ch-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@…" className="h-9" />
            </div>
            <div>
              <Label htmlFor="ch-foll">Follower</Label>
              <Input id="ch-foll" inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div className="flex items-end">
              <Button onClick={add} className="h-9 w-full"><Plus size={16} /> Kanal</Button>
            </div>
          </div>
          <div className="mt-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link zum Kanal (optional)" className="h-9" />
          </div>
        </CardContent>
      </Card>

      {/* 4) Manuell gepflegte Kanäle – mit Stand-Datum */}
      {list.length === 0 ? (
        <EmptyState icon={<Radio size={22} />} title="Noch keine Kanäle" description="Trag deine Plattformen ein – TikTok, YouTube, Instagram, Facebook und später Shop & Affiliate." />
      ) : (
        <Card>
          <CardHeader
            title="Manuell gepflegt"
            subtitle="Selbst eingetragene Zahlen. Das Stand-Datum zeigt, wann du sie zuletzt aktualisiert hast."
            icon={<Radio size={18} />}
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => {
                const p = platformOf(c.kind);
                const Icon = p.icon;
                return (
                  <div key={c.id} className="group rounded-xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: p.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">{c.name}</p>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary" aria-label="Öffnen">
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.label}{c.handle ? ` · ${c.handle}` : ""}</p>
                      </div>
                      <button onClick={() => channelsRepo.remove(c.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Löschen">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-2xl font-bold tabular-nums leading-none">{compactNumber(c.followers ?? 0)}</p>
                        <p className="text-[11px] text-muted-foreground">Follower</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          inputMode="numeric"
                          defaultValue={c.followers ?? ""}
                          onBlur={(e) => channelsRepo.update(c.id, { followers: Number(e.target.value.replace(/\./g, "")) || 0 })}
                          className="h-8 w-24 text-right text-sm"
                          aria-label="Follower aktualisieren"
                        />
                        <Select
                          value={c.status}
                          onChange={(e) => channelsRepo.update(c.id, { status: e.target.value as ChannelStatus })}
                          className="h-8 w-auto text-xs"
                        >
                          {CHANNEL_STATUS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Stand: {fmtDate(c.updatedAt)}</span>
                      {c.status !== "active" && (
                        <Badge className={cn(c.status === "planned" ? "border-primary/40 text-primary" : "text-muted-foreground")}>
                          {CHANNEL_STATUS.find((s) => s.value === c.status)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5) Tiefer drunter: detaillierte Analyse je Live-Kanal */}
      <ChannelAnalysis stats={live.stats} history={live.history} channels={list} />
    </div>
  );
}
