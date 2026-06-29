/*
  Einmal-Helfer: tauscht den TikTok-OAuth-`code` (aus der Weiterleitungs-URL)
  gegen einen langlebigen Refresh-Token. Wird über den Workflow
  „TikTok-Token holen" (workflow_dispatch) aufgerufen. Client-Key/-Secret kommen
  aus GitHub Secrets, der `code` als Eingabe – nichts davon steht im Code.
*/
const env = process.env;

const code = (env.TIKTOK_AUTH_CODE || "").trim();
const redirectUri = env.TIKTOK_REDIRECT_URI || "https://suengerbusiness-source.github.io/Betriebssystem-/";

if (!code) {
  console.error("FEHLER: Kein code angegeben.");
  process.exit(1);
}
if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) {
  console.error("FEHLER: TIKTOK_CLIENT_KEY und/oder TIKTOK_CLIENT_SECRET fehlen als Secret.");
  process.exit(1);
}

// TikTok hängt an den code oft ein URL-kodiertes Suffix (z. B. %2A) -> dekodieren.
const cleanCode = decodeURIComponent(code).replace(/#.*$/, "").replace(/\*$/, "");

const body = new URLSearchParams({
  client_key: env.TIKTOK_CLIENT_KEY,
  client_secret: env.TIKTOK_CLIENT_SECRET,
  code: cleanCode,
  grant_type: "authorization_code",
  redirect_uri: redirectUri,
});

const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
});
const d = await res.json().catch(() => ({}));

if (!d.refresh_token) {
  console.error("FEHLGESCHLAGEN. Antwort von TikTok:");
  console.error(JSON.stringify(d, null, 2));
  console.error("\nHäufige Ursachen: code abgelaufen (nur ~Minuten gültig -> neu holen),");
  console.error("redirect_uri stimmt nicht exakt mit der App-Einstellung überein, oder");
  console.error("Konto ist kein Target User der Sandbox.");
  process.exit(1);
}

console.log("==================================================");
console.log(" ERFOLG! Kopiere den folgenden Wert und lege ihn");
console.log(" als GitHub-Secret  TIKTOK_REFRESH_TOKEN  an:");
console.log("==================================================");
console.log(d.refresh_token);
console.log("==================================================");
console.log("Gültig (refresh_expires_in) ~Sekunden:", d.refresh_expires_in);
console.log("Danach den Workflow Live-Daten aktualisieren starten.");
