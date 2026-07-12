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
