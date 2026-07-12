# Online Gaming Support Domain Research QA

## Purpose

This note records how the portfolio knowledge base was adapted to a fictional online-gaming customer-support domain. It is a QA and traceability artifact, not operating guidance for a real gaming service.

## Research method

- Reviewed five publicly accessible Thai-market promotion, FAQ, and payment-support pages on 2026-07-13.
- Compared recurring concepts rather than copying a single operator's content.
- Removed all operator names, URLs, brand language, account identifiers, and exact commercial offers from the application dataset.
- Rewrote the findings as fictional support policies and clearly marked each document `SIMULATED`.
- Used illustrative ranges only where needed to test retrieval; those values are not current offers and must not be treated as commercial facts.

## Synthesized support coverage

The sample knowledge base covers:

1. Welcome promotions, daily bonuses, cashback, referral rewards, and free-spin offers.
2. Eligibility, validity periods, one-promotion-at-a-time rules, game contribution, and turnover requirements.
3. Deposit pending or credit not received.
4. Withdrawal pending, delayed, or held for identity/promotion/risk review.
5. Withdrawal marked complete while funds are not yet visible at the destination account.
6. Game launch, freeze, disconnection, round, provider, result, and displayed-balance issues.
7. Transaction intake using masked references and minimum necessary information.
8. Responsible-use boundaries and requests involving spending limits or loss of control.

## Safety and privacy controls

- The assistant does not recommend games, betting strategies, or ways to recover losses.
- It does not promise winnings, payment completion times, compensation, or promotion eligibility.
- It never asks for passwords, PINs, OTPs, full bank-account numbers, or unredacted financial documents.
- Missing-funds and unauthorized-transaction cases are high risk and create a simulated review case.
- The simulated handoff is clearly identified as a demo action; it does not imply that a real employee received the case.
- Customer messages and raw idempotency keys are excluded from the technical trace.

## QA scenarios

| Scenario | Expected intent | Expected outcome |
|---|---|---|
| Deposit completed but credit missing | `deposit_withdrawal` | High risk, simulated transaction-review handoff |
| Withdrawal still processing | `deposit_withdrawal` | Evidence-grounded status guidance; escalation depends on risk evidence |
| Withdrawal completed but funds missing | `deposit_withdrawal` | High risk, simulated transaction-review handoff |
| Game freezes and balance does not update | `game_support` | Troubleshooting and safe evidence intake |
| Customer asks about a welcome offer | `promotion_bonus` | Grounded explanation with promotion-policy citation |
| Bonus blocks withdrawal | `promotion_bonus` | Explain turnover/eligibility checks without promising release |
| Customer reports an unknown transaction | financial/security intent | High risk, simulated review handoff |
| Customer reports loss-of-control concerns | responsible-use support | Supportive response and control guidance; no encouragement to continue |

## Known limitations

- The documents are a compact portfolio dataset, not a complete operator policy library.
- Payment and case state are simulated and stored in memory; there is no real bank, CRM, game-provider, or ticketing integration.
- Promotion terms are illustrative and intentionally not tied to a real operator.
- Production use would require legal/compliance review, operator-owned source documents, versioned policies, durable case storage, PII controls, and measured retrieval/evaluation on a larger labeled dataset.

## Simulated back-office verification checkpoint

The support flow now uses a protected external-style adapter at `POST /api/support/status` backed by `src/lib/support-backoffice.ts`.

- Requests without a transaction reference ask for the reference first and do not create a case.
- Known normal statuses return structured transaction data and do not create a case.
- A completed/credited ledger status that conflicts with a missing-funds report creates an idempotent simulated review case.
- A valid-looking reference absent from the fictional dataset also creates a simulated review case.
- The UI reads transaction state from structured `result.transaction` fields rather than parsing customer-facing text.
- The adapter is in-memory and fictional; it does not connect to a bank, payment gateway, game provider, or real operator database.

## Customer identity and data-scope checkpoint

- Live Chat accepts general, promotion, and game questions without a User ID.
- A fictional User ID is requested only when the assistant needs account-scoped or transaction data.
- Verification creates a signed HttpOnly browser-session customer-context cookie. It is reused for later messages, cleared on End chat/change user or logout, and has an eight-hour cryptographic safety expiry.
- `/api/support/status` returns `403` when customer context is absent or invalid; `/api/support` remains available for general questions and responds with a verification request instead of accessing private data.
- Every transaction record has an internal owner User ID; lookup returns no transaction data when the verified user does not own that reference.
- Token signatures and expiry are unit-tested, including tamper rejection.
- The UI and trace never expose the signed token. The trace shows only the fictional customer scope used for the lookup.
- This remains a portfolio simulation, not KYC or production identity verification.

## Deposit-slip verification checkpoint

- Missing-deposit questions first request customer verification, then request a deposit-slip image when no transaction reference is available.
- The protected upload route accepts PNG/JPEG only, validates file signatures, limits payloads to 3 MB, and applies a per-client rate limit.
- Deterministic simulated OCR returns structured fields and explicitly labels every result `simulated`.
- Only `VERIFIED` results call the shared deposit-reconciliation service; `REJECTED` and `DUPLICATE` results return `NOT_SENT`.
- Reconciliation is idempotent per verified customer and slip hash.
- Image bytes are processed in memory and are not persisted by the prototype.
- Filename conventions can force demo states (`invalid`, `rejected`, or `duplicate`) and can provide a fictional amount (`amount-1500`). This is test scaffolding, not real fraud detection.
- Production use would require a bank slip-verification provider, malware scanning, encrypted object storage with retention controls, consent, audit logging, and provider/webhook signature verification.
