# Reviewer Guide — AI Operations Studio

This guide provides a short evaluation path for recruiters, AI Engineers, engineering managers, and solution-delivery stakeholders.

## Links

- **Live demo:** https://ai-operations-studio-black.vercel.app
- **Source repository:** https://github.com/Palatip18/ai-operations-studio
- **Demo password:** supplied privately with the job application; never stored in this repository

## Three-minute guided review

### 1. Routine customer question

Open **AI Support Chat** and select the account-onboarding or troubleshooting scenario.

Look for:

- detected intent and risk;
- retrieved evidence;
- groundedness result;
- `AUTO_RESPOND` decision;
- natural customer-facing response;
- bounded tool-call count.

### 2. High-risk customer case

Select the financial-dispute or angry-complaint scenario.

Look for:

- deterministic risk and mandatory-review rules;
- `ESCALATE` decision even when related knowledge exists;
- a structured simulated case with `QUEUED` status and demo reference ID;
- no promise that a real employee has received the case;
- redacted technical trace.

### 3. Insufficient evidence

Select the hardware-security-key scenario.

Look for:

- conservative no-answer behavior;
- no fabricated policy answer;
- safe escalation rather than an unsupported response.

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
| Simulated integration | `src/lib/support-handoff.ts` |
| API adapter | `src/app/api/support/handoff/route.ts` |
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
