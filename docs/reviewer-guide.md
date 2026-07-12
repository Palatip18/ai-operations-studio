# Reviewer Guide — AI Operations Studio

This guide provides a short evaluation path for recruiters, AI Engineers, engineering managers, and solution-delivery stakeholders.

## Links

- **Live demo:** https://ai-operations-studio-black.vercel.app
- **Source repository:** https://github.com/Palatip18/ai-operations-studio
- **Demo password:** supplied privately with the job application; never stored in this repository

## Three-minute guided review

### 1. Routine customer question

Stay in the default **Live Chat** and select the promotion-details or game-issue scenario without verifying a User ID.

Look for:

- natural customer-facing response;
- scrollable multi-turn conversation history;
- no exposed intent, risk, model, RAG, or execution terminology.

### 2. High-risk customer case

Select the deposit-missing or withdrawal-missing scenario. The assistant should politely request `USER-RAY01` before accessing the transaction, then continue the same conversation after verification.

Look for:

- a structured simulated case with `QUEUED` status and demo reference ID;
- no promise that a real employee has received the case;
- a clear next step without exposing the internal policy decision.

Then switch to **Internal AI Operations → Support Copilot** to inspect the detected intent/risk, retrieved evidence, groundedness result, `AUTO_RESPOND`/`ESCALATE` decision, structured handoff, and redacted trace behind the same behavior. The customer-facing and reviewer-facing views are deliberately separated.

Open **Internal AI Operations → AI Behavior Settings** to inspect the active role, persona, tone, response principles, customer-data rules, escalation boundaries, prohibited customer-visible terminology, and localized response previews. These controls are versioned in code and feed the live localization prompt; the panel is inspectable rather than an ungoverned production prompt editor.

### 3. Promotion and responsible-use boundaries

Select the bonus-withdrawal and responsible-use scenarios.

Look for:

- answers grounded in fictional promotion-policy documents;
- no promise of eligibility, winnings, or withdrawal release;
- supportive responsible-use guidance without encouraging more spending.

## Technical architecture to inspect

```text
Customer message
  → multilingual normalization
  → deterministic intent and risk classification
  → hybrid knowledge retrieval
  → optional bounded workflow tool
  → groundedness verification
  → deterministic AUTO_RESPOND / ESCALATE policy
  → locale-aware response composer
  → simulated handoff adapter when required
  → structured UI result + redacted execution trace
```

Recommended files:

| Area | File |
|---|---|
| Support orchestration | `src/lib/support-agent.ts` |
| Intent/risk rules | `src/lib/support-classification.ts` |
| Hybrid retrieval | `src/lib/knowledge.ts` |
| Topic classification | `src/lib/query-topics.ts` |
| Groundedness heuristic | `src/lib/verifier.ts` |
| Response composition | `src/lib/response-composer.ts` |
| AI behavior policy | `src/lib/support-behavior.ts` |
| Simulated integration | `src/lib/support-handoff.ts` |
| Simulated transaction lookup | `src/lib/support-backoffice.ts` |
| Signed customer context | `src/lib/support-customer.ts` |
| API adapter | `src/app/api/support/handoff/route.ts` |
| Status API adapter | `src/app/api/support/status/route.ts` |
| Customer verification API | `src/app/api/support/customer/route.ts` |
| Simulated slip scanner | `src/lib/support-slip.ts` |
| Slip verification API | `src/app/api/support/slip/verify/route.ts` |
| Evaluation | `src/lib/support-evaluation.ts` and `src/lib/support-challenge.ts` |
| Portfolio UI | `src/components/studio.tsx` |

## Honest capability boundary

### Implemented

- Deployed Next.js application and protected demo access
- Live OpenAI-compatible embeddings/tool-calling option with deterministic fallback
- Bounded agent workflows and visible execution traces
- Hybrid retrieval with citations and score components
- Intent/risk classification and mandatory-review rules
- Groundedness/no-answer gate
- English, Thai, and Chinese interface/input/response handling
- Simulated, idempotent support-case creation with structured output
- Fictional online-gaming support knowledge covering promotions, deposits, withdrawals, and game issues
- Authentication, rate limits, timeouts, input limits, token caps, and trace redaction
- Automated tests and production build validation

### Simulated

- Customer-support queue and case destination
- Workflow status lookup and notifications
- External helpdesk/CRM delivery

The demo case is created inside an in-memory adapter. It does not notify a real employee or third-party platform.

### Roadmap

- Zendesk/Freshdesk/Salesforce or other CRM/helpdesk integration
- Persistent vector database and document ingestion
- Role-based document access and multi-tenant isolation
- Claim-level entailment verification
- Durable audit storage and distributed rate limiting
- Native-language knowledge documents and larger multilingual evaluation sets

## Evaluation interpretation

The included metrics apply only to fictional sample datasets. In particular:

- automation coverage is not answer accuracy;
- sample-set performance is not production containment rate;
- the 80–90% figure is a controlled-pilot target for repetitive, low-risk inquiries when validated knowledge coverage is sufficiently complete;
- the lexical groundedness verifier is a transparent prototype heuristic, not a factual-correctness guarantee.

## Development approach

This project was built through an AI-assisted engineering workflow. The author led problem framing, requirements, architecture direction, workflow and escalation rules, evaluation criteria, behavioral testing, review, and acceptance. AI coding tools accelerated implementation; the repository does not claim that every line was authored manually without AI assistance.

## Reproducible checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Current release result: **164 passing tests** and a successful Next.js production build.
