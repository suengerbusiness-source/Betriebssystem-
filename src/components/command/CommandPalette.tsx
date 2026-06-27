import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  CalendarDays,
  Download,
  FolderKanban,
  Handshake,
  Landmark,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { assets, deals, events, projects, transactions, visionItems } from "@/data/repo";
import { downloadBackup } from "@/data/backup";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
  Globale Command-Palette (⌘/Strg-K).
  Durchsucht alle Module (Termine, Buchungen, Projekte, Deals, Vermögen, Vision)
  und bietet Schnellaktionen + Navigation. Tastatur: ↑/↓ wählen, Enter starten,
  Esc schließen. Daten bleiben lokal – die Suche läuft komplett im Browser.
*/
interface PaletteCtx {
  open: () => void;
}
const Ctx = createContext<PaletteCtx | null>(null);

export function useCommandPalette() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCommandPalette muss innerhalb des Providers stehen");
  return ctx;
}

interface Command {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { account } = useAuth();
  const { theme, toggle } = useTheme();
  const accId = account?.id;

  const evs = useLiveQuery(() => (accId ? events.list(accId) : []), [accId]) ?? [];
  const txs = useLiveQuery(() => (accId ? transactions.list(accId) : []), [accId]) ?? [];
  const projs = useLiveQuery(() => (accId ? projects.list(accId) : []), [accId]) ?? [];
  const dls = useLiveQuery(() => (accId ? deals.list(accId) : []), [accId]) ?? [];
  const ast = useLiveQuery(() => (accId ? assets.list(accId) : []), [accId]) ?? [];
  const vis = useLiveQuery(() => (accId ? visionItems.list(accId) : []), [accId]) ?? [];

  function close() {
    setIsOpen(false);
    setQuery("");
    setActive(0);
  }
  function open() {
    setIsOpen(true);
  }

  // Globaler Shortcut ⌘/Strg+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 20);
  }, [isOpen]);

  const go = (path: string) => () => {
    navigate(path);
    close();
  };

  // Statische Aktionen + Navigation (immer verfügbar)
  const baseCommands: Command[] = useMemo(
    () => [
      { id: "n-dash", group: "Navigation", label: "Dashboard", icon: <LayoutDashboard size={16} />, run: go("/") },
      { id: "n-fin", group: "Navigation", label: "Finanzen", icon: <Wallet size={16} />, run: go("/finanzen") },
      { id: "n-proj", group: "Navigation", label: "Projekte", icon: <FolderKanban size={16} />, run: go("/projekte") },
      { id: "n-cal", group: "Navigation", label: "Kalender", icon: <CalendarDays size={16} />, run: go("/kalender") },
      { id: "n-vis", group: "Navigation", label: "Vision Board", icon: <Sparkles size={16} />, run: go("/vision") },
      { id: "a-event", group: "Aktionen", label: "Neuer Termin", keywords: "kalender anlegen", icon: <Plus size={16} />, run: go("/kalender?neu=1") },
      { id: "a-tx", group: "Aktionen", label: "Neue Buchung", keywords: "finanzen einnahme ausgabe", icon: <Plus size={16} />, run: go("/finanzen?neu=1") },
      { id: "a-proj", group: "Aktionen", label: "Neues Projekt", keywords: "kanban", icon: <Plus size={16} />, run: go("/projekte?neu=1") },
      {
        id: "a-theme",
        group: "Aktionen",
        label: theme === "dark" ? "Zu hellem Design wechseln" : "Zu dunklem Design wechseln",
        keywords: "theme dark light hell dunkel",
        icon: theme === "dark" ? <Sun size={16} /> : <Moon size={16} />,
        run: () => {
          toggle();
          close();
        },
      },
      {
        id: "a-export",
        group: "Aktionen",
        label: "Backup exportieren",
        keywords: "sicherung json download",
        icon: <Download size={16} />,
        run: () => {
          void downloadBackup();
          close();
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  // Datensätze aus allen Modulen als durchsuchbare Befehle
  const dataCommands: Command[] = useMemo(() => {
    const out: Command[] = [];
    for (const e of evs)
      out.push({
        id: "e-" + e.id,
        group: "Termine",
        label: e.title,
        sub: formatDate(e.start, "EEE, d. MMM") + (e.category ? " · " + e.category : ""),
        keywords: e.category ?? "",
        icon: <CalendarDays size={16} />,
        run: go("/kalender"),
      });
    for (const t of txs)
      out.push({
        id: "t-" + t.id,
        group: "Buchungen",
        label: `${t.category} · ${formatCurrency(t.amount)}`,
        sub: (t.note ? t.note + " · " : "") + formatDate(t.date, "d. MMM"),
        keywords: (t.note ?? "") + " " + t.type,
        icon: <Wallet size={16} />,
        run: go("/finanzen"),
      });
    for (const p of projs)
      out.push({
        id: "p-" + p.id,
        group: "Projekte",
        label: p.title,
        sub: p.description,
        icon: <FolderKanban size={16} />,
        run: go("/projekte"),
      });
    for (const d of dls)
      out.push({
        id: "d-" + d.id,
        group: "Pipeline",
        label: d.title,
        sub: (d.contact ? d.contact + " · " : "") + (d.value ? formatCurrency(d.value) : ""),
        keywords: d.contact ?? "",
        icon: <Handshake size={16} />,
        run: go("/finanzen"),
      });
    for (const a of ast)
      out.push({
        id: "as-" + a.id,
        group: "Vermögen",
        label: a.name,
        sub: a.category + " · " + formatCurrency(a.value),
        icon: <Landmark size={16} />,
        run: go("/finanzen"),
      });
    for (const v of vis)
      if (v.title || v.content)
        out.push({
          id: "v-" + v.id,
          group: "Vision",
          label: v.title || (v.content ?? "").slice(0, 40),
          sub: v.title ? (v.content ?? "").slice(0, 50) : undefined,
          icon: <Sparkles size={16} />,
          run: go("/vision"),
        });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evs, txs, projs, dls, ast, vis]);

  // Filtern
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseCommands;
    const match = (c: Command) =>
      (c.label + " " + (c.sub ?? "") + " " + (c.keywords ?? "") + " " + c.group).toLowerCase().includes(q);
    return [...baseCommands.filter(match), ...dataCommands.filter(match)].slice(0, 40);
  }, [query, baseCommands, dataCommands]);

  useEffect(() => setActive(0), [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    } else if (e.key === "Escape") {
      close();
    }
  }

  // Gruppieren für die Anzeige, dabei den flachen Index beibehalten.
  let flat = -1;

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm sm:pt-[12vh]"
          onMouseDown={close}
        >
          <div
            className="w-full max-w-xl animate-fade-in overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search size={18} className="text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Suchen oder Aktion starten…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nichts gefunden.</p>
              ) : (
                groupBy(results).map(([group, items]) => (
                  <div key={group} className="mb-1">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{group}</p>
                    {items.map((c) => {
                      flat += 1;
                      const idx = flat;
                      return (
                        <button
                          key={c.id}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => c.run()}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                            active === idx ? "bg-secondary" : "hover:bg-secondary/60",
                          )}
                        >
                          <span className="text-muted-foreground">{c.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{c.label}</span>
                            {c.sub && <span className="block truncate text-xs text-muted-foreground">{c.sub}</span>}
                          </span>
                          {active === idx && <ArrowRight size={14} className="text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/** Such-Auslöser für die Topbar. */
export function CommandButton() {
  const { open } = useCommandPalette();
  return (
    <button
      onClick={open}
      className="flex h-9 items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary sm:px-3"
      aria-label="Suchen"
    >
      <Search size={16} />
      <span className="hidden sm:inline">Suchen…</span>
      <kbd className="ml-1 hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
    </button>
  );
}

function groupBy(items: Command[]): [string, Command[]][] {
  const map = new Map<string, Command[]>();
  for (const c of items) {
    const arr = map.get(c.group) ?? [];
    arr.push(c);
    map.set(c.group, arr);
  }
  return [...map.entries()];
}
