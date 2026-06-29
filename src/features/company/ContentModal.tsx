import { useEffect, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { contentItems, channels as channelsRepo } from "@/data/repo";
import {
  CONTENT_FORMATS,
  CONTENT_STAGES,
  type ContentItem,
  type ContentStage,
} from "@/data/types";
import { todayISODate } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { platformOf } from "./company.platforms";

/** Anlegen/Bearbeiten eines Content-Stücks inkl. Skript & Performance. */
export function ContentModal({
  open,
  onClose,
  accountId,
  companyId,
  editing,
  defaultStage,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  companyId: string;
  editing?: ContentItem | null;
  defaultStage?: ContentStage;
}) {
  const allChannels = useLiveQuery(() => channelsRepo.list(accountId), [accountId]) ?? [];
  const companyChannels = allChannels.filter((c) => c.companyId === companyId);

  const [title, setTitle] = useState("");
  const [channelId, setChannelId] = useState("");
  const [stage, setStage] = useState<ContentStage>("idea");
  const [format, setFormat] = useState("");
  const [hook, setHook] = useState("");
  const [script, setScript] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [url, setUrl] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [revenue, setRevenue] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setChannelId(editing.channelId ?? "");
      setStage(editing.stage);
      setFormat(editing.format ?? "");
      setHook(editing.hook ?? "");
      setScript(editing.script ?? "");
      setPublishDate(editing.publishDate ?? "");
      setUrl(editing.url ?? "");
      setViews(editing.views != null ? String(editing.views) : "");
      setLikes(editing.likes != null ? String(editing.likes) : "");
      setRevenue(editing.revenue != null ? String(editing.revenue) : "");
      setNote(editing.note ?? "");
    } else {
      setTitle("");
      setChannelId(companyChannels[0]?.id ?? "");
      setStage(defaultStage ?? "idea");
      setFormat("");
      setHook("");
      setScript("");
      setPublishDate("");
      setUrl("");
      setViews("");
      setLikes("");
      setRevenue("");
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultStage]);

  const num = (s: string) => (s ? Number(s.replace(/\./g, "").replace(",", ".")) : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      channelId: channelId || undefined,
      stage,
      format: format || undefined,
      hook: hook.trim() || undefined,
      script: script.trim() || undefined,
      publishDate: publishDate || undefined,
      url: url.trim() || undefined,
      views: num(views),
      likes: num(likes),
      revenue: num(revenue),
      note: note.trim() || undefined,
    };
    if (editing) {
      await contentItems.update(editing.id, payload);
    } else {
      await contentItems.create({ accountId, companyId, ...payload, order: Date.now() });
    }
    onClose();
  }

  const published = stage === "published";

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Content bearbeiten" : "Neuer Content"} description="Von der Idee über das Skript bis zur Auswertung." className="max-w-2xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="ct-title">Titel</Label>
          <Input id="ct-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Worum geht es?" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="ct-stage">Phase</Label>
            <Select id="ct-stage" value={stage} onChange={(e) => setStage(e.target.value as ContentStage)} className="h-10">
              {CONTENT_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ct-channel">Kanal</Label>
            <Select id="ct-channel" value={channelId} onChange={(e) => setChannelId(e.target.value)} className="h-10">
              <option value="">— keiner —</option>
              {companyChannels.map((c) => (
                <option key={c.id} value={c.id}>{platformOf(c.kind).label} · {c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ct-format">Format</Label>
            <Input id="ct-format" list="ct-formats" value={format} onChange={(e) => setFormat(e.target.value)} placeholder="z. B. Short" className="h-10" />
            <datalist id="ct-formats">
              {CONTENT_FORMATS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <Label htmlFor="ct-hook">Hook (erste Sekunden)</Label>
          <Input id="ct-hook" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Der Aufhänger, der zum Dranbleiben bringt" />
        </div>
        <div>
          <Label htmlFor="ct-script">Skript / Drehbuch</Label>
          <Textarea id="ct-script" value={script} onChange={(e) => setScript(e.target.value)} placeholder="Dein vollständiges Skript…" className="min-h-[140px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ct-date">Veröffentlichung</Label>
            <Input id="ct-date" type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="h-10 w-full" onClick={() => setPublishDate(todayISODate())}>Heute</Button>
          </div>
        </div>

        {/* Performance (vor allem nach Veröffentlichung) */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Auswertung {published ? "" : "(nach Veröffentlichung)"}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="ct-views">Aufrufe</Label>
              <Input id="ct-views" inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div>
              <Label htmlFor="ct-likes">Likes</Label>
              <Input id="ct-likes" inputMode="numeric" value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div>
              <Label htmlFor="ct-rev">Umsatz (€)</Label>
              <Input id="ct-rev" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="0" className="h-9" />
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="ct-url">Link</Label>
              <Input id="ct-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="h-9" />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="ct-note">Notiz (optional)</Label>
          <Textarea id="ct-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[50px]" />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {editing ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Diesen Content löschen?")) { contentItems.remove(editing.id); onClose(); } }}>
              Löschen
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
            <Button type="submit">{editing ? "Speichern" : "Anlegen"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
