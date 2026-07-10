import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseISO } from "date-fns";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Flame, NotebookPen, Save, Smartphone, Tablet, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { activity as activityRepo, checkins as ckRepo, screenTime as stRepo } from "@/data/repo";
import { wellbeingScore } from "@/features/journal/checkin.utils";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMinutes, getSocialLimit, setSocialLimit, todayKey, totalScreen, underLimitStreak } from "./screenTime.utils";

const numOr = (s: string) => (s.trim() === "" ? undefined : Math.max(0, Math.round(Number(s.replace(",", ".")))) || 0);
const RANGES = [30, 90, 180] as const;

export function ScreenTimePage() {
  const { account } = useAuth();
  const accId = account?.id;
  const today = todayKey();
  const logs = useLiveQuery(() => (accId ? stRepo.list(accId) : []), [accId]) ?? [];
  const checkins = useLiveQuery(() => (accId ? ckRepo.list(accId) : []), [accId]) ?? [];
  const todayLog = logs.find((l) => l.date === today);

  // Score je Tag aus den Tagebuch-Berichten (0–100) – die Verknüpfung.
  const scoreByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of checkins) {
      const s = wellbeingScore(c.metrics);
      if (s != null) m.set(c.date, s);
    }
    return m;
  }, [checkins]);

  const [date, setDate] = useState(today);
  const [iphone, setIphone] = useState("");
  const [ipad, setIpad] = useState("");
  const [social, setSocial] = useState("");
  const [editedFor, setEditedFor] = useState<string | null>(null);
  const [limit, setLimit] = useState(getSocialLimit());
  const [saved, setSaved] = useState(false);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);

  // Felder mit dem Eintrag des gewählten Tages vorbelegen (bei Datumswechsel).
  if (editedFor !== date) {
    const l = logs.find((x) => x.date === date);
    setEditedFor(date);
    setIphone(l?.iphoneMin != null ? String(l.iphoneMin) : "");
    setIpad(l?.ipadMin != null ? String(l.ipadMin) : "");
    setSocial(l?.socialMin != null ? String(l.socialMin) : "");
  }

  const streak = useMemo(() => underLimitStreak(logs, limit), [logs, limit]);
  const chart = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const out: { date: string; social: number; has: boolean }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const l = byDate.get(key);
      out.push({ date: key, social: l?.socialMin ?? 0, has: l?.socialMin != null });
    }
    return out;
  }, [logs, range]);

  // Kombinierte Tages-Liste: Bildschirmzeit + Tagesbericht-Score, neueste zuerst.
  const days = useMemo(() => {
    const keys = new Set<string>([...logs.map((l) => l.date), ...scoreByDate.keys()]);
    return [...keys]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 60)
      .map((d) => ({ date: d, log: logs.find((l) => l.date === d), score: scoreByDate.get(d) }));
  }, [logs, scoreByDate]);

  // Zusammenhang Social-Zeit ↔ Wohlbefinden (Tage über vs. unter Limit).
  const link = useMemo(() => {
    const pairs = logs
      .filter((l) => l.socialMin != null && scoreByDate.has(l.date))
      .map((l) => ({ social: l.socialMin as number, score: scoreByDate.get(l.date)! }));
    const over = pairs.filter((p) => p.social > limit).map((p) => p.score);
    const under = pairs.filter((p) => p.social <= limit).map((p) => p.score);
    if (over.length < 3 || under.length < 3) return { n: pairs.length, ready: false as const };
    const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    return { ready: true as const, n: pairs.length, over: mean(over), under: mean(under), delta: mean(under) - mean(over) };
  }, [logs, scoreByDate, limit]);

  async function save() {
    if (!accId) return;
    await stRepo.upsert(accId, date, { iphoneMin: numOr(iphone), ipadMin: numOr(ipad), socialMin: numOr(social) });
    void activityRepo.log(accId, "screentime_save", { date });
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
  const editingPast = date !== today;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bildschirmzeit"
        subtitle="Trag ein, was iOS dir zeigt (Einstellungen → Bildschirmzeit) – auch für vergangene Tage. Verknüpft mit deinen Tagesberichten."
        actions={streak > 0 ? <Badge className="gap-1.5 border-success/40 px-3 py-1 text-success"><Flame size={14} /> {streak} {streak === 1 ? "Tag" : "Tage"} unter Limit</Badge> : undefined}
      />

      {/* Eintragen – beliebiges Datum */}
      <Card>
        <CardHeader title="Bildschirmzeit eintragen" subtitle="Datum wählen (auch vergangene Monate) und Minuten eintragen." icon={<Save size={18} />} />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <Label className="flex items-center gap-1.5"><CalendarDays size={15} /> Tag</Label>
              <Input type="date" max={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9" />
            </div>
            <Field icon={<Smartphone size={15} />} label="iPhone (Min)" value={iphone} onChange={setIphone} />
            <Field icon={<Tablet size={15} />} label="iPad (Min)" value={ipad} onChange={setIpad} />
            <Field icon={<Target size={15} />} label="Social Media (Min)" value={social} onChange={setSocial} highlight />
            <div className="flex items-end">
              <Button onClick={save} className="h-9 w-full"><Save size={16} /> {saved ? "Gespeichert ✓" : "Speichern"}</Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {editingPast && (
              <Badge className="border-primary/40 text-primary">Du bearbeitest {formatDate(parseISO(date), "EEE, d. MMM yyyy")}</Badge>
            )}
            {scoreByDate.has(date) && (
              <Badge className="gap-1 text-muted-foreground"><NotebookPen size={12} /> Tagesbericht: Score {scoreByDate.get(date)}</Badge>
            )}
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

      {/* Verknüpfung: Social-Zeit ↔ Wohlbefinden */}
      {link.ready && (
        <Card>
          <CardHeader title="Bildschirmzeit ↔ Tagesbericht" subtitle="Wie deine Social-Zeit mit deinem Wohlbefinden zusammenhängt." icon={<NotebookPen size={18} />} />
          <CardContent>
            <p className="text-sm leading-relaxed">
              An Tagen <span className="font-semibold text-success">unter</span> deinem Limit war dein Wohlbefinden im Schnitt{" "}
              <span className="font-semibold">{link.under}</span>, an Tagen{" "}
              <span className="font-semibold text-destructive">über</span> Limit nur{" "}
              <span className="font-semibold">{link.over}</span>
              {link.delta !== 0 && (
                <> – ein Unterschied von <span className={cn("font-semibold", link.delta > 0 ? "text-success" : "text-destructive")}>{link.delta > 0 ? "+" : ""}{link.delta}</span> Punkten</>
              )}
              . <span className="text-muted-foreground">(aus {link.n} Tagen mit beidem)</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Verlauf */}
      <Card>
        <CardHeader
          title="Verlauf"
          subtitle="Social-Media-Minuten je Tag · rote Linie = Limit."
          icon={<Target size={18} />}
          action={
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)} className={cn("rounded-md px-2 py-1 text-xs font-medium transition-colors", range === r ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  {r}T
                </button>
              ))}
            </div>
          }
        />
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

      {/* Tage & Tagesbericht */}
      <Card>
        <CardHeader title="Tage & Tagesbericht" subtitle="Bildschirmzeit neben dem Tagebuch-Score – tippe Bearbeiten, um einen Tag nachzutragen." icon={<CalendarDays size={18} />} />
        <CardContent>
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Einträge. Trag oben deinen ersten Tag ein.</p>
          ) : (
            <ul className="divide-y divide-border">
              {days.map(({ date: d, log, score }) => {
                const soc = log?.socialMin;
                const over = soc != null && soc > limit;
                return (
                  <li key={d} className="flex items-center gap-3 py-2.5">
                    <span className="w-28 shrink-0 text-sm font-medium">{formatDate(parseISO(d), "EEE, d. MMM")}</span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Gesamt <span className="font-medium text-foreground">{log ? formatMinutes(totalScreen(log)) : "—"}</span></span>
                      <span className={cn(over ? "text-destructive" : soc != null ? "text-success" : "")}>
                        Social <span className="font-semibold">{soc != null ? formatMinutes(soc) : "—"}</span>
                      </span>
                      {score != null ? (
                        <span className="flex items-center gap-1"><NotebookPen size={12} /> Tagesbericht <span className="font-semibold text-foreground">{score}</span></span>
                      ) : (
                        <span className="text-muted-foreground/60">kein Tagesbericht</span>
                      )}
                    </div>
                    <button
                      onClick={() => { setDate(d); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      Bearbeiten
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
