import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Plus } from "lucide-react";
import { companyNotes } from "@/data/repo";
import type { CompanyNote } from "@/data/types";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Freie Notizen/Aufzeichnungen eines Unternehmens. Bewusst extrem simpel:
 * Überschrift + Freitext – einfach drauflosschreiben. Die Kachel-Liste dient
 * als Zusammenfassung, das Modal als „Dokument" zum Schreiben.
 */
export function NotesTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const all = useLiveQuery(() => companyNotes.list(accountId), [accountId]) ?? [];
  const list = all.filter((n) => n.companyId === companyId).sort((a, b) => b.updatedAt - a.updatedAt);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyNote | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(n: CompanyNote) {
    setEditing(n);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus size={18} /> Neue Notiz</Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="Noch keine Notizen"
          description="Schreib einfach drauf los – Pläne, Ideen, Gedanken. Jede Notiz hat eine Überschrift und freien Text."
          action={<Button onClick={openNew}><Plus size={18} /> Erste Notiz</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((n) => (
            <button key={n.id} onClick={() => openEdit(n)} className="text-left">
              <Card className="h-full p-4 transition-colors hover:border-primary/40">
                <h3 className="font-semibold tracking-tight">{n.title || "Ohne Titel"}</h3>
                {n.body && <p className="mt-1.5 line-clamp-5 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-3 text-xs text-muted-foreground">{formatDate(new Date(n.updatedAt), "d. MMM yyyy")}</p>
              </Card>
            </button>
          ))}
        </div>
      )}

      <NoteModal open={open} onClose={() => setOpen(false)} accountId={accountId} companyId={companyId} editing={editing} />
    </div>
  );
}

function NoteModal({
  open,
  onClose,
  accountId,
  companyId,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  companyId: string;
  editing: CompanyNote | null;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setBody(editing?.body ?? "");
  }, [open, editing]);

  async function save() {
    if (!title.trim() && !body.trim()) {
      onClose();
      return;
    }
    const payload = { title: title.trim() || "Ohne Titel", body: body.trim() || undefined };
    if (editing) {
      await companyNotes.update(editing.id, payload);
    } else {
      await companyNotes.create({ accountId, companyId, ...payload });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Notiz" : "Neue Notiz"} className="max-w-2xl">
      <div className="space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Überschrift"
          className="h-11 text-lg font-semibold"
          autoFocus
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Schreib einfach drauf los…"
          className="min-h-[340px] leading-relaxed"
        />
        <div className="flex items-center justify-between gap-2 pt-1">
          {editing ? (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => { if (confirm("Diese Notiz löschen?")) { companyNotes.remove(editing.id); onClose(); } }}
            >
              Löschen
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
            <Button onClick={save}>Speichern</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
