# Changelog

## [9.13.0](https://github.com/codecentric/c4-genai-suite/compare/v9.12.0...v9.13.0) (2026-02-06)


### Features

* **models:** make parallelToolCalls configurable in the model ([d25962f](https://github.com/codecentric/c4-genai-suite/commit/d25962f488fbc5a4983b959f06d07833a6e4c098))

## [9.12.0](https://github.com/codecentric/c4-genai-suite/compare/v9.11.2...v9.12.0) (2026-02-06)


### Features

* **backend,frontend:** add transcription extension using Azure OpenAI ([#1191](https://github.com/codecentric/c4-genai-suite/issues/1191)) ([c86e1ce](https://github.com/codecentric/c4-genai-suite/commit/c86e1cedf98640be45b68d3e6a20976da76a677e))


### Bug Fixes

* **frontend:** mantine form selects will allow free text if only examples are given ([#1229](https://github.com/codecentric/c4-genai-suite/issues/1229)) ([1a8e8cb](https://github.com/codecentric/c4-genai-suite/commit/1a8e8cbdee77449ebef4d733ba0b16231bf9b783))

## [9.11.2](https://github.com/codecentric/c4-genai-suite/compare/v9.11.1...v9.11.2) (2026-02-03)


### Bug Fixes

* add indices for some common queries to improve db performance ([#1184](https://github.com/codecentric/c4-genai-suite/issues/1184)) ([957865d](https://github.com/codecentric/c4-genai-suite/commit/957865d313bb6cfbf8d4aef073ac64eb283c988e))
* show the correct version in the frontend ([#1176](https://github.com/codecentric/c4-genai-suite/issues/1176)) ([ff26160](https://github.com/codecentric/c4-genai-suite/commit/ff26160615573fc8d9b0cab470d0a629407ed77e))

## [9.11.1](https://github.com/codecentric/c4-genai-suite/compare/v9.11.0...v9.11.1) (2026-01-29)


### Bug Fixes

* confluence importer uses less ram and reports a class of errors instead of terminating ([#1151](https://github.com/codecentric/c4-genai-suite/issues/1151)) ([0152bd3](https://github.com/codecentric/c4-genai-suite/commit/0152bd31dff423f013a47749b8c23166953ffed4))
* **frontend:** when editing extensions the bucket dropdown shows the currently selected bucket ([#1158](https://github.com/codecentric/c4-genai-suite/issues/1158)) ([55aaead](https://github.com/codecentric/c4-genai-suite/commit/55aaead25f5eca743d6be00897f1c545ac954261))

## [9.11.0](https://github.com/codecentric/c4-genai-suite/compare/v9.10.0...v9.11.0) (2026-01-21)


### Features

* **confluence-importer,REIS:** parse frontmatter into metadata and improve html-to-markdown conversion ([#1106](https://github.com/codecentric/c4-genai-suite/issues/1106)) ([f08a9bc](https://github.com/codecentric/c4-genai-suite/commit/f08a9bcd76add05c277251a5c61e4bc50a9fea40))
* **frontend:** complete migration from react hook forms to mantine forms ([#1046](https://github.com/codecentric/c4-genai-suite/issues/1046)) ([3b97f12](https://github.com/codecentric/c4-genai-suite/commit/3b97f121f658764900e0e2e9e326679a7b0963f3))


### Bug Fixes

* **backend:** re-add `userGroupIds` to User entity ([#1104](https://github.com/codecentric/c4-genai-suite/issues/1104)) ([9ae936c](https://github.com/codecentric/c4-genai-suite/commit/9ae936ce1eb0b7036fe15660457eafdb4daad2b6))
* **frontend:** pdf viewer should start on first page if page is not a number ([#1109](https://github.com/codecentric/c4-genai-suite/issues/1109)) ([7850efc](https://github.com/codecentric/c4-genai-suite/commit/7850efcff55f2b98c8bfd02e95f752aa4809c527))
* **REIS:** handle json lists correctly ([#1094](https://github.com/codecentric/c4-genai-suite/issues/1094)) ([70ef1fe](https://github.com/codecentric/c4-genai-suite/commit/70ef1fe28732f2349731c7c735dcf7e145eac996))

## [9.10.0](https://github.com/codecentric/c4-genai-suite/compare/v9.9.1...v9.10.0) (2026-01-20)


### Features

* add `openai-compatible` embedding models ([#1102](https://github.com/codecentric/c4-genai-suite/issues/1102)) ([62e12dd](https://github.com/codecentric/c4-genai-suite/commit/62e12ddb7a99e7403ea9e7ff5c3d8b6c5194c1ea))
* **backend:** disable metrics export when METRICS_PORT is set to 0 ([#1056](https://github.com/codecentric/c4-genai-suite/issues/1056)) ([f859e4f](https://github.com/codecentric/c4-genai-suite/commit/f859e4f3447d798af9e4ea71667d81cf756ab87c))
* **backend:** make maxOutputTokens configurable ([#1057](https://github.com/codecentric/c4-genai-suite/issues/1057)) ([2527d20](https://github.com/codecentric/c4-genai-suite/commit/2527d203dccd8d9a0ea2a5a736558e168cdb7b51))
* **extension:** add parameters to Brave Web Search extension (safesearch, freshness, country, search language) ([#1008](https://github.com/codecentric/c4-genai-suite/issues/1008)) ([4cf0c5e](https://github.com/codecentric/c4-genai-suite/commit/4cf0c5e4fd86d8c3cc21a29cfa7775b2be63656c))


### Bug Fixes

* add support for `openai-compatible` embeddings to helm charts ([#1103](https://github.com/codecentric/c4-genai-suite/issues/1103)) ([5d3b1ac](https://github.com/codecentric/c4-genai-suite/commit/5d3b1aca12ba20dc45843392c926b7f0dbb88bed))
* **REIS:** do not process all file types with a detour over pdf  when previews are activated ([#659](https://github.com/codecentric/c4-genai-suite/issues/659)) ([f30b642](https://github.com/codecentric/c4-genai-suite/commit/f30b642347e257490e051646f95aa83e86b2eb0d))

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
