import { useEffect, useRef, useState, type FormEvent } from "react";
import { Image as ImageIcon, Quote, Type } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { visionItems } from "@/data/repo";
import { EVENT_COLORS, type ColorToken, type VisionItem, type VisionKind } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const KINDS: { value: VisionKind; label: string; icon: typeof Type }[] = [
  { value: "text", label: "Karte", icon: Type },
  { value: "quote", label: "Affirmation", icon: Quote },
  { value: "image", label: "Bild", icon: ImageIcon },
];

export function VisionModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: VisionItem | null;
}) {
  const { account } = useAuth();
  const [kind, setKind] = useState<VisionKind>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<ColorToken>("violet");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setKind(editing.kind);
      setTitle(editing.title ?? "");
      setContent(editing.content ?? "");
      setColor(editing.color);
    } else {
      setKind("text");
      setTitle("");
      setContent("");
      setColor("violet");
    }
  }, [open, editing]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setContent(reader.result as string); // Data-URL -> local-first
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (kind === "image" && !content) {
      setError("Bitte ein Bild auswählen.");
      return;
    }
    if (kind !== "image" && !content.trim() && !title.trim()) {
      setError("Bitte einen Text eingeben.");
      return;
    }
    if (editing) {
      await visionItems.update(editing.id, { kind, title: title.trim() || undefined, content, color });
    } else {
      // Leicht zufällige Startposition, damit neue Karten nicht stapeln.
      await visionItems.create({
        accountId: account.id,
        kind,
        title: title.trim() || undefined,
        content,
        color,
        x: 24 + Math.round(Math.random() * 120),
        y: 24 + Math.round(Math.random() * 80),
        w: kind === "image" ? 220 : 200,
        h: kind === "image" ? 180 : 140,
      });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Element bearbeiten" : "Neues Element"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md border p-3 text-sm transition-colors",
                kind === value ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {kind === "image" ? (
          <div>
            <Label>Bild</Label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
              {content ? "Bild ändern" : "Bild auswählen"}
            </Button>
            {content && (
              <img src={content} alt="" className="mt-3 max-h-40 w-full rounded-md object-cover" />
            )}
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="v-title">Titel (optional)</Label>
              <Input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mein Ziel" />
            </div>
            <div>
              <Label htmlFor="v-content">{kind === "quote" ? "Affirmation" : "Text"}</Label>
              <Textarea
                id="v-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={kind === "quote" ? "Ich bin…" : "Was möchtest du manifestieren?"}
              />
            </div>
          </>
        )}

        <div>
          <Label>Akzentfarbe</Label>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.token}
                type="button"
                onClick={() => setColor(c.token)}
                aria-label={c.label}
                className={cn(
                  "h-7 w-7 rounded-full transition-all",
                  color === c.token ? "ring-2 ring-ring ring-offset-2 ring-offset-card scale-110" : "",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">{editing ? "Speichern" : "Hinzufügen"}</Button>
        </div>
      </form>
    </Modal>
  );
}
