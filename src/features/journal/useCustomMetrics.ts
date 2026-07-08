import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { customMetrics as customMetricsRepo } from "@/data/repo";
import type { CustomMetric } from "@/data/types";
import { customToDescriptor, setCustomMetrics, type MetricDescriptor } from "./checkin.metrics";

/**
 * Lädt die eigenen Tracker eines Kontos, hält die Metrik-Registry aktuell (für
 * Label-/ID-Lookups in Auswertung & Export) und liefert:
 *  - `all`: alle Tracker (inkl. archivierter) für die Verwaltung,
 *  - `active`: die aktiven Deskriptoren (sortiert) für Formular & Analyse.
 */
export function useCustomMetrics(accountId?: string): { all: CustomMetric[]; active: MetricDescriptor[] } {
  const all = useLiveQuery(() => (accountId ? customMetricsRepo.list(accountId) : []), [accountId]) ?? [];

  const active = useMemo(
    () =>
      all
        .filter((c) => !c.archived)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
        .map(customToDescriptor),
    [all],
  );

  // Registry synchron aktuell halten – idempotent und günstig (wenige Einträge).
  setCustomMetrics(all);

  return { all, active };
}
