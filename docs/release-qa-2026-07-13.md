# Final Release QA — 2026-07-13

## Release story

The portfolio demonstrates an end-to-end applied-AI customer-support system: a customer starts in Live Chat, the system clarifies ambiguous requests, classifies intent/risk, retrieves grounded knowledge, optionally calls customer-scoped simulated APIs, responds or creates a simulated review case, and records privacy-safe outcomes for operational learning.

## Verified flow matrix

| Flow | Expected outcome | Evidence |
|---|---|---|
| General promotion/game question | Grounded answer without User ID or handoff | Support-agent and promotion retrieval tests |
| Broad promotion catalog request | Overview of 10 fictional offers | Promotion-catalog retrieval regression |
| Ambiguous message | Focused clarification; no answer guessing, case, or completed analytics event | Exact Thai-message regression tests |
| Account-scoped deposit/withdrawal | Conversational User ID request and signed chat-session reuse | Customer-context and support-route tests |
| Normal transaction status | Structured simulated back-office response without handoff | Back-office integration tests |
| Completed/missing-funds mismatch | Idempotent simulated review case | Support-agent and handoff tests |
| Missing deposit with slip | File-signature validation → simulated OCR → reconciliation only when verified | Slip verification/reconciliation tests |
| RAG response | Sources and scores remain internal; customer reply is sanitized | Retrieval, verifier, localization, and source-leak tests |
| Unknown/off-topic request | Clarification-first policy rather than unsupported answer | Challenge-suite precision guard |
| Analytics | Day/7-day/30-day metrics reconcile | Support analytics tests |
| Continuous learning | `AI_RESOLVED` and `EMPLOYEE_REVIEW` metadata plus improvement backlog | Case-learning and API-contract tests |
| Report routing | Structured simulated report with responsible recipients | Protected analytics API tests |
| Demo access | Signed session required independently by protected APIs | Authentication flow tests |

## Current release evidence

- 44 fictional knowledge documents, including 10 distinct promotion records.
- 16 application API route handlers; protected AI/support routes independently validate the signed session.
- 29 automated test files and 206 passing tests.
- ESLint, TypeScript, and Next.js production build pass.
- GitHub `main` is the production deployment source.
- Vercel deployment and runtime errors are checked after the final push.

## Privacy and safety checks

- No real customer, operator, employer, or transaction data is committed.
- `.env.local`, build output, and dependencies remain ignored.
- Customer-facing responses remove internal source IDs and implementation terms.
- Analytics stores no conversation text, User ID, phone number, slip bytes, or transaction reference.
- Ambiguous messages do not create cases or completed learning events.
- Uploaded slip bytes are validated and processed in memory only.

## Honest limitations

- Authentication is a shared password gate, not identity/RBAC.
- Handoff, transaction, slip, report delivery, and historical analytics are simulations.
- In-memory state is not durable or shared across serverless instances.
- Local feature hashing and lexical groundedness are prototype techniques, not enterprise retrieval or entailment verification.
- Production use requires persistent storage, access control, real CRM/payment/provider adapters, scheduled reporting, distributed rate limits, broader native-language evaluation, and operational monitoring.
