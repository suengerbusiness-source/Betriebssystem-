import { useEffect, useState, type FormEvent } from "react";
import { companies } from "@/data/repo";
import {
  BUSINESS_TYPES,
  COMPANY_STATUS,
  EVENT_COLORS,
  type BusinessType,
  type Company,
  type CompanyStatus,
  type ColorToken,
} from "@/data/types";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";

/** Anlegen/Bearbeiten eines Unternehmens. */
export function CompanyModal({
  open,
  onClose,
  accountId,
  editing,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  editing?: Company | null;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [type, setType] = useState<BusinessType>("social");
  const [niche, setNiche] = useState("");
  const [status, setStatus] = useState<CompanyStatus>("active");
  const [color, setColor] = useState<ColorToken>("violet");
  const [vision, setVision] = useState("");
  const [description, setDescription] = useState("");
  const [revenueGoal, setRevenueGoal] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setTagline(editing.tagline ?? "");
      setType(editing.type);
      setNiche(editing.niche ?? "");
      setStatus(editing.status);
      setColor(editing.color);
      setVision(editing.vision ?? "");
      setDescription(editing.description ?? "");
      setRevenueGoal(editing.revenueGoal ? String(editing.revenueGoal) : "");
    } else {
      setName("");
      setTagline("");
      setType("social");
      setNiche("");
      setStatus("active");
      setColor("violet");
      setVision("");
      setDescription("");
      setRevenueGoal("");
    }
    setError(null);
  }, [open, editing]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    const goal = revenueGoal ? Number(revenueGoal.replace(",", ".")) : undefined;
    const payload = {
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      type,
      niche: niche.trim() || undefined,
      status,
      color,
      vision: vision.trim() || undefined,
      description: description.trim() || undefined,
      revenueGoal: goal && goal > 0 ? goal : undefined,
    };
    if (editing) {
      await companies.update(editing.id, payload);
    } else {
      const created = await companies.create({ accountId, ...payload });
      onCreated?.(created.id);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Unternehmen bearbeiten" : "Neues Unternehmen"} description="Alle Eckdaten deines Gewerbes an einem Ort.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="co-name">Name</Label>
          <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Meine Marke" autoFocus />
        </div>
        <div>
          <Label htmlFor="co-tag">Claim / Positionierung (optional)</Label>
          <Input id="co-tag" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="In einem Satz: wofür stehst du?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="co-type">Art</Label>
            <Select id="co-type" value={type} onChange={(e) => setType(e.target.value as BusinessType)}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="co-status">Status</Label>
            <Select id="co-status" value={status} onChange={(e) => setStatus(e.target.value as CompanyStatus)}>
              {COMPANY_STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="co-niche">Nische / Thema</Label>
            <Input id="co-niche" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="z. B. Fitness, Tech" />
          </div>
          <div>
            <Label htmlFor="co-goal">Umsatzziel / Monat (€)</Label>
            <Input id="co-goal" inputMode="decimal" value={revenueGoal} onChange={(e) => setRevenueGoal(e.target.value)} placeholder="z. B. 5000" />
          </div>
        </div>
        <div>
          <Label htmlFor="co-vision">Vision (optional)</Label>
          <Textarea id="co-vision" value={vision} onChange={(e) => setVision(e.target.value)} placeholder="Wo soll das Unternehmen in 3–5 Jahren stehen?" className="min-h-[60px]" />
        </div>
        <div>
          <Label htmlFor="co-desc">Beschreibung (optional)</Label>
          <Textarea id="co-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Worum geht es genau?" className="min-h-[60px]" />
        </div>
        <div>
          <Label>Farbe</Label>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.token}
                type="button"
                onClick={() => setColor(c.token)}
                className={cn("h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-card transition", color === c.token ? "ring-foreground" : "ring-transparent")}
                style={{ background: c.hex }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit">{editing ? "Speichern" : "Anlegen"}</Button>
        </div>
      </form>
    </Modal>
  );
}
