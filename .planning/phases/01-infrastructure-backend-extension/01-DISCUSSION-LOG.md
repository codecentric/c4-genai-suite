# Phase 1: Infrastructure & Backend Extension - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 1-Infrastructure & Backend Extension
**Areas discussed:** Extension-Konfiguration, COOP/COEP-Scope, Extension-Registrierung

---

## Extension-Konfiguration

### Admin-konfigurierbare Einstellungen

| Option | Description | Selected |
|--------|-------------|----------|
| Reiner An/Aus-Schalter | Wie speech-to-text: keine Config-Felder. Sprache wird im Frontend per User gewählt. | |
| Standard-Sprache pro Assistant | Ein Config-Feld für die Default-Sprache (de/en). Admin legt pro Assistant fest, User kann im Frontend ändern. | ✓ |
| Claude entscheidet | Researcher/Planner analysiert bestehende Patterns und entscheidet. | |

**User's choice:** Standard-Sprache pro Assistant
**Notes:** Extension bekommt `defaultLanguage` Config-Feld wie transcribe-azure's `arguments` Pattern.

### Sprachoptionen

| Option | Description | Selected |
|--------|-------------|----------|
| Nur de/en | Whisper-base unterstützt viele Sprachen, aber v1 fokussiert auf de/en. Später erweiterbar. | ✓ |
| Offen per Freitext | Admin gibt ISO-Code ein. Flexibel für alle Whisper-Sprachen. | |
| Top-5 Sprachen | de, en, fr, es, it als Select-Optionen. | |

**User's choice:** Nur de/en
**Notes:** Klare v1-Fokussierung. Erweiterung auf weitere Sprachen in späteren Versionen möglich.

### Required vs. Optional

| Option | Description | Selected |
|--------|-------------|----------|
| Required mit Default 'de' | Admin muss wählen, vorausgewählt ist 'de'. Kein unbestimmter Zustand. | ✓ |
| Optional, Fallback 'de' | Wenn Admin nichts wählt, wird 'de' als Default genommen. | |

**User's choice:** Required mit Default 'de'
**Notes:** None

---

## COOP/COEP-Scope

### Header-Platzierung

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Vite Dev Server | Phase 1 fokussiert auf Dev-Umgebung. Produktions-Headers kommen später. | ✓ |
| Dev + Produktion gleichzeitig | Vite Dev Server UND Docker/Caddy in einem Schritt. | |
| Nur Backend-Middleware | NestJS setzt die Headers per Middleware. | |

**User's choice:** Nur Vite Dev Server
**Notes:** Produktions-Headers werden separat konfiguriert wenn die App stabil läuft.

### Regressions-Prüfung

| Option | Description | Selected |
|--------|-------------|----------|
| Bestehende E2E-Tests reichen | Playwright-Tests verifizieren Login, Chat, bestehende Transkription. | ✓ |
| Manuelle Checkliste | Zusätzlich zur E2E-Suite manuelle Prüfung der Cross-Origin-Features. | |
| Feature-Flag / Conditional Headers | Headers nur bei aktivem ENV-Flag. Schnelles Zurückrollen. | |

**User's choice:** Bestehende E2E-Tests reichen
**Notes:** Keine zusätzlichen manuellen Checks oder Feature-Flags nötig.

### Fallback-Strategie

| Option | Description | Selected |
|--------|-------------|----------|
| Proxy anpassen | CORP-Header zum Backend-Proxy hinzufügen. credentialless beibehalten. | ✓ |
| Claude entscheidet | Researcher analysiert das Problem und wählt die beste Lösung. | |

**User's choice:** Proxy anpassen
**Notes:** credentialless bleibt die COEP-Policy. Bei Problemen wird der Proxy angepasst, nicht die Policy gewechselt.

---

## Extension-Registrierung

### Logo/Icon

| Option | Description | Selected |
|--------|-------------|----------|
| Mikrofon mit Schloss/Shield | Mikrofon-Icon mit Privacy-Symbol. Signalisiert 'lokal & privat'. | ✓ |
| Transformers.js / HuggingFace Logo | Offizielles HuggingFace-Logo. Zeigt Technologie. | |
| Gleiches Mikrofon wie speech-to-text | Konsistent, Unterscheidung nur über Titel. | |
| Claude entscheidet | Passendes SVG wird beim Implementieren ausgewählt. | |

**User's choice:** Mikrofon mit Schloss/Shield
**Notes:** Privacy-Kommunikation als zentrales Differenzierungsmerkmal.

### Titel und Beschreibung

| Option | Description | Selected |
|--------|-------------|----------|
| "Lokale Spracherkennung" | Titel: 'Lokale Spracherkennung' / 'Local Speech Recognition'. Beschreibung betont lokale Verarbeitung. | ✓ |
| "Whisper (Lokal)" | Technischer Name. Klar für Admins die Whisper kennen. | |
| "Transcribe Local" | Englisch-only, konsistent mit 'Transcribe Azure'. | |

**User's choice:** "Lokale Spracherkennung" / "Local Speech Recognition"
**Notes:** Beschreibung soll klar kommunizieren, dass Audio den Browser nicht verlässt.

### Sortierung

| Option | Description | Selected |
|--------|-------------|----------|
| Nach den Cloud-Optionen | Reihenfolge: Speech-to-Text, Transcribe Azure, Lokale Spracherkennung. | ✓ |
| Vor den Cloud-Optionen | Lokale Spracherkennung zuerst als privacy-first Option. | |
| Claude entscheidet | Sortierlogik wird analysiert und passend platziert. | |

**User's choice:** Nach den Cloud-Optionen
**Notes:** Bestehende Reihenfolge bleibt unverändert, neue Option wird angefügt.

---

## Claude's Discretion

None — all decisions made by user.

## Deferred Ideas

None — discussion stayed within phase scope.
