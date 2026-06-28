import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { db } from "@/data/db";
import { getCloudUrl } from "@/data/sync";

/*
  Stellt den Sync-Status und Login-Aktionen für die UI bereit.
  Ist KEIN Cloud-Addon aktiv (keine URL konfiguriert), ist alles inert:
  enabled = false, keine Subscriptions, keine Netzwerkaktivität.
*/
interface SyncUser {
  email?: string;
  name?: string;
  isLoggedIn: boolean;
}

interface SyncCtx {
  /** Ist Sync grundsätzlich konfiguriert (URL vorhanden + Addon aktiv)? */
  enabled: boolean;
  user: SyncUser | null;
  /** Sync-Phase von Dexie Cloud (in-sync, pulling, offline, error …). */
  phase: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<SyncCtx | null>(null);

// Cloud-API nur greifbar, wenn das Addon angehängt wurde.
type Cloud = {
  currentUser: { subscribe: (cb: (u: SyncUser) => void) => { unsubscribe: () => void } };
  syncState: { subscribe: (cb: (s: { phase?: string }) => void) => { unsubscribe: () => void } };
  login: () => Promise<void>;
  logout: () => Promise<void>;
};
function getCloud(): Cloud | null {
  if (!getCloudUrl()) return null;
  const c = (db as unknown as { cloud?: Cloud }).cloud;
  return c ?? null;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SyncUser | null>(null);
  const [phase, setPhase] = useState<string>("");
  const cloud = getCloud();
  const enabled = !!cloud;

  useEffect(() => {
    if (!cloud) return;
    const subUser = cloud.currentUser.subscribe((u) => setUser(u));
    const subState = cloud.syncState.subscribe((s) => setPhase(s.phase ?? ""));
    return () => {
      subUser.unsubscribe();
      subState.unsubscribe();
    };
  }, [cloud]);

  async function login() {
    await cloud?.login();
  }
  async function logout() {
    await cloud?.logout();
  }

  return (
    <Ctx.Provider value={{ enabled, user, phase, login, logout }}>{children}</Ctx.Provider>
  );
}

export function useSync() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSync muss innerhalb von SyncProvider stehen");
  return ctx;
}
