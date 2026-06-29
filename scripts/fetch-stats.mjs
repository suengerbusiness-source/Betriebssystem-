/*
  Holt öffentliche Kennzahlen (Follower, Aufrufe, Likes, …) der vier
  Hauptplattformen und schreibt sie nach public/stats.json. Läuft im GitHub-
  Action-Zeitplan (alle 12 h) – ohne npm-Abhängigkeiten (Node 20 global fetch).

  Zugangsdaten kommen ausschließlich aus Umgebungsvariablen (GitHub Secrets) –
  niemals im Code. Fehlt eine Plattform-Konfiguration, wird sie sauber
  übersprungen (configured:false), die anderen laufen normal weiter.
*/
import { mkdir, writeFile } from "node:fs/promises";

const env = process.env;

async function getJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

const numOr = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

async function youtube() {
  if (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CHANNEL_ID) return { configured: false, ok: false };
  try {
    const d = await getJson(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(env.YOUTUBE_CHANNEL_ID)}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`,
    );
    const s = d.items?.[0]?.statistics ?? {};
    return { configured: true, ok: true, followers: numOr(s.subscriberCount), views: numOr(s.viewCount), videos: numOr(s.videoCount) };
  } catch (e) {
    return { configured: true, ok: false, error: String(e.message || e) };
  }
}

async function instagram() {
  if (!env.IG_ACCESS_TOKEN) return { configured: false, ok: false };
  try {
    // „Instagram API mit Instagram-Login": braucht nur das Token, keine
    // Facebook-Seite. `me` löst sich aus dem Token auf -> keine IG_USER_ID nötig.
    const d = await getJson(
      `https://graph.instagram.com/v21.0/me?fields=followers_count,media_count&access_token=${encodeURIComponent(env.IG_ACCESS_TOKEN)}`,
    );
    return { configured: true, ok: true, followers: numOr(d.followers_count), videos: numOr(d.media_count) };
  } catch (e) {
    return { configured: true, ok: false, error: String(e.message || e) };
  }
}

async function facebook() {
  if (!env.FB_ACCESS_TOKEN) return { configured: false, ok: false };
  const v = "v21.0";
  const token = env.FB_ACCESS_TOKEN;
  try {
    let pageId = env.FB_PAGE_ID;
    let pageToken = token;
    // Folgezahlen (followers_count) gibt es nur auf einer Facebook-SEITE, nicht
    // auf dem persönlichen Profil. Ist keine FB_PAGE_ID gesetzt, lösen wir Seite
    // + Seiten-Token automatisch über das Konto auf. Dadurch ist es egal, ob im
    // Secret ein Nutzer-Token ODER ein Seiten-Token liegt – beides führt zur
    // Seite (setzt die Berechtigung pages_show_list voraus).
    if (!pageId) {
      const accounts = await getJson(
        `https://graph.facebook.com/${v}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token)}`,
      ).catch((e) => ({ _error: String(e.message || e) }));
      const page = accounts?.data?.[0];
      if (page?.id) {
        pageId = page.id;
        if (page.access_token) pageToken = page.access_token;
      } else {
        // Hilft bei der Diagnose im Action-Log: kein Seiten-Token / keine Seite.
        console.log("Facebook: me/accounts ohne Seite ->", JSON.stringify(accounts));
      }
    }
    // Fällt die Auflösung aus (z. B. weil schon ein reiner Seiten-Token gesetzt
    // ist), versuchen wir es mit `me` – dann ist `me` bereits die Seite.
    const target = pageId ? encodeURIComponent(pageId) : "me";
    const d = await getJson(
      `https://graph.facebook.com/${v}/${target}?fields=followers_count,fan_count&access_token=${encodeURIComponent(pageToken)}`,
    );
    return { configured: true, ok: true, followers: numOr(d.followers_count ?? d.fan_count) };
  } catch (e) {
    return { configured: true, ok: false, error: String(e.message || e) };
  }
}

async function tiktok() {
  if (!env.TIKTOK_ACCESS_TOKEN) return { configured: false, ok: false };
  try {
    const d = await getJson("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count", {
      headers: { Authorization: `Bearer ${env.TIKTOK_ACCESS_TOKEN}` },
    });
    const u = d.data?.user ?? {};
    return { configured: true, ok: true, followers: numOr(u.follower_count), likes: numOr(u.likes_count), videos: numOr(u.video_count) };
  } catch (e) {
    return { configured: true, ok: false, error: String(e.message || e) };
  }
}

async function main() {
  const platforms = {
    youtube: await youtube(),
    instagram: await instagram(),
    facebook: await facebook(),
    tiktok: await tiktok(),
  };
  const anyOk = Object.values(platforms).some((p) => p.ok);
  const out = { updatedAt: anyOk ? new Date().toISOString() : null, platforms };
  await mkdir("public", { recursive: true });
  await writeFile("public/stats.json", JSON.stringify(out, null, 2) + "\n");
  console.log("stats.json geschrieben:", JSON.stringify(platforms, null, 2));
}

// Niemals den Workflow scheitern lassen – Daten sind „best effort".
main().catch((e) => {
  console.error("Fehler beim Schreiben der Statistiken:", e);
  process.exit(0);
});
