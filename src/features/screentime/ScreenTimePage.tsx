import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseISO } from "date-fns";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, Save, Smartphone, Tablet, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { screenTime as stRepo } from "@/data/repo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMinutes, getSocialLimit, setSocialLimit, todayKey, totalScreen, underLimitStreak } from "./screenTime.utils";

const numOr = (s: string) => (s.trim() === "" ? undefined : Math.max(0, Math.round(Number(s.replace(",", ".")))) || 0);

export function ScreenTimePage() {
  const { account } = useAuth();
  const accId = account?.id;
  const today = todayKey();
  const logs = useLiveQuery(() => (accId ? stRepo.list(accId) : []), [accId]) ?? [];
  const todayLog = logs.find((l) => l.date === today);

  const [iphone, setIphone] = useState("");
  const [ipad, setIpad] = useState("");
  const [social, setSocial] = useState("");
  const [editedFor, setEditedFor] = useState<string | null>(null);
  const [limit, setLimit] = useState(getSocialLimit());
  const [saved, setSaved] = useState(false);

  // Felder einmal mit dem heutigen Eintrag vorbelegen.
  if (editedFor !== today) {
    setEditedFor(today);
    setIphone(todayLog?.iphoneMin != null ? String(todayLog.iphoneMin) : "");
    setIpad(todayLog?.ipadMin != null ? String(todayLog.ipadMin) : "");
    setSocial(todayLog?.socialMin != null ? String(todayLog.socialMin) : "");
  }

  const streak = useMemo(() => underLimitStreak(logs, limit), [logs, limit]);
  const chart = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const out: { date: string; social: number; has: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const l = byDate.get(key);
      out.push({ date: key, social: l?.socialMin ?? 0, has: l?.socialMin != null });
    }
    return out;
  }, [logs]);

  async function save() {
    if (!accId) return;
    await stRepo.upsert(accId, today, { iphoneMin: numOr(iphone), ipadMin: numOr(ipad), socialMin: numOr(social) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function saveLimit(v: number) {
    setLimit(v);
    setSocialLimit(v);
  }

  const socialToday = todayLog?.socialMin;
  const overLimit = socialToday != null && socialToday > limit;
  const pct = socialToday != null ? Math.min(Math.round((socialToday / limit) * 100), 100) : 0;
  const coach =
    socialToday == null
      ? "Trag deine Bildschirmzeit ein – ehrlich. Nur was du misst, kannst du senken."
      : overLimit
        ? `${formatMinutes(socialToday - limit)} über dem Limit. Morgen besser. Leg das Handy weg.`
        : `Unter Limit – stark. ${formatMinutes(limit - socialToday)} Puffer. Diszipliniert bleiben.`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bildschirmzeit"
        subtitle="Trag täglich kurz ein, was iOS dir zeigt (Einstellungen → Bildschirmzeit). Weniger Konsum, mehr Fokus."
        actions={streak > 0 ? <Badge className="gap-1.5 border-success/40 px-3 py-1 text-success"><Flame size={14} /> {streak} {streak === 1 ? "Tag" : "Tage"} unter Limit</Badge> : undefined}
      />

      {/* Heute eintragen */}
      <Card>
        <CardHeader title="Heute eintragen" subtitle="Werte in Minuten – aus der iOS-Bildschirmzeit ablesen." icon={<Save size={18} />} />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field icon={<Smartphone size={15} />} label="iPhone (Min)" value={iphone} onChange={setIphone} />
            <Field icon={<Tablet size={15} />} label="iPad (Min)" value={ipad} onChange={setIpad} />
            <Field icon={<Target size={15} />} label="Social Media (Min)" value={social} onChange={setSocial} highlight />
            <div className="flex items-end">
              <Button onClick={save} className="h-9 w-full"><Save size={16} /> {saved ? "Gespeichert ✓" : "Speichern"}</Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tipp: In iOS unter „Bildschirmzeit" siehst du Gesamtzeit + Zeit je App. „Social Media" = Summe von Instagram, TikTok, Facebook & Co.
          </p>
        </CardContent>
      </Card>

      {/* Status heute */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Bildschirmzeit heute</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{todayLog ? formatMinutes(totalScreen(todayLog)) : "—"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">iPhone + iPad</p>
        </Card>
        <Card className="p-5 sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Social Media heute</p>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target size={13} /> Limit
              <Input inputMode="numeric" value={String(limit)} onChange={(e) => saveLimit(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} className="h-7 w-16 text-right text-xs" aria-label="Limit (Min)" />
              min
            </span>
          </div>
          <p className={cn("text-2xl font-bold tabular-nums", overLimit ? "text-destructive" : socialToday != null ? "text-success" : "")}>
            {socialToday != null ? formatMinutes(socialToday) : "—"}
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className={cn("h-full rounded-full transition-all", overLimit ? "bg-destructive" : "bg-success")} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{coach}</p>
        </Card>
      </div>

      {/* Verlauf */}
      <Card>
        <CardHeader title="Verlauf (30 Tage)" subtitle="Social-Media-Minuten je Tag · rote Linie = Limit." icon={<Target size={18} />} />
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(parseISO(d), "d.M.")} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(d) => formatDate(parseISO(d as string), "EEE, d. MMM")}
                  formatter={(v: number) => [formatMinutes(v), "Social"]}
                />
                <ReferenceLine y={limit} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                <Bar dataKey="social" radius={[4, 4, 0, 0]}>
                  {chart.map((d, i) => (
                    <Cell key={i} fill={!d.has ? "hsl(var(--muted))" : d.social > limit ? "hsl(var(--destructive))" : "hsl(var(--success))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ icon, label, value, onChange, highlight }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; highlight?: boolean }) {
  return (
    <div>
      <Label className="flex items-center gap-1.5">{icon} {label}</Label>
      <Input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className={cn("h-9", highlight && "border-primary/40")} />
      {value.trim() !== "" && <p className="mt-0.5 text-[11px] text-muted-foreground">= {formatMinutes(Number(value.replace(",", ".")) || 0)}</p>}
    </div>
  );
}
