import { useEffect, useState } from "react";
import { experiments as experimentsRepo } from "@/data/repo";
import type { Experiment } from "@/data/types";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label, Textarea } from "@/components/ui/Input";

/** Detailliertes Debrief nach einem Experiment – Grundlage für belastbare Schlüsse. */
export function ExperimentDebriefModal({ open, experiment, onClose }: { open: boolean; experiment: Experiment | null; onClose: () => void }) {
  const [overall, setOverall] = useState(0);
  const [adherence, setAdherence] = useState(0);
  const [feeling, setFeeling] = useState("");
  const [changes, setChanges] = useState("");
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    const d = experiment?.debrief;
    setOverall(d?.overall ?? 0);
    setAdherence(d?.adherence ?? 0);
    setFeeling(d?.feeling ?? "");
    setChanges(d?.changes ?? "");
    setWouldRepeat(d?.wouldRepeat ?? null);
  }, [open, experiment]);

  async function save() {
    if (!experiment) return;
    await experimentsRepo.complete(experiment.id, {
      overall: overall || undefined,
      adherence: adherence || undefined,
      feeling: feeling.trim() || undefined,
      changes: changes.trim() || undefined,
      wouldRepeat: wouldRepeat ?? undefined,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={experiment ? `Auswertung: ${experiment.title}` : "Auswertung"}>
      <div className="space-y-5">
        <Scale label="Wie war es insgesamt?" value={overall} onChange={setOverall} lowLabel="schwer" highLabel="top" />
        <Scale label="Wie konsequent durchgezogen?" value={adherence} onChange={setAdherence} lowLabel="kaum" highLabel="voll" />
        <div>
          <Label htmlFor="exp-feeling">Wie hast du dich gefühlt?</Label>
          <Textarea id="exp-feeling" value={feeling} onChange={(e) => setFeeling(e.target.value)} placeholder="Körperlich & mental – so detailliert wie möglich." className="min-h-[70px]" />
        </div>
        <div>
          <Label htmlFor="exp-changes">Was hat sich verändert?</Label>
          <Textarea id="exp-changes" value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="Schlaf, Energie, Stimmung, Gewohnheiten, Umfeld …" className="min-h-[70px]" />
        </div>
        <div>
          <Label>Beibehalten / wiederholen?</Label>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: true, l: "Ja, lohnt sich" }, { v: false, l: "Nein" }].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => setWouldRepeat(o.v)}
                className={cn("h-10 rounded-lg border text-sm font-medium transition-all", wouldRepeat === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50")}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save}>Auswertung speichern</Button>
        </div>
      </div>
    </Modal>
  );
}

function Scale({ label, value, onChange, lowLabel, highLabel }: { label: string; value: number; onChange: (v: number) => void; lowLabel: string; highLabel: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn("h-9 rounded-md border text-sm font-semibold tabular-nums transition-all", value === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50")}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{lowLabel}</span><span>{highLabel}</span></div>
    </div>
  );
}
