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
