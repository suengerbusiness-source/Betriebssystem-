/*
  Passwort-Hashing für die lokalen Konten.

  Wir nutzen das native Web-Crypto-API (PBKDF2/SHA-256) statt einer
  JS-Implementierung von bcrypt/argon2. Gründe:
   - Es ist im Browser eingebaut (keine zusätzliche Abhängigkeit/WASM),
   - nutzt schnelle, geprüfte native Kryptografie,
   - und erfüllt das Ziel aus der Spec: Passwörter werden NIE im Klartext
     gespeichert, sondern nur als Hash + Salt.

  ⚠️ Ehrliche Grenze (siehe README/Sicherheit): Das Hashing schützt den
  Passwort-Wert. Es verschlüsselt NICHT die eigentlichen Daten in IndexedDB –
  wer Zugriff auf den entsperrten Rechner/Browser hat, kann die Daten lesen.
  Echte DB-Verschlüsselung mit Master-Passwort ist als spätere Erweiterung
  vorgesehen.
*/

const ITERATIONS = 150_000;
const KEY_LENGTH = 32; // Bytes

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Erzeugt ein zufälliges Salt (base64-kodiert). */
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bufToBase64(salt.buffer);
}

/** Hasht ein Passwort mit gegebenem Salt -> base64-Hash. */
export async function hashPassword(password: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBuf(saltB64),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return bufToBase64(bits);
}

/** Prüft ein Passwort gegen einen gespeicherten Hash (zeitkonstanter Vergleich). */
export async function verifyPassword(
  password: string,
  saltB64: string,
  expectedHash: string,
): Promise<boolean> {
  const actual = await hashPassword(password, saltB64);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

/** Kurze, eindeutige ID (für Entitäten). */
export function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
