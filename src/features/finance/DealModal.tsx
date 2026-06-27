import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { deals } from "@/data/repo";
import { DEAL_STAGES, type Deal, type DealStage } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";

export function DealModal({
  open,
  onClose,
  accountId,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  editing?: Deal | null;
}) {
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<DealStage>("idea");
  const [value, setValue] = useState("");
  const [contact, setContact] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setTitle(editing.title);
      setStage(editing.stage);
      setValue(String(editing.value || ""));
      setContact(editing.contact ?? "");
      setNextStep(editing.nextStep ?? "");
      setNote(editing.note ?? "");
    } else {
      setTitle("");
      setStage("idea");
      setValue("");
      setContact("");
      setNextStep("");
      setNote("");
    }
  }, [open, editing]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const v = Number(value.replace(",", ".")) || 0;
    const payload = {
      title: title.trim(),
      stage,
      value: v,
      contact: contact.trim() || undefined,
      nextStep: nextStep.trim() || undefined,
      note: note.trim() || undefined,
    };
    if (editing) await deals.update(editing.id, payload);
    else await deals.create({ accountId, order: Date.now(), ...payload });
    onClose();
  }

  async function remove() {
    if (editing && confirm("Diesen Deal löschen?")) {
      await deals.remove(editing.id);
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Deal bearbeiten" : "Neuer Deal"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="d-title">Titel</Label>
          <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="z. B. Kooperation mit …" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="d-stage">Phase</Label>
            <Select id="d-stage" value={stage} onChange={(e) => setStage(e.target.value as DealStage)}>
              {DEAL_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="d-value">Erwarteter Wert (€)</Label>
            <Input id="d-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <Label htmlFor="d-contact">Kontakt (optional)</Label>
          <Input id="d-contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Name / Firma" />
        </div>
        <div>
          <Label htmlFor="d-next">Nächster Schritt (optional)</Label>
          <Input id="d-next" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="z. B. Angebot schicken" />
        </div>
        <div>
          <Label htmlFor="d-note">Notiz (optional)</Label>
          <Textarea id="d-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {editing ? (
            <Button type="button" variant="ghost" onClick={remove} className="text-destructive">
              <Trash2 size={16} /> Löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">{editing ? "Speichern" : "Anlegen"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
