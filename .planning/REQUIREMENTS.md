# Requirements: Lokale Spracherkennung mit Transformers.js

**Defined:** 2026-05-07
**Core Value:** Spracherkennung ohne dass Audiodaten den Browser verlassen — vollständige Datenschutzkonformität bei gleichzeitiger Beibehaltung der bestehenden Cloud-Optionen.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Vite-Konfiguration unterstützt ONNX-Runtime und Web Worker Bundling (optimizeDeps.exclude, assetsInclude) — Phase 1
- [x] **INFRA-02**: COOP/COEP Headers sind im Vite Dev Server konfiguriert für SharedArrayBuffer-Support (mit credentialless statt require-corp) — Phase 1
- [x] **INFRA-03**: @huggingface/transformers ist als npm-Dependency installiert — Phase 1
- [x] **INFRA-04**: Bestehende App-Funktionalität ist nach Header-Änderungen nicht beeinträchtigt (Regression) — Phase 1

### Backend Extension

- [x] **EXT-01**: Backend-Extension 'transcribe-local' ist im Extension-System registriert (group: speech-to-text, type: other) — Phase 1
- [x] **EXT-02**: Extension ist pro Assistant über die Admin-UI aktivierbar/deaktivierbar — Phase 1
- [x] **EXT-03**: Extension ist mutual exclusive mit bestehenden speech-to-text/transcribe-azure Extensions (gleiche Gruppe) — Phase 1

### Web Worker & Pipeline

- [ ] **WORK-01**: Whisper-Inferenz läuft in einem dedizierten Web Worker (kein Main-Thread-Blocking)
- [ ] **WORK-02**: Transformers.js Pipeline wird als Singleton im Worker gehalten (kein Re-Init pro Transkription)
- [ ] **WORK-03**: Worker verwendet WebGPU automatisch wenn verfügbar, fällt auf WASM zurück
- [ ] **WORK-04**: Worker meldet Modell-Download-Fortschritt an Main Thread (loaded/total bytes)
- [ ] **WORK-05**: Worker unterstützt Sprachparameter (de/en) für gezielte Transkription

### Audio-Verarbeitung

- [ ] **AUDIO-01**: Audio wird via MediaRecorder aufgenommen (wie bestehender useTranscribe Hook)
- [ ] **AUDIO-02**: Aufgenommenes Audio wird via OfflineAudioContext auf 16kHz Mono Float32Array resampled
- [ ] **AUDIO-03**: Float32Array wird als Transferable an Web Worker übergeben (Zero-Copy)
- [ ] **AUDIO-04**: Maximale Aufnahmedauer ist auf 2 Minuten begrenzt mit Auto-Stopp

### Modell-Management

- [ ] **MODEL-01**: whisper-base Modell (~140MB) wird beim ersten Nutzen on-demand von Hugging Face Hub geladen
- [ ] **MODEL-02**: Modell wird nach Download im Browser gecacht (IndexedDB/Cache API via Transformers.js)
- [ ] **MODEL-03**: Fortschrittsanzeige (Progressbar mit Prozent/MB) wird beim Modell-Download angezeigt
- [ ] **MODEL-04**: Bei gecachtem Modell wird Progressbar übersprungen und Modell direkt geladen

### UI-Komponenten

- [ ] **UI-01**: LocalTranscribeButton zeigt Mikrofon-Icon mit Recording-Status (idle/recording/transcribing)
- [ ] **UI-02**: Button pulsiert rot während der Aufnahme (wie bestehender TranscribeButton)
- [ ] **UI-03**: Button zeigt Loading-Spinner während der Transkription (wie bestehender TranscribeButton)
- [ ] **UI-04**: Sprachauswahl-Dropdown (de/en) ist am Button verfügbar (wie bestehende SpeechRecognitionButton)
- [ ] **UI-05**: Recording-Timer zeigt vergangene Zeit an (z.B. "0:42 / 2:00")
- [ ] **UI-06**: Privacy-Badge/Indikator zeigt an, dass Audio lokal verarbeitet wird
- [ ] **UI-07**: ChatInput.tsx erkennt Extension-Name 'transcribe-local' und zeigt LocalTranscribeButton

### Fehlerbehandlung

- [ ] **ERR-01**: Mikrofon-Berechtigung verweigert → aussagekräftige Toast-Meldung
- [ ] **ERR-02**: Browser nicht kompatibel (kein Worker/WASM) → Toast und Button nicht angezeigt
- [ ] **ERR-03**: Modell-Download fehlgeschlagen → Toast mit Retry-Hinweis
- [ ] **ERR-04**: Transkription liefert leeren Text → Toast-Meldung
- [ ] **ERR-05**: Stille erkannt (kein Sprachsignal) → "Keine Sprache erkannt" statt Whisper-Halluzination

### Internationalisierung

- [ ] **I18N-01**: Alle UI-Texte sind in de und en Sprachdateien hinterlegt (texts.chat.localTranscribe)
- [ ] **I18N-02**: Accessibility Labels sind für alle interaktiven Elemente vorhanden

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Echtzeit-Transkription

- **RT-01**: Text erscheint während des Sprechens (Chunked Inferenz im Worker)
- **RT-02**: Chunk-Boundary-Handling für nahtlose Transkription

### Erweiterte Konfiguration

- **CFG-01**: Admin kann Whisper-Modell wählen (tiny/base/small)
- **CFG-02**: Audio-Level-Visualisierung während der Aufnahme

## Out of Scope

| Feature | Reason |
|---------|--------|
| Echtzeit-Streaming-Transkription | Whisper ist ein Batch-Modell, Chunking fügt massive Komplexität hinzu. Web Speech API Extension deckt Echtzeit-Bedarf ab |
| Modellauswahl durch Endnutzer | Erzeugt Verwirrung und Support-Aufwand, whisper-base ist der richtige Kompromiss |
| Offline-First / PWA-Modus | Erstdownload braucht Internet, vollständige Offline-Fähigkeit ist separates Projekt |
| Audio-Wiedergabe vor Transkription | Unnötige UI-Komplexität in einem Chat-Kontext |
| Auto-Send nach Transkription | Nutzer muss Text vor dem Senden prüfen können |
| Multi-Speaker Diarization | Whisper-base unterstützt das nicht, in Chat-Kontext irrelevant |
| Audio-Datei-Upload | Anderes UX-Paradigma, separates Feature |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| EXT-01 | Phase 1 | Pending |
| EXT-02 | Phase 1 | Pending |
| EXT-03 | Phase 1 | Pending |
| WORK-01 | Phase 2 | Pending |
| WORK-02 | Phase 2 | Pending |
| WORK-03 | Phase 2 | Pending |
| WORK-04 | Phase 2 | Pending |
| WORK-05 | Phase 2 | Pending |
| AUDIO-01 | Phase 2 | Pending |
| AUDIO-02 | Phase 2 | Pending |
| AUDIO-03 | Phase 2 | Pending |
| AUDIO-04 | Phase 2 | Pending |
| MODEL-01 | Phase 2 | Pending |
| MODEL-02 | Phase 2 | Pending |
| MODEL-03 | Phase 3 | Pending |
| MODEL-04 | Phase 3 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 5 | Pending |
| UI-06 | Phase 5 | Pending |
| UI-07 | Phase 3 | Pending |
| ERR-01 | Phase 4 | Pending |
| ERR-02 | Phase 4 | Pending |
| ERR-03 | Phase 4 | Pending |
| ERR-04 | Phase 4 | Pending |
| ERR-05 | Phase 5 | Pending |
| I18N-01 | Phase 3 | Pending |
| I18N-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-05-07*
*Last updated: 2026-05-07 after roadmap creation*
