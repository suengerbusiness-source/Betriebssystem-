# 🧭 Life-OS – Mein persönliches Betriebssystem

> Phase 1 (MVP): Ein lokales, modernes „Cockpit" für dein Leben – Dashboard,
> Finanzen, Kalender und Vision Board. Alle Daten bleiben **lokal auf deinem
> Gerät** (local-first), mit Ein-Klick-Backup.

Dies ist das Fundament aus dem Phasenplan: klein, schön & solide statt groß &
kaputt. Es ist täglich benutzbar und so gebaut, dass die nächsten Phasen
(Projekte, PWA/Mobil, KI-Assistent, E-Mail) ohne Umbau aufgesetzt werden können.

---

## 🚀 So startest du das (Windows)

Voraussetzung: **[Node.js](https://nodejs.org/) 18+** installieren (LTS reicht).

Öffne die **Eingabeaufforderung** oder **PowerShell** im Projektordner und führe aus:

```bash
npm install      # einmalig: Abhängigkeiten installieren
npm run dev      # Entwicklungsserver starten
```

Danach im Browser öffnen: **http://localhost:5173**

Beim ersten Start legst du dein Konto an und wirst danach persönlich begrüßt.

### Weitere Befehle

```bash
npm run build      # Produktions-Build (Ordner dist/)
npm run preview    # den Produktions-Build lokal ansehen
npm run typecheck  # nur TypeScript prüfen
```

> 💡 macOS/Linux funktionieren identisch – dieselben Befehle im Terminal.

---

## ✅ Was Phase 1 kann (Akzeptanzkriterien)

1. **Konto & Login** – Konto anlegen, einloggen, tageszeit­abhängige Begrüßung.
2. **Kalender** – Termine farbig anlegen/bearbeiten/löschen; Monats-, Wochen-
   und Tagesansicht; Filter nach Farbe, Kategorie und Priorität.
3. **Finanzen** – Einnahmen & Ausgaben erfassen, kategorisieren; Monatsübersicht
   mit Saldo, 6-Monats-Verlauf und Ausgaben nach Kategorie (Diagramme).
4. **Vision Board** – Karten, Affirmationen und Bilder frei per Drag anordnen.
5. **Persistenz & Backup** – Alle Daten überleben einen Neustart; Export/Import
   als JSON (Einstellungen → Backup).
6. **Design** – modernes, ruhiges „Cockpit"; Dark/Light-Mode (Default: Dark).

---

## 🧱 Tech-Stack & warum

| Bereich        | Wahl                                   | Warum |
|----------------|----------------------------------------|-------|
| Frontend       | React + Vite + TypeScript              | Schnell, typsicher, Industriestandard |
| Styling        | Tailwind CSS + CSS-Variablen-Theme     | Konsistentes Design-System an einer Stelle |
| UI-Komponenten | eigene, shadcn-inspirierte Komponenten | Leichtgewichtig, voll anpassbar, keine Generator-Abhängigkeit |
| Icons          | lucide-react                           | Sauber, modern |
| Diagramme      | Recharts                               | Einfache, schöne Charts |
| Daten          | **IndexedDB via Dexie.js**             | Local-first, reaktive Queries (`dexie-react-hooks`) |
| Passwörter     | Web-Crypto **PBKDF2/SHA-256**          | Nativ, keine Extra-Abhängigkeit, nie Klartext |
| Routing/State  | react-router + React-Bordmittel        | „Zustand/Redux nur wo nötig" |

App-Typ: **reine Browser-/PWA-Variante** (wie in den offenen Entscheidungen
gewählt). Der Datenzugriff ist gekapselt, sodass später auf Tauri + SQLite oder
Sync umgestellt werden kann, **ohne die Oberfläche umzubauen**.

---

## 📁 Projektstruktur

```
src/
  lib/            # Hilfsfunktionen: cn, crypto (PBKDF2), Formatierung
  data/           # Die Datenschicht (austauschbar)
    types.ts      # Datenmodell (Account, Event, Transaction, VisionItem, …)
    db.ts         # Dexie/IndexedDB – EINZIGE Stelle mit Storage-Wissen
    repo.ts       # Repository-API: die UI greift NUR hierauf zu
    backup.ts     # Export/Import als JSON
  context/        # AuthContext (Login/Session), ThemeContext (Dark/Light)
  components/      # Wiederverwendbare UI + Layout (AppShell, Sidebar)
    ui/           # Button, Card, Input, Modal, Badge, StatTile, …
  features/       # Jedes Modul gekapselt:
    auth/         # Login & Ersteinrichtung
    dashboard/    # Home: Daily Briefing, Kennzahlen, Widgets
    finance/      # Einnahmen/Ausgaben, Übersicht, Diagramme
    calendar/     # Monats-/Wochen-/Tagesansicht, Filter
    vision/       # Vision Board (Drag-Canvas)
    settings/     # Backup, Theme, Konto, Sicherheitshinweis
  App.tsx         # Routing (eingeloggt vs. nicht)
  main.tsx        # Einstieg + Provider
```

**Architektur-Prinzip:** Die Oberfläche kennt nur `data/repo.ts`. Die konkrete
Datenbank (heute IndexedDB) lässt sich austauschen, ohne UI-Code zu ändern.
Neue Module = neuer Ordner unter `features/` + ein Eintrag in der Sidebar.

---

## 🔐 Sicherheit – ehrlich

- Daten liegen **lokal** im Browser (IndexedDB). Bei mehreren Konten sind die
  Daten über die `accountId` getrennt.
- Passwörter werden **nur als Hash** gespeichert (PBKDF2, 150k Iterationen), nie
  im Klartext.
- **Grenze (wichtig):** Das Passwort schützt den Login, **verschlüsselt aber
  nicht** die gespeicherten Daten. Wer Zugriff auf dieses entsperrte
  Gerät/Browser-Profil hat, kann die Daten lesen. Echte DB-Verschlüsselung mit
  Master-Passwort ist als spätere Erweiterung vorgesehen.
- Deshalb: **regelmäßig ein Backup exportieren** (Einstellungen → Backup).

---

## 🗺️ Nächste Schritte (Phase 2+)

Bereits im Datenmodell „mitgedacht", aber bewusst noch nicht gebaut:
Projekte & Aufgaben (Kanban), Budgets & wiederkehrende Buchungen, Steuern
(länderspezifisch – dann klären wir DE: EÜR/USt), Ziele/OKR, Suche/Command-
Palette, PWA-Installation, KI-Assistent, E-Mail-Anbindung.
