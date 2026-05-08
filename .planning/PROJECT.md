# Lokale Spracherkennung mit Transformers.js

## What This Is

Eine lokale, datenschutzkonforme Spracherkennung im Frontend der c4 GenAI Suite, die Whisper (whisper-small, quantisiert q8) via Transformers.js direkt im Browser ausführt. Sie ergänzt die bestehenden cloudbasierten Optionen (Web Speech API, Azure Transcribe) als dritte konfigurierbare Variante im Extension-System.

## Core Value

Spracherkennung ohne dass Audiodaten den Browser verlassen — vollständige Datenschutzkonformität bei gleichzeitiger Beibehaltung der bestehenden Cloud-Optionen.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Lokale Whisper-Inferenz im Browser via Transformers.js (whisper-small q8 Modell)
- [ ] Integration als Backend-Extension im bestehenden Extension-System (wie speech-to-text / transcribe-azure)
- [ ] Aktivierbar pro Assistant über die Admin-UI
- [ ] On-Demand-Download des Whisper-Modells (~240MB) mit Caching im Browser (IndexedDB/Cache API)
- [ ] Fortschrittsanzeige (Progressbar) beim erstmaligen Modell-Download
- [ ] Sprachauswahl (de/en) über Dropdown wie bei bestehender SpeechRecognition
- [ ] Maximale Aufnahmedauer von 2 Minuten
- [ ] Record-then-Transcribe als initiale Implementierung (Aufnahme → Stopp → lokale Transkription)
- [ ] Echtzeit-Transkription als spätere Erweiterung vorbereiten (Architektur soll das ermöglichen)
- [ ] Bestehende Cloud-Optionen (speech-to-text, transcribe-azure) bleiben unverändert erhalten

### Out of Scope

- Echtzeit-Streaming-Transkription in v1 — architektonisch vorbereitet, aber nicht implementiert
- Modell-Auswahl durch Endnutzer — fest auf whisper-small q8, ggf. später konfigurierbar
- Vorab-Bundling des Modells — wird on-demand geladen, nicht in das App-Bundle integriert
- Offline-Fähigkeit — Erstdownload erfordert Internetverbindung

## Context

Die c4 GenAI Suite hat bereits zwei Spracheingabe-Mechanismen:

1. **speech-to-text** Extension: Nutzt `react-speech-recognition` (Browser Web Speech API). Liefert Echtzeit-Transkript, sendet Audio aber an Cloud-Dienste (Google). Aus Datenschutzgründen in vielen Umgebungen nicht einsetzbar.

2. **transcribe-azure** Extension: Nimmt Audio via MediaRecorder auf und sendet es an den Backend-Endpunkt (`/transcription`), der Azure Whisper nutzt. Kein Echtzeit, Record-then-Transcribe. Ebenfalls Cloud-abhängig.

Beide werden über das Extension-System pro Assistant konfiguriert. Die Sichtbarkeit im ChatInput wird über den Extension-Namen gesteuert (`ChatInput.tsx`, Zeilen 179-183).

Die neue lokale Variante folgt dem gleichen Muster: Backend registriert Extension, Frontend erkennt den Extension-Namen und zeigt den entsprechenden Button an. Die Inferenz läuft aber komplett im Browser (Web Worker + Transformers.js), ohne Backend-Roundtrip für die Transkription.

**Transformers.js** ermöglicht die Ausführung von ONNX-optimierten Whisper-Modellen direkt im Browser via WebAssembly (und optional WebGPU). Das whisper-small q8 Modell ist ca. 240MB groß und wird beim ersten Nutzen aus dem Hugging Face Hub geladen und im Browser gecacht.

## Constraints

- **Modellgröße**: whisper-small q8 ist ~240MB — erfordert einmaligen Download und sinnvolle UX dafür (Progressbar)
- **Browser-Kompatibilität**: Transformers.js benötigt Web Worker Support und SharedArrayBuffer (COOP/COEP Headers)
- **Inferenz-Performance**: Whisper-Inferenz im Browser ist langsamer als serverseitig — 2-Minuten-Aufnahmelimit hält das handhabbar
- **Tech Stack**: Frontend ist React 19 + TypeScript + Vite — Transformers.js muss als npm-Dependency integriert werden
- **Extension-System**: Muss dem bestehenden Pattern folgen (Backend-Extension mit Spec + Frontend-Erkennung über Extension-Name)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| whisper-small q8 statt whisper-base | Bessere Genauigkeit bei akzeptabler Modellgröße (~240MB vs ~140MB), q8 Quantisierung für reduzierte Dateigröße | Implemented |
| Record-then-Transcribe statt Echtzeit | Einfachere Erstimplementierung, Echtzeit architektonisch vorbereitet | — Pending |
| On-Demand-Download statt Bundling | App-Bundle bleibt klein, Modell wird nur bei Bedarf geladen | — Pending |
| 2 Minuten max. Aufnahmedauer | Praktikabel für lokale Inferenz, verhindert zu große Audiobuffer | — Pending |
| Backend-Extension wie bestehende | Konsistenz mit Extension-System, Admin kann pro Assistant aktivieren | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-07 after initialization*
