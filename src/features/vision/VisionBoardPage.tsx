import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { visionItems } from "@/data/repo";
import { colorHex, type VisionItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { VisionModal } from "./VisionModal";

/*
  Vision Board: freie Leinwand, Karten/Bilder/Affirmationen per Drag verschieben.
  Positionen werden direkt in IndexedDB gespeichert (local-first, überlebt Neustart).
*/
export function VisionBoardPage() {
  const { account } = useAuth();
  const items =
    useLiveQuery(() => (account ? visionItems.list(account.id) : []), [account?.id]) ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VisionItem | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; offX: number; offY: number } | null>(null);

  function onPointerDown(e: React.PointerEvent, item: VisionItem) {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = {
      id: item.id,
      offX: e.clientX - rect.left - item.x,
      offY: e.clientY - rect.top - item.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent, item: VisionItem) {
    if (drag.current?.id !== item.id) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - drag.current.offX, rect.width - item.w));
    const y = Math.max(0, e.clientY - rect.top - drag.current.offY);
    // Optimistisch in die DB schreiben -> useLiveQuery rendert neu.
    void visionItems.update(item.id, { x, y });
  }

  function onPointerUp(item: VisionItem, e: React.PointerEvent) {
    if (drag.current?.id === item.id) {
      drag.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Vision Board"
        subtitle="Ordne deine Ziele und Bilder frei an – ziehen zum Verschieben."
        actions={
          <Button onClick={openNew}>
            <Plus size={18} /> Element
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={22} />}
          title="Dein Board ist noch leer"
          description="Füge Bilder, Karten oder Affirmationen hinzu und ordne sie an, wie du willst."
          action={
            <Button onClick={openNew}>
              <Plus size={18} /> Erstes Element
            </Button>
          }
        />
      ) : (
        <div
          ref={canvasRef}
          className="relative min-h-[70vh] w-full overflow-hidden rounded-lg border border-dashed border-border bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px]"
        >
          {items.map((item) => (
            <div
              key={item.id}
              onPointerDown={(e) => onPointerDown(e, item)}
              onPointerMove={(e) => onPointerMove(e, item)}
              onPointerUp={(e) => onPointerUp(item, e)}
              className="group absolute cursor-grab touch-none select-none rounded-xl border border-border bg-card shadow-md transition-shadow hover:shadow-xl active:cursor-grabbing"
              style={{
                left: item.x,
                top: item.y,
                width: item.w,
                minHeight: item.h,
                borderTop: `3px solid ${colorHex(item.color)}`,
              }}
            >
              {/* Aktionen */}
              <div
                data-no-drag
                className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <button
                  onClick={() => {
                    setEditing(item);
                    setModalOpen(true);
                  }}
                  className="rounded bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Bearbeiten"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => visionItems.remove(item.id)}
                  className="rounded bg-background/80 p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <VisionContent item={item} />
            </div>
          ))}
        </div>
      )}

      <VisionModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}

function VisionContent({ item }: { item: VisionItem }) {
  if (item.kind === "image") {
    return (
      <div className="p-2">
        {item.content && (
          <img src={item.content} alt={item.title ?? ""} className="w-full rounded-lg object-cover" draggable={false} />
        )}
        {item.title && <p className="mt-2 px-1 text-sm font-medium">{item.title}</p>}
      </div>
    );
  }
  if (item.kind === "quote") {
    return (
      <div className="p-4">
        <p className={cn("text-base font-medium italic leading-snug")} style={{ color: colorHex(item.color) }}>
          „{item.content}"
        </p>
        {item.title && <p className="mt-2 text-xs text-muted-foreground">— {item.title}</p>}
      </div>
    );
  }
  return (
    <div className="p-4">
      {item.title && <p className="mb-1 font-semibold">{item.title}</p>}
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p>
    </div>
  );
}
