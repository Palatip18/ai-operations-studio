# Localization QA

This checklist is retained as release evidence for the English, Thai, and Simplified Chinese interface.

## Automated checks

- Translation catalogs have identical keys across all three locales.
- Every locale provides five module labels, three summary metrics, and eight Support Copilot scenarios.
- Thai and Chinese primary copy is checked for native-script content.
- Lint, typecheck, tests, and production build must pass before release.

## Manual browser matrix

For each locale (`EN`, `ไทย`, `中文`) verify:

- Login title, description, password field, button, error state, and footer.
- Header subtitle, AI status, language switcher, and sign-out action.
- Hero copy, five module labels, summary metrics, and footer.
- AI Chat guidance, suggestions, empty/loading states, input, action, and trace label.
- Knowledge Base search, section, empty-state, citation, and evaluation labels.
- Workflow field labels, action, empty state, and execution trace heading.
- Agentic Copilot explanation, scenarios, states, trace labels, and action.
- Support Copilot positioning, eight scenarios, states, trace labels, and localized response.
- Language selection persists after reload and the document `lang` attribute matches.
- Desktop and mobile widths show no clipped language controls or actions.

## Honest limitation

Technical identifiers, source document titles/content, intent codes, tool names, risk codes, and execution payloads remain in canonical English. They are system data, not interface copy. Production multilingual parity requires translated, version-controlled knowledge documents and native-language evaluation sets.
