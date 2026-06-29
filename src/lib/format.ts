import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

/*
  Privatsphäre-Modus: ein globaler Schalter, der ALLE Geldbeträge maskiert.
  Wird zentral hier umgelegt (PrivacyContext setzt das Flag), damit jede
  Geldanzeige der App ohne Änderung am Aufrufort verdeckt wird.
*/
let amountsHidden = false;
/** Maske für verdeckte Beträge. */
export const AMOUNT_MASK = "••• €";

export function setAmountsHidden(hidden: boolean): void {
  amountsHidden = hidden;
}

export function areAmountsHidden(): boolean {
  return amountsHidden;
}

/** Währungsbetrag formatieren (Standard: EUR, de-DE). */
export function formatCurrency(amount: number, currency = "EUR"): string {
  if (amountsHidden) return AMOUNT_MASK;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Kompakte Geldanzeige ohne Nachkommastellen für große Übersichten. */
export function formatCurrencyShort(amount: number, currency = "EUR"): string {
  if (amountsHidden) return AMOUNT_MASK;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** ISO-String / Date -> lesbares Datum, z. B. "Mo, 27. Juni". */
export function formatDate(value: string | Date, pattern = "EEE, d. MMMM"): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern, { locale: de });
}

/** Uhrzeit "HH:mm". */
export function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "HH:mm", { locale: de });
}

/** Tageszeit-abhängige Begrüßung. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  if (hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

/** yyyy-MM-dd des heutigen Tages (lokal). */
export function todayISODate(): string {
  return format(new Date(), "yyyy-MM-dd");
}
