import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Cake, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { birthdays as birthdaysRepo } from "@/data/repo";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export function BirthdayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { account } = useAuth();
  const accId = account?.id;
  const list = useLiveQuery(() => (accId ? birthdaysRepo.list(accId) : []), [accId]) ?? [];
  const sorted = [...list].sort((a, b) => a.month - b.month || a.day - b.day);

  const [name, setName] = useState("");
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState("");

  async function add() {
    if (!accId || !name.trim()) return;
    const y = year.trim() ? Number(year.trim()) : undefined;
    await birthdaysRepo.create({
      accountId: accId,
      name: name.trim(),
      day,
      month,
      year: y && y > 1900 && y <= new Date().getFullYear() ? y : undefined,
    });
    setName("");
    setYear("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Geburtstage" description="Werden jedes Jahr automatisch im Kalender angezeigt.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-2">
            <Label htmlFor="b-name">Name</Label>
            <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Mama" className="h-9" onKeyDown={(e) => e.key === "Enter" && add()} />
          </div>
          <div>
            <Label htmlFor="b-day">Tag</Label>
            <Select id="b-day" value={day} onChange={(e) => setDay(Number(e.target.value))} className="h-9">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="b-month">Monat</Label>
            <Select id="b-month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-9">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="b-year">Jahr (optional)</Label>
            <Input id="b-year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1990" className="h-9" />
          </div>
          <div className="col-span-2 flex items-end sm:col-span-1">
            <Button onClick={add} className="h-9 w-full"><Plus size={16} /> Hinzufügen</Button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Noch keine Geburtstage eingetragen.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {sorted.map((b) => (
              <li key={b.id} className="group flex items-center gap-3 px-3 py-2">
                <Cake size={16} className="shrink-0 text-pink-500" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{b.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{b.day}. {MONTHS[b.month - 1]}{b.year ? ` ${b.year}` : ""}</span>
                <button onClick={() => birthdaysRepo.remove(b.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Löschen">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
