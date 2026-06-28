import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { greetingForHour } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ThemeToggle";

/*
  Kombinierte Login-/Ersteinrichtungs-Seite.
  Gibt es noch kein Konto, wird die Registrierung gezeigt (Spec: Konto anlegen),
  sonst der Login mit persönlicher Begrüßung.
*/
export function AuthPage() {
  const { hasAccounts, login, register } = useAuth();
  const isSetup = !hasAccounts;

  const [name, setName] = useState("");
  const [greetingName, setGreetingName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const greeting = greetingForHour(new Date().getHours());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !password) {
      setError("Bitte Name und Passwort ausfüllen.");
      return;
    }
    if (isSetup && password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      if (isSetup) {
        await register(name, password, greetingName);
      } else {
        await login(name, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden p-4">
      {/* Ruhiger Cockpit-Hintergrund */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))]">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles size={26} />
          </div>
          <h1 className="text-2xl font-semibold">
            {isSetup ? "Willkommen bei Life-OS" : `${greeting}!`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSetup
              ? "Lege dein Konto an – der Ort, an dem du dein Leben steuerst."
              : "Schön, dass du wieder da bist. Melde dich an."}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <Label htmlFor="name">Konto-Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Max"
              autoFocus
              autoComplete="username"
            />
          </div>

          {isSetup && (
            <div>
              <Label htmlFor="greeting">Begrüßungsname (optional)</Label>
              <Input
                id="greeting"
                value={greetingName}
                onChange={(e) => setGreetingName(e.target.value)}
                placeholder="Wie sollen wir dich begrüßen?"
              />
            </div>
          )}

          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSetup ? "new-password" : "current-password"}
            />
          </div>

          {isSetup && (
            <div>
              <Label htmlFor="confirm">Passwort bestätigen</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Einen Moment…" : isSetup ? "Konto erstellen" : "Anmelden"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Deine Daten bleiben lokal auf diesem Gerät (local-first).
        </p>
      </div>
    </div>
  );
}
