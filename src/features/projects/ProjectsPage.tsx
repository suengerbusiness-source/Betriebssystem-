import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarClock, FolderKanban, LayoutGrid, List, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { projects, tasks } from "@/data/repo";
import {
  PROJECT_STATUS,
  colorHex,
  type Project,
  type ProjectStatus,
} from "@/data/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectModal } from "./ProjectModal";

type TaskStat = { done: number; total: number };

export function ProjectsPage() {
  const { account } = useAuth();
  const accId = account?.id;
  const allProjects = useLiveQuery(() => (accId ? projects.list(accId) : []), [accId]) ?? [];
  const allTasks = useLiveQuery(() => (accId ? tasks.list(accId) : []), [accId]) ?? [];

  const [view, setView] = useState<"board" | "list">("board");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [dragOver, setDragOver] = useState<ProjectStatus | null>(null);

  // Aufgaben-Statistik je Projekt für Fortschrittsanzeige.
  const stats = useMemo(() => {
    const map = new Map<string, TaskStat>();
    for (const t of allTasks) {
      if (!t.projectId) continue; // eigenständige Aufgaben zählen hier nicht
      const s = map.get(t.projectId) ?? { done: 0, total: 0 };
      s.total += 1;
      if (t.done) s.done += 1;
      map.set(t.projectId, s);
    }
    return map;
  }, [allTasks]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: Project) {
    setEditing(p);
    setModalOpen(true);
  }

  async function moveTo(projectId: string, status: ProjectStatus) {
    setDragOver(null);
    await projects.update(projectId, { status });
  }

  // Schnellaktion aus der Command-Palette (?neu=1) -> Projekt-Modal öffnen.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("neu") === "1") {
      openNew();
      params.delete("neu");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const byStatus = (s: ProjectStatus) =>
    allProjects.filter((p) => p.status === s).sort((a, b) => a.order - b.order);

  if (allProjects.length === 0) {
    return (
      <div>
        <PageHeader
          title="Projekte"
          subtitle="Entwerfen, planen, umsetzen – mit Kanban und Aufgaben."
          actions={
            <Button onClick={openNew}>
              <Plus size={18} /> Projekt
            </Button>
          }
        />
        <EmptyState
          icon={<FolderKanban size={22} />}
          title="Noch keine Projekte"
          description="Lege dein erstes Projekt an, ergänze Aufgaben und ziehe es durch die Phasen."
          action={
            <Button onClick={openNew}>
              <Plus size={18} /> Erstes Projekt
            </Button>
          }
        />
        <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projekte"
        subtitle="Entwerfen, planen, umsetzen – mit Kanban und Aufgaben."
        actions={
          <>
            <div className="inline-flex rounded-md bg-secondary p-1">
              <button
                onClick={() => setView("board")}
                className={cn("rounded p-1.5", view === "board" ? "bg-card shadow-sm" : "text-muted-foreground")}
                aria-label="Board-Ansicht"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn("rounded p-1.5", view === "list" ? "bg-card shadow-sm" : "text-muted-foreground")}
                aria-label="Listen-Ansicht"
              >
                <List size={16} />
              </button>
            </div>
            <Button onClick={openNew}>
              <Plus size={18} /> Projekt
            </Button>
          </>
        }
      />

      {view === "board" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PROJECT_STATUS.map((col) => {
            const items = byStatus(col.value);
            return (
              <div
                key={col.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.value);
                }}
                onDragLeave={() => setDragOver((d) => (d === col.value ? null : d))}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) void moveTo(id, col.value);
                }}
                className={cn(
                  "rounded-lg border border-border bg-card/40 p-2 transition-colors",
                  dragOver === col.value && "border-primary bg-primary/5",
                )}
              >
                <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                  <span className="text-sm font-medium">{col.label}</span>
                  <Badge className="text-muted-foreground">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      stat={stats.get(p.id)}
                      onClick={() => openEdit(p)}
                      draggable
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="px-1.5 py-3 text-xs text-muted-foreground">Hierher ziehen…</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {allProjects
            .slice()
            .sort((a, b) => a.status.localeCompare(b.status) || a.order - b.order)
            .map((p) => (
              <ProjectCard key={p.id} project={p} stat={stats.get(p.id)} onClick={() => openEdit(p)} showStatus />
            ))}
        </div>
      )}

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}

function ProjectCard({
  project: p,
  stat,
  onClick,
  draggable,
  showStatus,
}: {
  project: Project;
  stat?: TaskStat;
  onClick: () => void;
  draggable?: boolean;
  showStatus?: boolean;
}) {
  const progress = stat && stat.total ? Math.round((stat.done / stat.total) * 100) : 0;
  const statusLabel = PROJECT_STATUS.find((s) => s.value === p.status)?.label;

  return (
    <Card
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
      onClick={onClick}
      className={cn(
        "cursor-pointer p-3 transition-shadow hover:shadow-md",
        draggable && "active:cursor-grabbing",
      )}
      style={{ borderLeft: `3px solid ${colorHex(p.color)}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-tight">{p.title}</p>
        {showStatus && <Badge className="shrink-0 text-muted-foreground">{statusLabel}</Badge>}
      </div>
      {p.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
      )}

      {stat && stat.total > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stat.done}/{stat.total} Aufgaben
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: colorHex(p.color) }} />
          </div>
        </div>
      )}

      {p.deadline && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock size={13} />
          {formatDate(p.deadline, "d. MMM yyyy")}
        </div>
      )}
    </Card>
  );
}
