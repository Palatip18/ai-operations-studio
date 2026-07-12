# Fictional Promotion Research QA

This release adds ten fictional promotion documents for retrieval and customer-support demonstrations. The patterns were synthesized on 2026-07-13 after reviewing five publicly accessible Thai-language online-gaming promotion pages.

## Privacy and intellectual-property boundary

- Operator and website names are intentionally not retained in the knowledge base.
- No source wording, brand-specific campaign name, logo, customer claim, or proprietary condition was copied.
- Percentages, caps, validity periods, and turnover examples were rewritten as fictional demo values.
- Every document is labeled `SIMULATED` and belongs to the fictional `Online Gaming Support` category.

## Pattern coverage

The five-page review produced recurring promotion patterns rather than operator-specific content:

1. first-deposit welcome match;
2. sports new-member match;
3. daily deposit or reload bonus;
4. slot free spins;
5. slot cashback;
6. live-casino rebate;
7. sports accumulator or odds boost;
8. weekend casino reload;
9. verified referral reward;
10. loyalty-points exchange.

## Support and responsible-use rules

- The assistant may explain available fictional offers and their conditions, but must not promise profit, recommend higher spending, or encourage chasing losses.
- Deposit promotions cannot be stacked unless the promotion details explicitly permit it.
- Eligibility, product contribution, expiry, maximum reward, and turnover must be stated when relevant.
- Loss-related offers explicitly state that they do not guarantee recovery of losses.
- The referral example is a fixed demo reward and is not based on another customer's losses.

## Automated checks

`src/lib/knowledge-promotions.test.ts` verifies that exactly ten distinct simulated documents exist, required product categories are covered, the broad promotion overview is retrievable, and loss-related documents retain responsible-use boundaries.
