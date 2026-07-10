/*
  Repository-Schicht: die öffentliche Daten-API für die UI.

  Die Oberfläche importiert NUR aus dieser Datei (nicht aus db.ts), damit der
  Storage austauschbar bleibt. Alle Schreibvorgänge setzen Zeitstempel und IDs.
*/
import { db } from "./db";
import { uid } from "@/lib/crypto";
import type {
  Account,
  ActivityLog,
  ActivityType,
  Asset,
  Birthday,
  Budget,
  BusinessIdea,
  CalendarEvent,
  Channel,
  CheckIn,
  Client,
  Company,
  CompanyNote,
  ContentItem,
  CustomMetric,
  Deal,
  Experiment,
  ExperimentDebrief,
  Goal,
  GoalLog,
  Habit,
  HorizonGoal,
  Investment,
  RevenueStream,
  InboxItem,
  Invoice,
  KeyResult,
  MonthlyReview,
  Project,
  RecurringTemplate,
  ScreenTimeLog,
  Task,
  TimeEntry,
  Transaction,
  UserProfile,
  VisionItem,
} from "./types";

const now = () => Date.now();

/** Heutiger Tag als lokaler yyyy-MM-dd (für Erledigungs-/Absage-Daten). */
const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------- Konten ---------- */

export const accounts = {
  all: () => db.accounts.toArray(),
  count: () => db.accounts.count(),
  get: (id: string) => db.accounts.get(id),
  getByName: (name: string) =>
    db.accounts.where("name").equalsIgnoreCase(name).first(),
  create: async (data: Omit<Account, "id" | "createdAt">): Promise<Account> => {
    const account: Account = { ...data, id: uid(), createdAt: now() };
    await db.accounts.add(account);
    return account;
  },
};

/* ---------- Kalender ---------- */

export const events = {
  list: (accountId: string) =>
    db.events.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">,
  ): Promise<CalendarEvent> => {
    const ev: CalendarEvent = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.events.add(ev);
    return ev;
  },
  update: (id: string, patch: Partial<CalendarEvent>) =>
    db.events.update(id, { ...patch, updatedAt: now() }),
  /** Termin absagen (bleibt erhalten, fließt in die Muster-Erkennung). */
  cancel: (id: string) =>
    db.events.update(id, { cancelled: true, cancelledAt: dayKey(), updatedAt: now() }),
  /** Absage zurücknehmen. */
  uncancel: (id: string) =>
    db.events.update(id, { cancelled: false, cancelledAt: undefined, updatedAt: now() }),
  remove: (id: string) => db.events.delete(id),
};

/* ---------- Finanzen ---------- */

export const transactions = {
  list: (accountId: string) =>
    db.transactions.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<Transaction> => {
    const tx: Transaction = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.transactions.add(tx);
    return tx;
  },
  update: (id: string, patch: Partial<Transaction>) =>
    db.transactions.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.transactions.delete(id),
};

/* ---------- Vision Board ---------- */

export const visionItems = {
  list: (accountId: string) =>
    db.visionItems.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<VisionItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<VisionItem> => {
    const item: VisionItem = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.visionItems.add(item);
    return item;
  },
  update: (id: string, patch: Partial<VisionItem>) =>
    db.visionItems.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.visionItems.delete(id),
};

/* ---------- Budgets ---------- */

export const budgets = {
  list: (accountId: string) =>
    db.budgets.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<Budget, "id" | "createdAt" | "updatedAt">,
  ): Promise<Budget> => {
    const b: Budget = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.budgets.add(b);
    return b;
  },
  update: (id: string, patch: Partial<Budget>) =>
    db.budgets.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.budgets.delete(id),
};

/* ---------- Wiederkehrende Vorlagen ---------- */

export const recurringTemplates = {
  list: (accountId: string) =>
    db.recurringTemplates.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<RecurringTemplate, "id" | "createdAt" | "updatedAt">,
  ): Promise<RecurringTemplate> => {
    const t: RecurringTemplate = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.recurringTemplates.add(t);
    return t;
  },
  update: (id: string, patch: Partial<RecurringTemplate>) =>
    db.recurringTemplates.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.recurringTemplates.delete(id),
};

/* ---------- Zeiterfassung ---------- */

export const timeEntries = {
  list: (accountId: string) =>
    db.timeEntries.where("accountId").equals(accountId).toArray(),
  listByProject: (projectId: string) =>
    db.timeEntries.where("projectId").equals(projectId).toArray(),
  create: async (data: Omit<TimeEntry, "id" | "createdAt" | "updatedAt">): Promise<TimeEntry> => {
    const t: TimeEntry = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.timeEntries.add(t);
    return t;
  },
  update: (id: string, patch: Partial<TimeEntry>) =>
    db.timeEntries.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.timeEntries.delete(id),
};

/* ---------- Kunden & Rechnungen ---------- */

export const clients = {
  list: (accountId: string) =>
    db.clients.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> => {
    const c: Client = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.clients.add(c);
    return c;
  },
  update: (id: string, patch: Partial<Client>) =>
    db.clients.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.clients.delete(id),
};

export const invoices = {
  list: (accountId: string) =>
    db.invoices.where("accountId").equals(accountId).toArray(),
  get: (id: string) => db.invoices.get(id),
  create: async (data: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice> => {
    const inv: Invoice = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.invoices.add(inv);
    return inv;
  },
  update: (id: string, patch: Partial<Invoice>) =>
    db.invoices.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.invoices.delete(id),
};

/* ---------- Ziele & OKR ---------- */

export const goals = {
  list: (accountId: string) =>
    db.goals.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Goal, "id" | "createdAt" | "updatedAt">): Promise<Goal> => {
    const g: Goal = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.goals.add(g);
    return g;
  },
  update: (id: string, patch: Partial<Goal>) =>
    db.goals.update(id, { ...patch, updatedAt: now() }),
  remove: async (id: string) => {
    await db.keyResults.where("goalId").equals(id).delete();
    // Verknüpfte Quartalsziele lösen, nicht löschen.
    const children = await db.goals.where("accountId").equals((await db.goals.get(id))?.accountId ?? "").toArray();
    await Promise.all(children.filter((c) => c.parentId === id).map((c) => db.goals.update(c.id, { parentId: undefined })));
    await db.goals.delete(id);
  },
};

export const keyResults = {
  list: (accountId: string) =>
    db.keyResults.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<KeyResult, "id" | "createdAt" | "updatedAt">): Promise<KeyResult> => {
    const k: KeyResult = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.keyResults.add(k);
    return k;
  },
  update: (id: string, patch: Partial<KeyResult>) =>
    db.keyResults.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.keyResults.delete(id),
};

/* ---------- Unternehmen / Business ---------- */

export const companies = {
  list: (accountId: string) =>
    db.companies.where("accountId").equals(accountId).toArray(),
  get: (id: string) => db.companies.get(id),
  create: async (data: Omit<Company, "id" | "createdAt" | "updatedAt">): Promise<Company> => {
    const c: Company = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.companies.add(c);
    return c;
  },
  update: (id: string, patch: Partial<Company>) =>
    db.companies.update(id, { ...patch, updatedAt: now() }),
  /** Unternehmen samt aller untergeordneten Daten löschen. */
  remove: async (id: string) => {
    await db.channels.where("companyId").equals(id).delete();
    await db.contentItems.where("companyId").equals(id).delete();
    await db.investments.where("companyId").equals(id).delete();
    await db.revenueStreams.where("companyId").equals(id).delete();
    await db.businessIdeas.where("companyId").equals(id).delete();
    await db.companies.delete(id);
  },
};

export const channels = {
  list: (accountId: string) =>
    db.channels.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Channel, "id" | "createdAt" | "updatedAt">): Promise<Channel> => {
    const c: Channel = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.channels.add(c);
    return c;
  },
  update: (id: string, patch: Partial<Channel>) =>
    db.channels.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.channels.delete(id),
};

export const contentItems = {
  list: (accountId: string) =>
    db.contentItems.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<ContentItem, "id" | "createdAt" | "updatedAt">): Promise<ContentItem> => {
    const c: ContentItem = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.contentItems.add(c);
    return c;
  },
  update: (id: string, patch: Partial<ContentItem>) =>
    db.contentItems.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.contentItems.delete(id),
};

export const investments = {
  list: (accountId: string) =>
    db.investments.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Investment, "id" | "createdAt" | "updatedAt">): Promise<Investment> => {
    const i: Investment = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.investments.add(i);
    return i;
  },
  update: (id: string, patch: Partial<Investment>) =>
    db.investments.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.investments.delete(id),
};

export const revenueStreams = {
  list: (accountId: string) =>
    db.revenueStreams.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<RevenueStream, "id" | "createdAt" | "updatedAt">): Promise<RevenueStream> => {
    const r: RevenueStream = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.revenueStreams.add(r);
    return r;
  },
  update: (id: string, patch: Partial<RevenueStream>) =>
    db.revenueStreams.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.revenueStreams.delete(id),
};

export const businessIdeas = {
  list: (accountId: string) =>
    db.businessIdeas.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<BusinessIdea, "id" | "createdAt" | "updatedAt">): Promise<BusinessIdea> => {
    const i: BusinessIdea = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.businessIdeas.add(i);
    return i;
  },
  update: (id: string, patch: Partial<BusinessIdea>) =>
    db.businessIdeas.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.businessIdeas.delete(id),
};

export const companyNotes = {
  list: (accountId: string) =>
    db.companyNotes.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<CompanyNote, "id" | "createdAt" | "updatedAt">): Promise<CompanyNote> => {
    const n: CompanyNote = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.companyNotes.add(n);
    return n;
  },
  update: (id: string, patch: Partial<CompanyNote>) =>
    db.companyNotes.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.companyNotes.delete(id),
};

/* ---------- Horizonte: Ziele über Zeithorizonte ---------- */

export const horizonGoals = {
  list: (accountId: string) =>
    db.horizonGoals.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<HorizonGoal, "id" | "createdAt" | "updatedAt">): Promise<HorizonGoal> => {
    const g: HorizonGoal = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.horizonGoals.add(g);
    return g;
  },
  update: (id: string, patch: Partial<HorizonGoal>) =>
    db.horizonGoals.update(id, { ...patch, updatedAt: now() }),
  remove: async (id: string) => {
    // Einträge (Aktionen/Erfolge) des Ziels mitlöschen.
    await db.goalLogs.where("goalId").equals(id).delete();
    await db.horizonGoals.delete(id);
  },
};

export const goalLogs = {
  list: (accountId: string) =>
    db.goalLogs.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<GoalLog, "id" | "createdAt">): Promise<GoalLog> => {
    const l: GoalLog = { ...data, id: uid(), createdAt: now() };
    await db.goalLogs.add(l);
    return l;
  },
  remove: (id: string) => db.goalLogs.delete(id),
};

/* ---------- Daily-Driver: Inbox & Gewohnheiten ---------- */

export const inboxItems = {
  list: (accountId: string) =>
    db.inboxItems.where("accountId").equals(accountId).toArray(),
  create: async (accountId: string, text: string): Promise<InboxItem> => {
    const item: InboxItem = { id: uid(), accountId, text, createdAt: now() };
    await db.inboxItems.add(item);
    return item;
  },
  remove: (id: string) => db.inboxItems.delete(id),
};

export const habits = {
  list: (accountId: string) =>
    db.habits.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Habit, "id" | "createdAt" | "updatedAt">): Promise<Habit> => {
    const h: Habit = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.habits.add(h);
    return h;
  },
  update: (id: string, patch: Partial<Habit>) =>
    db.habits.update(id, { ...patch, updatedAt: now() }),
  remove: async (id: string) => {
    await db.habitLogs.where("habitId").equals(id).delete();
    await db.habits.delete(id);
  },
};

export const habitLogs = {
  list: (accountId: string) =>
    db.habitLogs.where("accountId").equals(accountId).toArray(),
  /** Tages-Eintrag einer Gewohnheit umschalten (an/aus). Atomar. */
  toggle: (accountId: string, habitId: string, date: string) =>
    db.transaction("rw", db.habitLogs, async () => {
      const existing = await db.habitLogs
        .where("habitId")
        .equals(habitId)
        .filter((l) => l.date === date)
        .first();
      if (existing) {
        await db.habitLogs.delete(existing.id);
        return false;
      }
      await db.habitLogs.add({ id: uid(), accountId, habitId, date });
      return true;
    }),
};

/* ---------- Tagebuch / täglicher Check-in ---------- */

export const checkins = {
  list: (accountId: string) =>
    db.checkins.where("accountId").equals(accountId).toArray(),
  getByDate: (accountId: string, date: string) =>
    db.checkins
      .where("accountId")
      .equals(accountId)
      .filter((c) => c.date === date)
      .first(),
  /** Neuen Check-in anlegen (mehrere pro Tag erlaubt). */
  create: async (data: Omit<CheckIn, "id" | "createdAt" | "updatedAt">): Promise<CheckIn> => {
    const entry: CheckIn = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.checkins.add(entry);
    return entry;
  },
  /**
   * Legt den Check-in eines Tages an oder aktualisiert ihn. Atomar, damit pro
   * (Konto, Tag) garantiert nur ein Eintrag existiert.
   */
  upsert: (
    accountId: string,
    date: string,
    data: Pick<CheckIn, "metrics" | "metricNotes" | "choices" | "weights" | "wentWell" | "wentBad" | "learned" | "note" | "tags">,
  ) =>
    db.transaction("rw", db.checkins, async () => {
      const existing = (
        await db.checkins.where("accountId").equals(accountId).toArray()
      ).find((c) => c.date === date);
      if (existing) {
        await db.checkins.update(existing.id, { ...data, updatedAt: now() });
        return existing.id;
      }
      const entry: CheckIn = {
        id: uid(),
        accountId,
        date,
        ...data,
        createdAt: now(),
        updatedAt: now(),
      };
      await db.checkins.add(entry);
      return entry.id;
    }),
  remove: (id: string) => db.checkins.delete(id),
};

/* ---------- Eigene Tracker (nutzerdefinierte Kennzahlen) ---------- */

export const customMetrics = {
  list: (accountId: string) =>
    db.customMetrics.where("accountId").equals(accountId).toArray(),
  create: async (
    data: Omit<CustomMetric, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomMetric> => {
    const entry: CustomMetric = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.customMetrics.add(entry);
    return entry;
  },
  update: (id: string, patch: Partial<CustomMetric>) =>
    db.customMetrics.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.customMetrics.delete(id),
};

/* ---------- Experimente (strukturierte Selbstversuche) ---------- */

export const experiments = {
  list: (accountId: string) => db.experiments.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Experiment, "id" | "status" | "createdAt" | "updatedAt">): Promise<Experiment> => {
    const entry: Experiment = { ...data, id: uid(), status: "active", createdAt: now(), updatedAt: now() };
    await db.experiments.add(entry);
    return entry;
  },
  update: (id: string, patch: Partial<Experiment>) => db.experiments.update(id, { ...patch, updatedAt: now() }),
  /** Abschließen mit Debrief. */
  complete: (id: string, debrief: ExperimentDebrief) =>
    db.experiments.update(id, { status: "completed", debrief, completedAt: now(), updatedAt: now() }),
  abandon: (id: string) => db.experiments.update(id, { status: "abandoned", updatedAt: now() }),
  remove: (id: string) => db.experiments.delete(id),
};

/* ---------- Aktivitäts-Log (Verhaltens-Signale) ---------- */

const ACTIVITY_MAX_AGE_MS = 200 * 24 * 60 * 60 * 1000; // ~200 Tage aufbewahren

export const activity = {
  list: (accountId: string) => db.activityLog.where("accountId").equals(accountId).toArray(),
  /** Ein Ereignis festhalten (und gelegentlich alte Einträge beschneiden). */
  log: async (accountId: string, type: ActivityType, meta?: Record<string, string | number>): Promise<void> => {
    const entry: ActivityLog = { id: uid(), accountId, type, at: now(), ...(meta ? { meta } : {}) };
    await db.activityLog.add(entry);
    // Aufräumen: alte Ereignisse entfernen (nur ~1 % der Aufrufe, günstig).
    if (Math.random() < 0.02) {
      const cutoff = now() - ACTIVITY_MAX_AGE_MS;
      await db.activityLog.where("at").below(cutoff).delete();
    }
  },
};

/* ---------- Persönliches Profil (ein Datensatz je Konto) ---------- */

export const profiles = {
  get: (accountId: string) => db.profiles.where("accountId").equals(accountId).first(),
  /** Profil anlegen oder aktualisieren (genau eines pro Konto). */
  upsert: (accountId: string, patch: Partial<UserProfile>) =>
    db.transaction("rw", db.profiles, async () => {
      const existing = await db.profiles.where("accountId").equals(accountId).first();
      if (existing) {
        await db.profiles.update(existing.id, { ...patch, updatedAt: now() });
        return existing.id;
      }
      const entry: UserProfile = { id: uid(), accountId, ...patch, createdAt: now(), updatedAt: now() };
      await db.profiles.add(entry);
      return entry.id;
    }),
};

/* ---------- Monatsabschluss / Analyse ---------- */

export const monthlyReviews = {
  list: (accountId: string) =>
    db.monthlyReviews.where("accountId").equals(accountId).toArray(),
  /**
   * Findet das Protokoll für (Konto, Monat, Modus) und aktualisiert es, sonst
   * wird genau eines angelegt. Atomar (Dexie-Transaktion), damit parallele
   * Aufrufe – z. B. Notiz speichern + Monat abschließen – keine Duplikate
   * erzeugen.
   */
  upsert: (
    accountId: string,
    month: string,
    mode: MonthlyReview["mode"],
    patch: Partial<Pick<MonthlyReview, "note" | "status">>,
  ) =>
    db.transaction("rw", db.monthlyReviews, async () => {
      const existing = (
        await db.monthlyReviews.where("accountId").equals(accountId).toArray()
      ).find((r) => r.month === month && (r.mode ?? "both") === (mode ?? "both"));
      if (existing) {
        await db.monthlyReviews.update(existing.id, { ...patch, updatedAt: now() });
        return existing.id;
      }
      const r: MonthlyReview = {
        id: uid(),
        accountId,
        month,
        mode,
        status: patch.status ?? "open",
        note: patch.note,
        createdAt: now(),
        updatedAt: now(),
      };
      await db.monthlyReviews.add(r);
      return r.id;
    }),
  remove: (id: string) => db.monthlyReviews.delete(id),
};

/* ---------- Vermögen / Net-Worth ---------- */

export const assets = {
  list: (accountId: string) =>
    db.assets.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Asset, "id" | "createdAt" | "updatedAt">): Promise<Asset> => {
    const a: Asset = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.assets.add(a);
    return a;
  },
  update: (id: string, patch: Partial<Asset>) =>
    db.assets.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.assets.delete(id),
};

/* ---------- Pipeline / Deals ---------- */

export const deals = {
  list: (accountId: string) =>
    db.deals.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Deal, "id" | "createdAt" | "updatedAt">): Promise<Deal> => {
    const d: Deal = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.deals.add(d);
    return d;
  },
  update: (id: string, patch: Partial<Deal>) =>
    db.deals.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.deals.delete(id),
};

/* ---------- Projekte & Aufgaben ---------- */

export const projects = {
  list: (accountId: string) =>
    db.projects.where("accountId").equals(accountId).toArray(),
  get: (id: string) => db.projects.get(id),
  create: async (
    data: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project> => {
    const p: Project = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.projects.add(p);
    return p;
  },
  update: (id: string, patch: Partial<Project>) =>
    db.projects.update(id, { ...patch, updatedAt: now() }),
  remove: async (id: string) => {
    // Aufgaben des Projekts mitlöschen, damit keine Waisen zurückbleiben.
    await db.tasks.where("projectId").equals(id).delete();
    await db.projects.delete(id);
  },
};

export const tasks = {
  list: (accountId: string) =>
    db.tasks.where("accountId").equals(accountId).toArray(),
  listByProject: (projectId: string) =>
    db.tasks.where("projectId").equals(projectId).toArray(),
  create: async (
    data: Omit<Task, "id" | "createdAt" | "updatedAt">,
  ): Promise<Task> => {
    const t: Task = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.tasks.add(t);
    return t;
  },
  update: (id: string, patch: Partial<Task>) =>
    db.tasks.update(id, { ...patch, updatedAt: now() }),
  /** Erledigt-Status setzen und dabei den Erledigungstag pflegen. */
  setDone: (id: string, done: boolean) =>
    db.tasks.update(id, { done, completedAt: done ? dayKey() : undefined, updatedAt: now() }),
  remove: (id: string) => db.tasks.delete(id),
};

export const screenTime = {
  list: (accountId: string) =>
    db.screenTime.where("accountId").equals(accountId).toArray(),
  /** Tageswert anlegen oder aktualisieren (genau ein Eintrag pro Tag). */
  upsert: async (accountId: string, date: string, patch: Partial<ScreenTimeLog>): Promise<void> => {
    const existing = await db.screenTime.where("accountId").equals(accountId).filter((l) => l.date === date).first();
    if (existing) {
      await db.screenTime.update(existing.id, { ...patch, updatedAt: now() });
    } else {
      await db.screenTime.add({ id: uid(), accountId, date, ...patch, createdAt: now(), updatedAt: now() });
    }
  },
  remove: (id: string) => db.screenTime.delete(id),
};

export const birthdays = {
  list: (accountId: string) =>
    db.birthdays.where("accountId").equals(accountId).toArray(),
  create: async (data: Omit<Birthday, "id" | "createdAt" | "updatedAt">): Promise<Birthday> => {
    const b: Birthday = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.birthdays.add(b);
    return b;
  },
  update: (id: string, patch: Partial<Birthday>) =>
    db.birthdays.update(id, { ...patch, updatedAt: now() }),
  remove: (id: string) => db.birthdays.delete(id),
};

/** Dexie-DB-Handle nur für Backup/Restore (kapselt sonst niemand an). */
export { db as _db };
