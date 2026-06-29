import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Radio } from "lucide-react";
import { channels as channelsRepo } from "@/data/repo";
import { type PlatformKind } from "@/data/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { PLATFORM_LIST } from "./company.platforms";
import { LiveStatsCard } from "./LiveStatsCard";
import { ChannelAnalysis, NoLiveHint, TotalsCard } from "./ChannelInsights";
import { useLiveStats } from "./useLiveStats";

export function ChannelsTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const live = useLiveStats();
  const all = useLiveQuery(() => channelsRepo.list(accountId), [accountId]) ?? [];
  const list = all
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => Number(a.status === "paused") - Number(b.status === "paused") || (b.followers ?? 0) - (a.followers ?? 0));

  const anyLive = live.stats ? Object.values(live.stats.platforms).some((p) => p?.ok) : false;
  const showTotals = anyLive || list.length > 0;

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
      {/* 1) Gesamtübersicht – über den Live-Daten (inkl. manueller Kanäle) */}
      {showTotals ? <TotalsCard history={live.history} stats={live.stats} channels={list} /> : live.loaded ? <NoLiveHint /> : null}

      {/* 2) Live-Daten (automatisch) + manuelle Kanäle als „offline" */}
      <LiveStatsCard stats={live.stats} deltas={live.deltas} loaded={live.loaded} channels={list} />

      {/* 3) Kanal anlegen (manuelle Pflege) */}
      <Card>
        <CardHeader title="Kanal hinzufügen" subtitle="Manuell gepflegte Kanäle erscheinen oben als 'offline' und zählen in der Gesamtsumme mit." icon={<Radio size={18} />} />
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

      {/* 4) Tiefer drunter: detaillierte Analyse je Live-Kanal */}
      <ChannelAnalysis stats={live.stats} history={live.history} channels={list} />
    </div>
  );
}
