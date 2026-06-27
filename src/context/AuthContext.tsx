import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { accounts } from "@/data/repo";
import { generateSalt, hashPassword, verifyPassword } from "@/lib/crypto";
import type { Account } from "@/data/types";

interface AuthCtx {
  /** Aktuell eingeloggtes Konto (ohne Hash/Salt nach außen). */
  account: Account | null;
  loading: boolean;
  /** Gibt es schon mindestens ein Konto? -> bestimmt Login vs. Ersteinrichtung. */
  hasAccounts: boolean;
  register: (name: string, password: string, greetingName?: string) => Promise<void>;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const SESSION_KEY = "life-os.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const count = await accounts.count();
    setHasAccounts(count > 0);
    // Session wiederherstellen (es wird nur die accountId gespeichert, nie das Passwort).
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (sessionId) {
      const acc = await accounts.get(sessionId);
      if (acc) setAccount(acc);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const register = useCallback(
    async (name: string, password: string, greetingName?: string) => {
      const existing = await accounts.getByName(name);
      if (existing) throw new Error("Es gibt bereits ein Konto mit diesem Namen.");
      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const acc = await accounts.create({
        name: name.trim(),
        greetingName: greetingName?.trim() || undefined,
        passwordHash,
        salt,
      });
      sessionStorage.setItem(SESSION_KEY, acc.id);
      setAccount(acc);
      setHasAccounts(true);
    },
    [],
  );

  const login = useCallback(async (name: string, password: string) => {
    const acc = await accounts.getByName(name.trim());
    if (!acc) throw new Error("Konto nicht gefunden.");
    const ok = await verifyPassword(password, acc.salt, acc.passwordHash);
    if (!ok) throw new Error("Falsches Passwort.");
    sessionStorage.setItem(SESSION_KEY, acc.id);
    setAccount(acc);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAccount(null);
  }, []);

  return (
    <Ctx.Provider
      value={{ account, loading, hasAccounts, register, login, logout, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider stehen");
  return ctx;
}
