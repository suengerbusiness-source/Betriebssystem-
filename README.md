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

## ✅ Funktionsumfang

**Phase 1 – Fundament**
1. **Konto & Login** – Konto anlegen, einloggen, tageszeit­abhängige Begrüßung.
2. **Dashboard** – Daily Briefing, Kennzahlen, Widgets (Termine, offene Aufgaben,
   aktive Projekte, Finanz-Kurzstatus, Vision-Highlight).
3. **Kalender** – Termine farbig anlegen/bearbeiten/löschen; Monats-, Wochen-
   und Tagesansicht; Filter nach Farbe, Kategorie und Priorität.
4. **Finanzen** – Einnahmen & Ausgaben erfassen, kategorisieren; Monatsübersicht
   mit Saldo, 6-Monats-Verlauf und Ausgaben nach Kategorie (Diagramme).
5. **Vision Board** – Karten, Affirmationen und Bilder frei per Drag anordnen.
6. **Persistenz & Backup** – Alle Daten überleben einen Neustart; Export/Import
   als JSON (Einstellungen → Backup).
7. **Design** – modernes, ruhiges „Cockpit"; Dark/Light-Mode (Default: Dark).

**Phase 2 – Tiefe & Mobil**
8. **PWA** – installierbar auf Handy/iPad/Desktop, offline-fähig (Service Worker),
   mobile Bottom-Navigation.
9. **Projekte** – Kanban-Board (Idee/Aktiv/Pausiert/Fertig) mit Drag & Drop,
   Aufgabenlisten mit Fortschritt, Deadlines, Listen-Ansicht.
10. **Finanzen erweitert** – Budgets (Soll/Ist), wiederkehrende Buchungen,
    Vermögen/Net-Worth-Tracker und Pipeline/Mini-CRM für Kooperationen.
11. **Globale Suche / Command-Palette** – ⌘/Strg-K: alles finden & Aktionen starten.
12. **Modus Business / Privat / Beides** – jede Buchung getrennt erfassen und
    Finanzen/Analyse nach Modus filtern.
13. **Analyse / Monatsabschluss** – Buchungen prüfen (einhaken), beschriften &
    protokollieren; Durchschnittswerte der Vormonate, Trends und Kategorie-
    Vergleiche; **Kontoauszug-Import (CSV)** – alles lokal.
14. **Heute (Daily-Driver)** – Quick-Capture-Inbox (GTD), Aufgaben für heute
    (eigenständig oder aus Projekten), Termine und Gewohnheiten mit Streaks.
15. **Ziele & OKR** – Jahresvision → Quartalsziele → messbare Key Results mit
    Fortschritt und Verknüpfung.
16. **Rechnungen & Steuer (DE)** – Kunden, Rechnungen mit USt (0/7/19 %,
    Kleinunternehmer §19), Status & Mahnstand, **PDF-Druck**, „Bezahlt → Einnahme",
    Belege an Buchungen, **EÜR-/Steuer-CSV-Export**.
17. **Projekt-Rentabilität & Zeiterfassung** – Stoppuhr + manuelle Zeiten je
    Projekt, Buchungen dem Projekt zuordnen, „lohnt sich das?" (Aufwand vs. Ertrag).

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
    today/        # „Heute": Quick Capture, Aufgaben, Gewohnheiten
    finance/      # Übersicht, Budgets, Wiederkehrend, Vermögen, Pipeline
    invoices/     # Kunden, Rechnungen, USt, PDF-Druck
    tax/          # EÜR-/Steuer-Export (CSV)
    analysis/     # Monatsabschluss, Durchschnitte, CSV-Import
    projects/     # Kanban, Aufgaben, Zeiterfassung, Rentabilität
    goals/        # Ziele & OKR (Key Results)
    vision/       # Vision Board (Drag-Canvas)
    settings/     # Backup, Theme, Konto, App-Installation, Sicherheit
  components/command/  # Globale Command-Palette (⌘/Strg-K)
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

## 🗺️ Nächste Schritte (Phase 3)

Bereits im Datenmodell „mitgedacht", aber noch nicht gebaut:
Benachrichtigungen/Erinnerungen, KI-Assistent mit Zugriff auf die Daten,
E-Mail-Anbindung, Geräte-Sync.
