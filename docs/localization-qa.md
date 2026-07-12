# Localization QA

This checklist is retained as release evidence for the English, Thai, and Simplified Chinese interface.

## Automated checks

- Translation catalogs have identical keys across all three locales.
- Every locale provides four module labels, three summary metrics, and eight AI Support Chat scenarios.
- Thai and Chinese primary copy is checked for native-script content.
- Lint, typecheck, tests, and production build must pass before release.

## Manual browser matrix

For each locale (`EN`, `ไทย`, `中文`) verify:

- Login title, description, password field, button, error state, and footer.
- Header subtitle, AI status, language switcher, and sign-out action.
- Hero copy, four module labels, summary metrics, and footer.
- AI Support Chat guidance, scenarios, empty/loading states, input, action, handoff result, and trace label.
- Knowledge Base search, section, empty-state, citation, and evaluation labels.
- Workflow field labels, action, empty state, and execution trace heading.
- Agentic Copilot explanation, scenarios, states, trace labels, and action.
- AI Support Chat positioning, eight scenarios, states, trace labels, and localized response.
- Language selection persists after reload and the document `lang` attribute matches.
- Desktop and mobile widths show no clipped language controls or actions.

## Honest limitation

Technical identifiers, source document titles/content, intent codes, tool names, risk codes, and execution payloads remain in canonical English. They are system data, not interface copy. Production multilingual parity requires translated, version-controlled knowledge documents and native-language evaluation sets.

## 2026-07-13 release record

- Automated catalog checks: passed for EN / ไทย / 中文.
- Lint, TypeScript, 158 tests, and production build: passed.
- Production browser review covered all four modules in Thai and Chinese, plus the English baseline.
- Issues found during browser QA and fixed before final sign-off:
  - The former generic AI Chat surface was consolidated into AI Support Chat to remove duplicated conversational experiences.
  - Summary metrics remained English.
  - Chat and Knowledge default inputs did not update after locale changes.
  - Workflow options and Agent scenarios remained English.
  - Agent empty-state disclaimer remained English.
- Canonical English knowledge-document titles were intentionally retained and explicitly labeled as English source documents.
# Conversation-correction regression

## Reported behavior

After the assistant answered a withdrawal question, the customer corrected it with `ไม่ใช่ถอน ฝากไม่เข้า` ("not withdrawal; the deposit did not arrive"). The UI displayed conversation history, but the support API previously received only the latest message. Retrieval therefore retained withdrawal vocabulary and repeated withdrawal guidance.

## Fix

- The Live Chat now sends at most four previous customer messages to `/api/support`.
- The API validates, trims, and caps every context item before passing it to the agent.
- `applyConversationContext` treats an explicitly named current topic as authoritative.
- Negated withdrawal vocabulary is removed when the customer explicitly corrects the topic to deposit, and vice versa.
- A deposit correction without a reference requests a `DEP-` reference and does not open a case.
- Conversation context is used for routing only and is not copied into the technical trace.

## Regression coverage

Automated tests reproduce the exact Thai correction, verify `deposit_withdrawal` intent, confirm `DEPOSIT / NEEDS_REFERENCE`, prohibit a withdrawal-reference response, and confirm that no handoff is created before the required deposit reference is supplied.

## Thai customer-service voice

- Customer-facing Thai uses a friendly female-admin voice with natural `ค่ะ` / `นะคะ` phrasing.
- The opening message is concise: customers are invited to describe the issue without instructions about how to use the chat UI.
- Account lookup requests ask for `ยูสเซอร์หรือเบอร์โทรที่ลงทะเบียนไว้` conversationally.
- Transaction replies are tailored to queued withdrawals, bank settlement periods, completed records, and promotion-turnover restrictions.
- Customer-facing cards hide `simulated`, API, confidence, and internal back-office terminology; those details remain available in Internal AI Operations.
- Tests prohibit rigid phrases such as `เจ้าหน้าที่มนุษย์` and internal system wording in customer replies.

## Versioned AI behavior settings

- `src/lib/support-behavior.ts` centralizes the role, Thai female-admin persona, tone, response principles, data-access rules, escalation boundaries, and prohibited customer-visible terms.
- The live Thai and Chinese localization instructions are built from that configuration.
- Internal AI Operations exposes an inspectable behavior-settings panel with localized previews.
- The panel is intentionally read-only in this prototype; behavior changes remain code-reviewed and versioned rather than being persisted from an unrestricted browser editor.
