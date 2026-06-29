# Live-Daten der Plattformen (automatisch alle 12 Stunden)

Diese App kann **Follower, Aufrufe und weitere Kennzahlen** von YouTube,
Instagram, Facebook und TikTok automatisch holen und im Unternehmen-Modul
unter **Kanäle → „Live-Daten"** anzeigen.

So funktioniert es – kostenlos, sicher, ressourcenschonend:

- Ein GitHub-Action-Zeitplan (`.github/workflows/stats.yml`) läuft **alle 12 h**,
  ruft die offiziellen APIs ab und veröffentlicht die App mit frischer
  `stats.json` neu. Nur 2 kurze Läufe pro Tag.
- Deine Zugangsdaten liegen **ausschließlich in GitHub Secrets** (verschlüsselt),
  niemals im Code oder in der ausgelieferten App.
- Veröffentlicht werden **nur öffentliche Kennzahlen** (Follower/Aufrufe). Deine
  Finanzen bleiben weiterhin nur lokal auf deinem Gerät.

> Gross-„Entfollower" liefert keine Plattform-API direkt. Die App zeigt
> stattdessen die **Netto-Veränderung** der Follower seit dem letzten Abruf
> (+/- als kleine Zahl) – das deckt Zuwachs und Verluste ab.

## Secrets hinterlegen

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Du musst nicht alle vier auf einmal machen – jede Plattform funktioniert für
sich, sobald ihre Secrets gesetzt sind.

### YouTube (am einfachsten)
1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt
   anlegen, **YouTube Data API v3** aktivieren, einen **API-Schlüssel** erstellen.
2. Deine **Channel-ID** kopieren (YouTube Studio → Einstellungen → Kanal →
   Erweiterte Einstellungen).
3. Secrets: `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`.

### Instagram (Creator- oder Business-Konto – einfacher Weg, ohne Facebook-Seite)
1. Instagram muss ein **Professional-Konto** sein (Creator **oder** Business – beides geht).
2. Im [Meta-Entwicklerportal](https://developers.facebook.com/) eine App anlegen →
   **Produkt „Instagram" → „API-Setup mit Instagram-Login"**.
3. Dort dein Instagram-Konto verbinden und ein **Access-Token generieren**
   (Scope u. a. `instagram_business_basic`).
4. Secret: nur `IG_ACCESS_TOKEN` (keine `IG_USER_ID` nötig).

> Genutzt wird `https://graph.instagram.com/v21.0/me?fields=followers_count,media_count`.
> Das Token läuft nach ~60 Tagen ab und kann über `refresh_access_token` erneuert werden.

### Facebook-Seite
1. Gleiche Meta-App wie oben; **Page-ID** und **Page-Access-Token**.
2. Secrets: `FB_PAGE_ID`, `FB_ACCESS_TOKEN`.

### TikTok (aufwendigste Einrichtung)
1. Im [TikTok-Entwicklerportal](https://developers.tiktok.com/) eine App
   anlegen, **Login Kit / Display API** mit Scope `user.info.stats`.
2. Über den OAuth-Flow ein **Access-Token** erhalten (Tokens laufen ab und
   müssen erneuert werden).
3. Secret: `TIKTOK_ACCESS_TOKEN`.

## Sofort testen

Nach dem Hinterlegen der Secrets: Repo → **Actions → „Live-Daten aktualisieren"
→ Run workflow** (manuell). Danach erscheinen die Zahlen in der App.

Geplante (cron) Läufe starten nur, wenn `stats.yml` auf dem **Standard-Branch**
des Repos liegt – bis dahin den manuellen Start verwenden.
