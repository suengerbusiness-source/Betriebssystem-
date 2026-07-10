import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, IdCard, Save, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { profiles as profilesRepo } from "@/data/repo";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";

const numOr = (s: string): number | undefined => {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || !Number.isFinite(n) ? undefined : n;
};

export function ProfilePage() {
  const { account } = useAuth();
  const accId = account?.id;
  const profile = useLiveQuery(() => (accId ? profilesRepo.get(accId) : undefined), [accId]);

  const [about, setAbout] = useState("");
  const [goals, setGoals] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [sex, setSex] = useState<"" | "m" | "w" | "d">("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [focus, setFocus] = useState("");
  const [context, setContext] = useState("");
  const [saved, setSaved] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Einmal aus dem gespeicherten Profil vorbelegen.
  useEffect(() => {
    if (seeded || profile === undefined) return;
    setAbout(profile?.about ?? "");
    setGoals(profile?.goals ?? "");
    setBirthYear(profile?.birthYear ? String(profile.birthYear) : "");
    setSex((profile?.sex as "" | "m" | "w" | "d") ?? "");
    setHeightCm(profile?.heightCm ? String(profile.heightCm) : "");
    setWeightKg(profile?.weightKg ? String(profile.weightKg) : "");
    setFocus((profile?.focus ?? []).join(", "));
    setContext(profile?.context ?? "");
    setSeeded(true);
  }, [profile, seeded]);

  const year = numOr(birthYear);
  const age = year && year > 1900 ? new Date().getFullYear() - year : undefined;
  const h = numOr(heightCm);
  const w = numOr(weightKg);
  const bmi = h && w && h > 0 ? w / (h / 100) ** 2 : undefined;

  async function save() {
    if (!accId) return;
    await profilesRepo.upsert(accId, {
      about: about.trim() || undefined,
      goals: goals.trim() || undefined,
      birthYear: numOr(birthYear),
      sex: sex || undefined,
      heightCm: numOr(heightCm),
      weightKg: numOr(weightKg),
      focus: focus.split(",").map((t) => t.trim()).filter(Boolean),
      context: context.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        subtitle="Was die App über dich weiß – Grundlage für Auswertung, Prognose und KI-Analyse."
      />

      <Card>
        <CardHeader title="Über dich" subtitle="Damit die App (und jede KI) versteht, wer du bist und worauf es dir ankommt." icon={<IdCard size={18} />} />
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="p-about">Wer bist du?</Label>
            <Textarea id="p-about" value={about} onChange={(e) => { setAbout(e.target.value); setSaved(false); }} placeholder="Kurz: Was machst du, was ist deine Situation, was treibt dich an?" className="min-h-[70px]" />
          </div>
          <div>
            <Label htmlFor="p-goals">Deine Ziele</Label>
            <Textarea id="p-goals" value={goals} onChange={(e) => { setGoals(e.target.value); setSaved(false); }} placeholder="z. B. 100 Klimmzüge am Stück, weniger Social Media, mehr Umsatz…" className="min-h-[70px]" />
          </div>
          <div>
            <Label htmlFor="p-focus">Fokus-Bereiche (Komma-getrennt)</Label>
            <Input id="p-focus" value={focus} onChange={(e) => { setFocus(e.target.value); setSaved(false); }} placeholder="z. B. Kraft, Schlaf, Fokus, Ernährung" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Körper & Basisdaten" subtitle="Fließen in Trainings- und Gesundheits-Auswertungen ein." icon={<Sparkles size={18} />} />
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="p-year">Geburtsjahr</Label>
              <Input id="p-year" inputMode="numeric" value={birthYear} onChange={(e) => { setBirthYear(e.target.value); setSaved(false); }} placeholder="z. B. 2000" />
              {age !== undefined && <p className="mt-1 text-xs text-muted-foreground">{age} Jahre</p>}
            </div>
            <div>
              <Label htmlFor="p-sex">Geschlecht</Label>
              <Select id="p-sex" value={sex} onChange={(e) => { setSex(e.target.value as "" | "m" | "w" | "d"); setSaved(false); }}>
                <option value="">–</option>
                <option value="m">männlich</option>
                <option value="w">weiblich</option>
                <option value="d">divers</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="p-height">Größe (cm)</Label>
              <Input id="p-height" inputMode="numeric" value={heightCm} onChange={(e) => { setHeightCm(e.target.value); setSaved(false); }} placeholder="z. B. 180" />
            </div>
            <div>
              <Label htmlFor="p-weight">Gewicht (kg)</Label>
              <Input id="p-weight" inputMode="decimal" value={weightKg} onChange={(e) => { setWeightKg(e.target.value); setSaved(false); }} placeholder="z. B. 78" />
              {bmi !== undefined && <p className="mt-1 text-xs text-muted-foreground">BMI {bmi.toFixed(1)}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="p-context">Weiteres Vorwissen / Kontext</Label>
            <Textarea id="p-context" value={context} onChange={(e) => { setContext(e.target.value); setSaved(false); }} placeholder="Ernährung, Gesundheit, Schlafrhythmus, Besonderheiten – alles, was die Analyse einordnen hilft." className="min-h-[80px]" />
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && <span className="flex items-center gap-1.5 text-sm font-medium text-success"><Check size={16} /> Gespeichert</span>}
            <Button onClick={save} size="lg"><Save size={18} /> Profil speichern</Button>
          </div>
          <p className="text-xs text-muted-foreground">Alles bleibt lokal auf deinem Gerät. Es wird nur mitgeschickt, wenn du selbst den KI-Export nutzt.</p>
        </CardContent>
      </Card>
    </div>
  );
}
