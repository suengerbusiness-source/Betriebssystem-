/*
  Geräte-Sync (Dexie Cloud) – Konfiguration.

  WICHTIG: Solange keine Datenbank-URL gespeichert ist, bleibt die App komplett
  lokal (das Cloud-Addon wird dann gar nicht erst geladen, siehe db.ts). Erst
  wenn hier eine URL hinterlegt ist, aktiviert sich der Sync.

  Diese Datei enthält bewusst KEINE Imports von db.ts (verhindert Zyklen) – nur
  das Lesen/Schreiben der URL in localStorage.
*/
const URL_KEY = "life-os.cloudUrl";

export function getCloudUrl(): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  return localStorage.getItem(URL_KEY) || undefined;
}

export function setCloudUrl(url: string): void {
  localStorage.setItem(URL_KEY, url.trim());
}

export function clearCloudUrl(): void {
  localStorage.removeItem(URL_KEY);
}

/** Ist der Sync grundsätzlich konfiguriert (URL vorhanden)? */
export function isSyncConfigured(): boolean {
  return !!getCloudUrl();
}
