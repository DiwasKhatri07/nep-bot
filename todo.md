# Project TODO

- [x] Define the NEP BOT production architecture, security boundaries, and deployment constraints.
- [x] Design persistent data models for bot profiles, country-normalized setup details, feature switches, command preferences, and non-sensitive activity.
- [x] Create secure server-side procedures for number validation, pairing-state orchestration, configuration updates, activity retrieval, logout, and re-pairing.
- [x] Build the NEP BOT responsive dashboard shell with a modern readable type system, accessible navigation, onboarding, profiles, activity logs, and settings.
- [x] Implement country selector, national-number formatting, client-side feedback, and strict server-side E.164 validation.
- [x] Implement the guided pairing flow with profile creation, validation, pairing-code display state, connection progress, secure logout, and re-pairing controls.
- [x] Add organized command catalog for greeting, roast, menu, jokes, memes, translation, media helpers, optional AI, and owner/group utilities.
- [x] Add owner-only public/private mode and safe moderation controls for anti-link, anti-call, auto-read, auto-react, and group controls.
- [x] Add safe input limits, permission checks, credential isolation, and exclusions for unsolicited bulk messaging.
- [x] Add a Python service layer for validation, configuration management, command catalog, status APIs, and connector orchestration contracts.
- [x] Add production configuration and clear environment-variable and WhatsApp-pairing setup documentation.
- [x] Write and run Vitest coverage for validation, permissions, and pairing-state behavior.
- [x] Verify the responsive UI, database integration, and project build before preparing the final version.
- [ ] Configure an always-on WhatsApp connector and add `NEP_CONNECTOR_URL` plus `NEP_CONNECTOR_TOKEN` before requesting a real pairing code.
- [ ] Add `NEP_LLM_API_KEY`, `NEP_LLM_BASE_URL`, and `NEP_LLM_MODEL` before enabling provider-backed `/ai` replies or AI auto-reply.
- [x] Add connector status synchronization that moves profiles through pairing, connected, disconnected, and error states using verified connector responses.
- [x] Extend the Python service with status and configuration actions for the connector orchestration contract.
- [ ] Run an end-to-end pairing test against a configured always-on connector and verify non-sensitive connection progress is persisted.
