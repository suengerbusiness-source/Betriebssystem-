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
Funktioniert nur mit einer **Facebook-Seite** (nicht mit dem persönlichen Profil)
und einem **Seiten-Access-Token** (Page Access Token, Berechtigung u. a.
`pages_read_engagement`).
1. Token über den Graph API Explorer holen (`me/accounts` → Seite + deren Token).
2. Secret: nur `FB_ACCESS_TOKEN` (Seiten-Token). `me` löst damit automatisch die
   Seite auf – `FB_PAGE_ID` ist optional und nur nötig, wenn das Token mehrere
   Seiten umfasst.

### TikTok (aufwendigste Einrichtung)
TikTok-Access-Tokens laufen nach ~24 h ab. Damit der 12-h-Zeitplan dauerhaft
läuft, holt sich das Skript bei jedem Lauf aus **Client-Key + Secret +
Refresh-Token** automatisch ein frisches Access-Token (Refresh-Token gilt
~365 Tage – danach einmal neu autorisieren).

1. Im [TikTok-Entwicklerportal](https://developers.tiktok.com/) registrieren,
   eine App anlegen und **Login Kit** mit Scope `user.info.stats` hinzufügen.
2. **Client Key** und **Client Secret** der App notieren.
3. Einmal den OAuth-Login durchlaufen (eigenes Konto als Test-/Zielnutzer) und
   den **Refresh-Token** aus der Token-Antwort kopieren.
4. Drei Secrets: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`,
   `TIKTOK_REFRESH_TOKEN`.

> Für einen schnellen Einmal-Test geht auch ein direktes `TIKTOK_ACCESS_TOKEN`
> (hat Vorrang), läuft aber nach ~24 h ab.

## Sofort testen

Nach dem Hinterlegen der Secrets: Repo → **Actions → „Live-Daten aktualisieren"
→ Run workflow** (manuell). Danach erscheinen die Zahlen in der App.

Geplante (cron) Läufe starten nur, wenn `stats.yml` auf dem **Standard-Branch**
des Repos liegt – bis dahin den manuellen Start verwenden.
