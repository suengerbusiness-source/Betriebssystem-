import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { clients } from "@/data/repo";
import type { Client } from "@/data/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

/** Kundenverwaltung: anlegen, bearbeiten, löschen. */
export function ClientsModal({
  open,
  onClose,
  accountId,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
}) {
  const list = useLiveQuery(() => clients.list(accountId), [accountId]) ?? [];
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [vatId, setVatId] = useState("");

  function reset() {
    setEditing(null);
    setName("");
    setEmail("");
    setAddress("");
    setVatId("");
  }

  function startEdit(c: Client) {
    setEditing(c);
    setName(c.name);
    setEmail(c.email ?? "");
    setAddress(c.address ?? "");
    setVatId(c.vatId ?? "");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      vatId: vatId.trim() || undefined,
    };
    if (editing) await clients.update(editing.id, data);
    else await clients.create({ accountId, ...data });
    reset();
  }

  return (
    <Modal open={open} onClose={onClose} title="Kunden" description="Deine Auftraggeber für Rechnungen." className="max-w-lg">
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Label htmlFor="c-name">Name / Firma</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Muster GmbH" className="h-9" />
          </div>
          <div>
            <Label htmlFor="c-email">E-Mail</Label>
            <Input id="c-email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="c-vat">USt-IdNr.</Label>
            <Input id="c-vat" value={vatId} onChange={(e) => setVatId(e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="c-addr">Adresse</Label>
            <Input id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Straße, PLZ Ort" className="h-9" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editing && (
            <Button type="button" variant="ghost" onClick={reset}>
              Abbrechen
            </Button>
          )}
          <Button type="submit">
            <Plus size={16} /> {editing ? "Speichern" : "Kunde anlegen"}
          </Button>
        </div>
      </form>

      <div className="mt-4 border-t border-border pt-3">
        {list.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Users size={16} /> Noch keine Kunden.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {list
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <li key={c.id} className="group flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    {(c.email || c.address) && (
                      <p className="truncate text-xs text-muted-foreground">{[c.email, c.address].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(c)} aria-label="Bearbeiten">
                      <Pencil size={15} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirm("Kunde löschen?") && clients.remove(c.id)} aria-label="Löschen">
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
