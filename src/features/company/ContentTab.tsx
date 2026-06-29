import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Eye, FileText, Plus } from "lucide-react";
import { contentItems, channels as channelsRepo } from "@/data/repo";
import { CONTENT_STAGES, type ContentItem, type ContentStage } from "@/data/types";
import { Badge } from "@/components/ui/Badge";
import { platformOf } from "./company.platforms";
import { compactNumber } from "./company.utils";
import { ContentModal } from "./ContentModal";

const STAGE_ORDER = CONTENT_STAGES.map((s) => s.value);

/** Content-Pipeline als Kanban: Idee → Skript → Produktion → Geplant → Veröffentlicht. */
export function ContentTab({ accountId, companyId }: { accountId: string; companyId: string }) {
  const allContent = useLiveQuery(() => contentItems.list(accountId), [accountId]) ?? [];
  const allChannels = useLiveQuery(() => channelsRepo.list(accountId), [accountId]) ?? [];
  const channelById = useMemo(() => new Map(allChannels.map((c) => [c.id, c])), [allChannels]);

  const list = allContent.filter((c) => c.companyId === companyId);
  const byStage = useMemo(() => {
    const map = new Map<ContentStage, ContentItem[]>();
    for (const s of STAGE_ORDER) map.set(s, []);
    for (const c of list) map.get(c.stage)?.push(c);
    for (const arr of map.values()) arr.sort((a, b) => b.order - a.order);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContent, companyId]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [newStage, setNewStage] = useState<ContentStage>("idea");

  function openNew(stage: ContentStage) {
    setEditing(null);
    setNewStage(stage);
    setModalOpen(true);
  }
  function openEdit(c: ContentItem) {
    setEditing(c);
    setModalOpen(true);
  }
  function move(c: ContentItem, dir: -1 | 1) {
    const idx = STAGE_ORDER.indexOf(c.stage);
    const next = STAGE_ORDER[idx + dir];
    if (next) contentItems.update(c.id, { stage: next });
  }

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {CONTENT_STAGES.map((s) => {
          const items = byStage.get(s.value) ?? [];
          return (
            <div key={s.value} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-secondary/30">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {s.label}
                  <Badge className="text-muted-foreground">{items.length}</Badge>
                </span>
                <button onClick={() => openNew(s.value)} className="text-muted-foreground hover:text-primary" aria-label={`In ${s.label} hinzufügen`}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-2">
                {items.length === 0 ? (
                  <button onClick={() => openNew(s.value)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                    <Plus size={14} /> Content
                  </button>
                ) : (
                  items.map((c) => {
                    const ch = c.channelId ? channelById.get(c.channelId) : undefined;
                    const p = ch ? platformOf(ch.kind) : undefined;
                    const idx = STAGE_ORDER.indexOf(c.stage);
                    return (
                      <div key={c.id} className="rounded-lg border border-border bg-card p-2.5 shadow-soft">
                        <button onClick={() => openEdit(c)} className="block w-full text-left">
                          <div className="flex items-start gap-2">
                            {p && (
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-white" style={{ background: p.color }}>
                                <p.icon size={12} />
                              </span>
                            )}
                            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{c.title}</p>
                          </div>
                          {c.hook && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.hook}</p>}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            {c.format && <Badge className="text-muted-foreground">{c.format}</Badge>}
                            {c.script && <span className="inline-flex items-center gap-0.5"><FileText size={11} /> Skript</span>}
                            {c.views != null && <span className="inline-flex items-center gap-0.5"><Eye size={11} /> {compactNumber(c.views)}</span>}
                            {c.publishDate && <span>{c.publishDate.slice(8, 10)}.{c.publishDate.slice(5, 7)}.</span>}
                          </div>
                        </button>
                        <div className="mt-2 flex items-center justify-between">
                          <button onClick={() => move(c, -1)} disabled={idx === 0} className="rounded p-1 text-muted-foreground enabled:hover:text-foreground disabled:opacity-30" aria-label="Phase zurück">
                            <ChevronLeft size={15} />
                          </button>
                          <button onClick={() => move(c, 1)} disabled={idx === STAGE_ORDER.length - 1} className="rounded p-1 text-muted-foreground enabled:hover:text-foreground disabled:opacity-30" aria-label="Phase vor">
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ContentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accountId={accountId}
        companyId={companyId}
        editing={editing}
        defaultStage={newStage}
      />
    </div>
  );
}
