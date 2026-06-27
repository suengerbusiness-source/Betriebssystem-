import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Klassen zusammenführen und Tailwind-Konflikte sauber auflösen. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
