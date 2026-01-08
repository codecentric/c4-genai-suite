# Changelog

## [9.9.1](https://github.com/codecentric/c4-genai-suite/compare/v9.9.0...v9.9.1) (2026-01-08)


### Bug Fixes

* **backend:** do not log user objects since they might contain sensitive information ([#920](https://github.com/codecentric/c4-genai-suite/issues/920)) ([6ed7dd5](https://github.com/codecentric/c4-genai-suite/commit/6ed7dd5b80b4156c93c598a9b940dff14c012d65))

## [9.9.0](https://github.com/codecentric/c4-genai-suite/compare/v9.8.1...v9.9.0) (2026-01-07)


### Features

* Add option to extend vs replace default systemprompt (fixes [#652](https://github.com/codecentric/c4-genai-suite/issues/652)) ([#858](https://github.com/codecentric/c4-genai-suite/issues/858)) ([ae8ceb0](https://github.com/codecentric/c4-genai-suite/commit/ae8ceb03d6c0f9dd6acea67feadb7fd18dae200c))
* **extensions:** add Gemini image generation extension ([#830](https://github.com/codecentric/c4-genai-suite/issues/830)) ([39676b8](https://github.com/codecentric/c4-genai-suite/commit/39676b8dd0981f5a766427df7ebb05995cc30114))


### Bug Fixes

* avoid possible problems in nvidia extension ([#706](https://github.com/codecentric/c4-genai-suite/issues/706)) ([0ffe5b7](https://github.com/codecentric/c4-genai-suite/commit/0ffe5b77af60c226e746144bca5406022aea4744))
* **frontend:** codeblocks with unrecognized languages are copyable ([#613](https://github.com/codecentric/c4-genai-suite/issues/613)) ([5e69c25](https://github.com/codecentric/c4-genai-suite/commit/5e69c25064d0169f157c0295046934e297c74a46))
* **frontend:** ensure inline code is rendered correctly ([#860](https://github.com/codecentric/c4-genai-suite/issues/860)) ([d60782d](https://github.com/codecentric/c4-genai-suite/commit/d60782d279fe9c7369b2dce9af2139d98595ab0a))
* **REIS:** repair pgvector connection pooling to prevent too "many clients" error ([713ba66](https://github.com/codecentric/c4-genai-suite/commit/713ba665dc939dce4af0145c54f5b4b91b80dac1))
* **REIS:** validate pgvector url, log config at start and hide all secrets ([#605](https://github.com/codecentric/c4-genai-suite/issues/605)) ([7f60256](https://github.com/codecentric/c4-genai-suite/commit/7f6025626d9d648a7c31202410814c368bf4ba97))
* report content filter violations to the user ([#633](https://github.com/codecentric/c4-genai-suite/issues/633)) ([2d66b53](https://github.com/codecentric/c4-genai-suite/commit/2d66b53864578afb0b6141853fd7592591d1ccec))

## [9.8.1](https://github.com/codecentric/c4-genai-suite/compare/v9.8.0...v9.8.1) (2025-11-05)


### Bug Fixes

* **extensiosn:** tool-calling compatability fix for selfhosted Nvidia NIM ([cd504dd](https://github.com/codecentric/c4-genai-suite/commit/cd504dd543c62eeaf872f2b29ff422145288cc47))

## [9.8.0](https://github.com/codecentric/c4-genai-suite/compare/v9.7.0...v9.8.0) (2025-11-04)


### Features

* **extensions:** Brave Search now accepts a configurable number of max results and passes extra snippets to the LLM ([#671](https://github.com/codecentric/c4-genai-suite/issues/671)) ([23c38b4](https://github.com/codecentric/c4-genai-suite/commit/23c38b44dcb9b22f06239b655bf8522894483a0c))


### Bug Fixes

* avoid error when user groups from oidc are empty/undefined ([#693](https://github.com/codecentric/c4-genai-suite/issues/693)) ([3e9ec24](https://github.com/codecentric/c4-genai-suite/commit/3e9ec24bc70cd0abfd6b85d863686dc88aa8e562))
* forbid deletion of used buckets ([#578](https://github.com/codecentric/c4-genai-suite/issues/578)) ([37ecb2f](https://github.com/codecentric/c4-genai-suite/commit/37ecb2fa3eee81074d737285fea89f572eaa2241))
* remove second scrollbar for codeblocks in edge ([#679](https://github.com/codecentric/c4-genai-suite/issues/679)) ([3a86902](https://github.com/codecentric/c4-genai-suite/commit/3a869024eaced07c4b80d4250c2c8cb4df3cad7f))

## [9.7.0](https://github.com/codecentric/c4-genai-suite/compare/v9.6.0...v9.7.0) (2025-10-30)


### Features

* **frontend:** preserve newlines in chunk source viewer ([#672](https://github.com/codecentric/c4-genai-suite/issues/672)) ([adf7c91](https://github.com/codecentric/c4-genai-suite/commit/adf7c91b8433a5667670d60d860c937b72ea5e04))
* support multiple user groups per user ([1bc3ed3](https://github.com/codecentric/c4-genai-suite/commit/1bc3ed30a87bf0aa27c50a59917b5412a5cb7088))


### Bug Fixes

* **backend:** auto-append /api to Ollama endpoint for compatibility ([#657](https://github.com/codecentric/c4-genai-suite/issues/657)) ([215a37b](https://github.com/codecentric/c4-genai-suite/commit/215a37bd67bd8e2914f15362a9760b4a4adc1b3e))
* **frontend:** test button can be clicked for unchanged extensions ([#651](https://github.com/codecentric/c4-genai-suite/issues/651)) ([1758a43](https://github.com/codecentric/c4-genai-suite/commit/1758a43bf894b778c504b7421c7fb2ca618a80fd))
* **REIS:** mitigate rare race when converting multiple office files at the same time ([#632](https://github.com/codecentric/c4-genai-suite/issues/632)) ([1555d96](https://github.com/codecentric/c4-genai-suite/commit/1555d966b5b7931b39e6fb8f189848d1c6fa1a88))
* tell the LLM which output formats are supported by c4 ([#631](https://github.com/codecentric/c4-genai-suite/issues/631)) ([9ce4416](https://github.com/codecentric/c4-genai-suite/commit/9ce4416921d11ba7c0ba9dce23c5cd548cc9e8f5))

## [9.6.0](https://github.com/codecentric/c4-genai-suite/compare/v9.5.0...v9.6.0) (2025-10-22)


### Features

* **frontend:** show assistant id and key copy to clipboard ([#591](https://github.com/codecentric/c4-genai-suite/issues/591)) ([520a96a](https://github.com/codecentric/c4-genai-suite/commit/520a96a77d8e34f1a6de55d3431cbb4be0b10788))
* title for system prompts ([#615](https://github.com/codecentric/c4-genai-suite/issues/615)) ([5a24478](https://github.com/codecentric/c4-genai-suite/commit/5a2447802cc45285db07cb93a53a4b29c7e163b4))


### Bug Fixes

* clearing the file search field finds all files ([#614](https://github.com/codecentric/c4-genai-suite/issues/614)) ([2ac5868](https://github.com/codecentric/c4-genai-suite/commit/2ac586882c4c3a5fd3090f1a7d1c2a36a2bca3f1))
* **frontend:** text areas for prompt editing are now autosizing ([#583](https://github.com/codecentric/c4-genai-suite/issues/583)) ([87b2992](https://github.com/codecentric/c4-genai-suite/commit/87b299211b88836c68d5c1c93b1ea8cec3457f1b))
* support Claude 4.5 by removing topP ([#600](https://github.com/codecentric/c4-genai-suite/issues/600)) ([e6c230d](https://github.com/codecentric/c4-genai-suite/commit/e6c230d069bd5815f3ecc2f8cbd2f2488864a1ac))

## [9.5.0](https://github.com/codecentric/c4-genai-suite/compare/v9.4.2...v9.5.0) (2025-10-15)


### Features

* system prompt can now be a template ([#579](https://github.com/codecentric/c4-genai-suite/issues/579)) ([d55cc10](https://github.com/codecentric/c4-genai-suite/commit/d55cc10120503b23e8dab602d76eb5ae926afae9))


### Bug Fixes

* fix drag and drop format acceptance and add error messages for unsupported formats and too many files ([#560](https://github.com/codecentric/c4-genai-suite/issues/560)) ([78fbe78](https://github.com/codecentric/c4-genai-suite/commit/78fbe78d7180871b50d232b5201f4e6386177619))

## [9.4.2](https://github.com/codecentric/c4-genai-suite/compare/v9.4.1...v9.4.2) (2025-10-14)


### Bug Fixes

* break long words instead of horizontal scrolling ([#580](https://github.com/codecentric/c4-genai-suite/issues/580)) ([48b2d39](https://github.com/codecentric/c4-genai-suite/commit/48b2d39b77665d5cd4b2ec3ddb9b0916a09d30e8))
* input field size increases with content ([#581](https://github.com/codecentric/c4-genai-suite/issues/581)) ([6d3d604](https://github.com/codecentric/c4-genai-suite/commit/6d3d604c0a2e5ba3d1c3d6a51f6affce9804b0a9))

## [9.4.1](https://github.com/codecentric/c4-genai-suite/compare/v9.4.0...v9.4.1) (2025-10-13)


### Bug Fixes

* fix eslint warnings appearing with new version ([5cb9015](https://github.com/codecentric/c4-genai-suite/commit/5cb9015f4c9c2eb2f9df7cfdb870b68be795a925))
* sort chats by time of last update, also count new messages as updates ([#568](https://github.com/codecentric/c4-genai-suite/issues/568)) ([87847bc](https://github.com/codecentric/c4-genai-suite/commit/87847bcf18778da9c5cc62c3fd3d7ab621e7b3bd))
