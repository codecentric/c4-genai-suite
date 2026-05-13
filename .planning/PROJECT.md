# Lokale Spracherkennung mit Transformers.js

## What This Is

Eine lokale, datenschutzkonforme Spracherkennung im Frontend der c4 GenAI Suite, die Whisper (whisper-small, quantisiert q8, ~240MB) via Transformers.js direkt im Browser ausfuehrt. Integriert als dritte konfigurierbare Variante im Extension-System neben Web Speech API und Azure Transcribe. Unterstuetzt Deutsch und Englisch, mit Fortschrittsanzeige beim Modell-Download, zweischichtiger Stille-Erkennung, und vollstaendiger Fehlerbehandlung.

## Core Value

Spracherkennung ohne dass Audiodaten den Browser verlassen -- vollstaendige Datenschutzkonformitaet bei gleichzeitiger Beibehaltung der bestehenden Cloud-Optionen.

## Requirements

### Validated

- ✓ Lokale Whisper-Inferenz im Browser via Transformers.js (whisper-small q8 Modell) -- v1.0
- ✓ Integration als Backend-Extension im bestehenden Extension-System -- v1.0
- ✓ Aktivierbar pro Assistant ueber die Admin-UI -- v1.0
- ✓ On-Demand-Download des Whisper-Modells (~240MB) mit Caching im Browser -- v1.0
- ✓ Fortschrittsanzeige (Progressbar) beim erstmaligen Modell-Download -- v1.0
- ✓ Sprachauswahl (de/en) ueber Dropdown -- v1.0
- ✓ Maximale Aufnahmedauer von 2 Minuten -- v1.0
- ✓ Record-then-Transcribe Implementierung -- v1.0
- ✓ Bestehende Cloud-Optionen bleiben unveraendert erhalten -- v1.0
- ✓ Vollstaendige Fehlerbehandlung (Mic-Verweigerung, Browser-Inkompatibilitaet, Download-Fehler, leere Transkription) -- v1.0
- ✓ Zweischichtige Stille-Erkennung (RMS + Halluzinationsfilter) -- v1.0
- ✓ Recording-Timer und Privacy-Badge -- v1.0

### Active

- [ ] Echtzeit-Transkription als spaetere Erweiterung (Architektur ist vorbereitet)
- [ ] Audio-Level-Visualisierung waehrend der Aufnahme
- [ ] Admin-konfigurierbare Whisper-Modellwahl (tiny/base/small)

### Out of Scope

- Echtzeit-Streaming-Transkription in v1 -- Whisper ist ein Batch-Modell, Chunking fuegt massive Komplexitaet hinzu
- Modell-Auswahl durch Endnutzer -- fest auf whisper-small q8, kein User-facing UI dafuer
- Vorab-Bundling des Modells -- wird on-demand geladen, App-Bundle bleibt klein
- Offline-Faehigkeit -- Erstdownload erfordert Internetverbindung, vollstaendige Offline-Faehigkeit separates Projekt
- Auto-Send nach Transkription -- Nutzer muss Text vor dem Senden pruefen koennen
- Multi-Speaker Diarization -- Whisper-small unterstuetzt das nicht, in Chat-Kontext irrelevant
- Audio-Datei-Upload -- anderes UX-Paradigma, separates Feature

## Context

Shipped v1.0 with 856 LOC production TypeScript/React across 8 files.
Tech stack: React 19, Vite, Transformers.js (ONNX/WASM/WebGPU), Web Workers, NestJS Extension System.
Test coverage: 176 frontend tests, 225 backend tests, 30/33 E2E tests (3 pre-existing REIS failures).
All 34 v1 requirements satisfied and verified via milestone audit cross-reference.

The implementation uses a singleton Whisper pipeline in a dedicated Web Worker with WebGPU auto-detection and WASM fallback. Audio capture via MediaRecorder, resampled to 16kHz mono Float32Array with zero-copy Transferable transfer to the Worker. Two-layer silence detection prevents Whisper hallucination on silent input.

Known non-blocking items from audit: DownloadProgressBanner "Ready!" state is dead code, Worker instantiated for all assistants (not just transcribe-local), error code fallback handler, orphaned `loadFailed` i18n key.

## Constraints

- **Modellgroesse**: whisper-small q8 ist ~240MB -- erfordert einmaligen Download und sinnvolle UX dafuer (Progressbar)
- **Browser-Kompatibilitaet**: Transformers.js benoetigt Web Worker Support und SharedArrayBuffer (COOP/COEP Headers)
- **Inferenz-Performance**: Whisper-Inferenz im Browser ist langsamer als serverseitig -- 2-Minuten-Aufnahmelimit haelt das handhabbar
- **Tech Stack**: Frontend ist React 19 + TypeScript + Vite -- Transformers.js als npm-Dependency integriert
- **Extension-System**: Folgt dem bestehenden Pattern (Backend-Extension mit Spec + Frontend-Erkennung ueber Extension-Name)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| whisper-small q8 statt whisper-base | Bessere Genauigkeit bei akzeptabler Modellgroesse (~240MB vs ~140MB), q8 Quantisierung | ✓ Good |
| Record-then-Transcribe statt Echtzeit | Einfachere Erstimplementierung, Echtzeit architektonisch vorbereitet | ✓ Good |
| On-Demand-Download statt Bundling | App-Bundle bleibt klein, Modell wird nur bei Bedarf geladen | ✓ Good |
| 2 Minuten max. Aufnahmedauer | Praktikabel fuer lokale Inferenz, verhindert zu grosse Audiobuffer | ✓ Good |
| Backend-Extension wie bestehende | Konsistenz mit Extension-System, Admin kann pro Assistant aktivieren | ✓ Good |
| COOP/COEP credentialless statt require-corp | Vermeidet Breaking Changes bei bestehenden Cross-Origin-Ressourcen | ✓ Good |
| Singleton Worker Pipeline | Vermeidet Re-Init pro Transkription, holt Modell einmal und haelt es im Speicher | ✓ Good |
| RMS + Halluzinationsfilter (zweischichtig) | RMS-Check spart Inferenz bei Stille, Halluzinationsfilter faengt bekannte Whisper-Outputs | ✓ Good |
| Render-phase state derivation | React-idiomatisches Pattern fuer prop-transition-Detection ohne ESLint-Verletzungen | ✓ Good |

---
*Last updated: 2026-05-08 after v1.0 milestone*
