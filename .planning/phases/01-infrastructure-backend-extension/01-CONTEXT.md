# Phase 1: Infrastructure & Backend Extension - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the build infrastructure for browser-based Whisper inference (Vite config for ONNX/Worker bundling, COOP/COEP headers for SharedArrayBuffer) and registers the `transcribe-local` backend extension in the existing extension system — making it configurable per assistant via the admin UI.

</domain>

<decisions>
## Implementation Decisions

### Extension-Konfiguration
- **D-01:** Extension bekommt ein `defaultLanguage` Config-Feld als Select-Dropdown mit Optionen `de` und `en`. Admin wählt pro Assistant die Standard-Sprache, User kann im Frontend-Dropdown überschreiben.
- **D-02:** `defaultLanguage` ist `required` mit Default-Wert `de`. Kein unbestimmter Zustand möglich.
- **D-03:** Nur `de` und `en` in v1 — keine zusätzlichen Sprachen vorbereiten.

### COOP/COEP-Scope
- **D-04:** COOP/COEP-Headers werden in Phase 1 nur im Vite Dev Server gesetzt (nicht in Produktionskonfiguration). Produktions-Headers kommen separat.
- **D-05:** Regressions-Prüfung durch bestehende E2E-Tests (Playwright). Keine zusätzlichen manuellen Checklisten oder Feature-Flags.
- **D-06:** Falls `credentialless` COEP-Policy Probleme mit dem Backend-Proxy (`/api-proxy` → localhost:3000) verursacht: Proxy anpassen (CORP-Header hinzufügen), `credentialless` beibehalten. Kein Wechsel zu `require-corp`.

### Extension-Registrierung
- **D-07:** Logo/Icon: Mikrofon mit Schloss/Shield-Symbol — kommuniziert Privacy-Aspekt visuell.
- **D-08:** Titel: "Lokale Spracherkennung" (de) / "Local Speech Recognition" (en). Beschreibung betont, dass Audio den Browser nicht verlässt.
- **D-09:** Sortierung in Admin-UI: nach den Cloud-Optionen (Speech-to-Text, Transcribe Azure). Bestehende Reihenfolge bleibt unverändert.

### Claude's Discretion
Keine Bereiche — alle Entscheidungen vom User getroffen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Extension-System
- `backend/src/extensions/other/speech-to-text.ts` — Marker-Extension-Pattern (group: 'speech-to-text', type: 'other', leere Middlewares, keine Config)
- `backend/src/extensions/other/azure-transcribe.ts` — Extension mit Config-Feldern (arguments: apiKey, instanceName, etc.) und TypeScript-Config-Type
- `backend/src/extensions/examples/always-42.ts` — Minimales Extension-Beispiel mit @Extension() Decorator

### Frontend-Integration
- `frontend/src/pages/chat/conversation/ChatInput.tsx` §180-191 — Extension-Name-Erkennung und Hook-Verdrahtung für Speech-Extensions

### Build-Konfiguration
- `frontend/vite.config.ts` — Aktuelle Vite-Konfiguration (Proxy, Plugins, Test-Setup)

### Projekt-Anforderungen
- `.planning/REQUIREMENTS.md` §Infrastructure — INFRA-01 bis INFRA-04 (Vite, COOP/COEP, Transformers.js, Regression)
- `.planning/REQUIREMENTS.md` §Backend Extension — EXT-01 bis EXT-03 (Registrierung, Admin-UI, Mutual Exclusivity)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@Extension()` Decorator und `Extension` Interface: Alle Extensions folgen dem gleichen Pattern — `spec` Property + `getMiddlewares()` Methode
- `ExtensionSpec.group`: Feld `'speech-to-text'` erzwingt Mutual Exclusivity automatisch über das Extension-System
- `ExtensionSpec.arguments`: Schema-basierte Config-Felder die automatisch im Admin-UI als Formular gerendert werden (Typen: string, select via `format: 'select'` und `examples`)
- `I18nService`: Alle Extension-Titel und -Beschreibungen über `this.i18n.t()` mit Schlüssel in `texts.extensions.*`

### Established Patterns
- Speech-Extensions sind Typ `'other'` mit leeren Middlewares — sie sind reine Marker die das Frontend erkennt
- Mutual Exclusivity läuft über `group` Feld in `ExtensionSpec` (Zeile 133 in `interfaces.ts`)
- Frontend erkennt Extensions per Name-Check in `ChatInput.tsx:180` — hardcoded Filter auf `e.name === 'speech-to-text' || e.name === 'transcribe-azure'`

### Integration Points
- `ChatInput.tsx:180`: Neuer Extension-Name `'transcribe-local'` muss zum Filter hinzugefügt werden
- `backend/src/extensions/other/`: Neues File `local-transcribe.ts` neben den bestehenden Speech-Extensions
- `frontend/src/texts/languages/`: i18n-Einträge für Extension-Titel und -Beschreibung in de.ts und en.ts
- `backend/src/localization/`: i18n-Einträge für Backend Extension-Spec Texte

</code_context>

<specifics>
## Specific Ideas

- Privacy-Kommunikation als zentrales Differenzierungsmerkmal: Logo, Titel und Beschreibung sollen klar signalisieren, dass Audio lokal verarbeitet wird
- Config-Pattern von `transcribe-azure` als Vorlage für `defaultLanguage` Feld (mit `format: 'select'` und `examples: ['de', 'en']`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Infrastructure & Backend Extension*
*Context gathered: 2026-05-07*
