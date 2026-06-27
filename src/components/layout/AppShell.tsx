import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

/*
  App-Grundgerüst: feste Seitenleiste (Module) + Topbar.
  Module sind hier zentral registriert -> ein neues Feature = ein Eintrag.
*/
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/finanzen", label: "Finanzen", icon: Wallet },
  { to: "/kalender", label: "Kalender", icon: CalendarDays },
  { to: "/vision", label: "Vision Board", icon: Sparkles },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];

export function AppShell() {
  const { account, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-semibold">Life-OS</p>
          <p className="text-xs text-muted-foreground">CEO deines Lebens</p>
        </div>
      </div>
      {nav}
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {account?.greetingName || account?.name}
            </p>
            <p className="text-xs text-muted-foreground">Eingeloggt</p>
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
    <div className="flex h-full">
      {/* Desktop-Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
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
            <h1 className="text-lg font-semibold">{activeLabel}</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl animate-fade-in px-4 py-6 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
