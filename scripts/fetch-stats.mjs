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
  try {
    // Mit einem SEITEN-Token löst `me` automatisch die Facebook-Seite auf ->
    // keine FB_PAGE_ID nötig. Ist eine FB_PAGE_ID gesetzt, wird sie genutzt.
    const target = env.FB_PAGE_ID ? encodeURIComponent(env.FB_PAGE_ID) : "me";
    const d = await getJson(
      `https://graph.facebook.com/v21.0/${target}?fields=followers_count,fan_count&access_token=${encodeURIComponent(env.FB_ACCESS_TOKEN)}`,
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
