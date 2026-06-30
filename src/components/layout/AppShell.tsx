import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Sparkles,
  Sun,
  Target,
  Telescope,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";
import { usePrivacy } from "@/context/PrivacyContext";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandButton, CommandPaletteProvider } from "@/components/command/CommandPalette";
import { NudgeBell } from "@/features/nudges/NudgeBell";
import { CelebrationLayer } from "@/features/achievements/CelebrationLayer";
import { maybeDailySnapshot } from "@/data/backup";

/*
  App-Grundgerüst: feste Seitenleiste (Module) + Topbar.
  Module sind hier zentral registriert -> ein neues Feature = ein Eintrag.
*/
// `bar`: erscheint in der mobilen Bottom-Navigation (max. 5 sinnvoll).
// `group`: thematische Sortierung der Menüpunkte in der Seitenleiste.
const NAV = [
  { to: "/", label: "Dashboard", short: "Start", icon: LayoutDashboard, end: true, bar: true, group: "" },
  { to: "/heute", label: "Heute", short: "Heute", icon: Sun, end: false, bar: true, group: "" },
  { to: "/finanzen", label: "Finanzen", short: "Finanzen", icon: Wallet, bar: true, group: "Geld" },
  { to: "/rechnungen", label: "Rechnungen", short: "Rechnung", icon: FileText, bar: false, group: "Geld" },
  { to: "/analyse", label: "Analyse", short: "Analyse", icon: BarChart3, bar: false, group: "Geld" },
  { to: "/unternehmen", label: "Unternehmen", short: "Business", icon: Briefcase, bar: true, group: "Planung" },
  { to: "/kalender", label: "Kalender", short: "Kalender", icon: CalendarDays, bar: true, group: "Planung" },
  { to: "/tagebuch", label: "Tagebuch", short: "Tagebuch", icon: NotebookPen, bar: false, group: "Persönlich" },
  { to: "/erkenntnisse", label: "Erkenntnisse", short: "Muster", icon: Lightbulb, bar: false, group: "Persönlich" },
  { to: "/erfolge", label: "Erfolge", short: "Erfolge", icon: Trophy, bar: false, group: "Persönlich" },
  { to: "/ziele", label: "Ziele", short: "Ziele", icon: Target, bar: false, group: "Persönlich" },
  { to: "/horizonte", label: "Horizonte", short: "Horizonte", icon: Telescope, bar: false, group: "Persönlich" },
  { to: "/vision", label: "Vision Board", short: "Vision", icon: Sparkles, bar: false, group: "Persönlich" },
  { to: "/einstellungen", label: "Einstellungen", short: "Mehr", icon: Settings, bar: false, group: "System" },
];

// Reihenfolge der Gruppen-Abschnitte in der Seitenleiste.
const GROUP_ORDER = ["", "Geld", "Planung", "Persönlich", "System"];

export function AppShell() {
  const { account, logout } = useAuth();
  const { hideAmounts, toggle: togglePrivacy } = usePrivacy();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Einmal pro Tag still einen lokalen Sicherungs-Schnappschuss anlegen.
  useEffect(() => {
    void maybeDailySnapshot();
  }, []);
  const location = useLocation();

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
      {GROUP_ORDER.map((group) => {
        const items = NAV.filter((n) => n.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group || "_"} className="flex flex-col gap-1">
            {group && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group}
              </p>
            )}
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon size={18} className={cn(isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          <Sparkles size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-semibold tracking-tight">Life-OS</p>
          <p className="text-xs text-muted-foreground">CEO deines Lebens</p>
        </div>
      </div>
      {nav}
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(account?.greetingName || account?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {account?.greetingName || account?.name}
              </p>
              <p className="text-xs text-muted-foreground">Eingeloggt</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Abmelden">
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </>
  );

  const activeLabel =
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
      ?.label ?? "Dashboard";

  return (
    <CommandPaletteProvider>
    <div className="flex h-full">
      {/* Desktop-Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile-Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Hauptbereich */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/70 px-4 py-3 backdrop-blur-xl sm:px-6"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menü"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
            <h1 className="text-lg font-semibold tracking-tight">{activeLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <CommandButton />
            <NudgeBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePrivacy}
              aria-label={hideAmounts ? "Beträge anzeigen" : "Beträge ausblenden"}
              title={hideAmounts ? "Beträge wieder anzeigen" : "Beträge ausblenden (Privatsphäre)"}
              className={cn(hideAmounts && "text-primary")}
            >
              {hideAmounts ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {/* key wechselt beim Umschalten des Privatsphäre-Modus, damit die
              aktuell sichtbare Seite sofort mit/ohne maskierte Beträge neu
              rendert (der Router-Outlet allein würde nicht neu rendern). */}
          <div key={hideAmounts ? "amounts-hidden" : "amounts-shown"} className="mx-auto max-w-6xl animate-fade-in px-4 py-6 sm:px-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile-Bottom-Navigation (Einhand-Bedienung) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 backdrop-blur-md lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV.filter((n) => n.bar).map(({ to, short, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-primary/10")}>
                    <Icon size={19} />
                  </span>
                  {short}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <CelebrationLayer />
    </div>
    </CommandPaletteProvider>
  );
}
