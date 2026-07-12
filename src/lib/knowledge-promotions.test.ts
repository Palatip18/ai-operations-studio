import { describe, expect, it } from "vitest";

import { knowledgeDocuments, searchKnowledge } from "./knowledge";

const promotionDocuments = knowledgeDocuments.filter((document) => document.id.startsWith("promo-"));

describe("fictional promotion knowledge", () => {
  it("contains exactly ten distinct, inspectable promotion documents", () => {
    expect(promotionDocuments).toHaveLength(10);
    expect(new Set(promotionDocuments.map((document) => document.id)).size).toBe(10);
    expect(promotionDocuments.every((document) => document.category === "Online Gaming Support")).toBe(true);
    expect(promotionDocuments.every((document) => document.metadata?.capabilityStatus === "SIMULATED")).toBe(true);
  });

  it("covers deposit, slot, live-casino, sports, cashback, referral, and loyalty patterns", () => {
    const catalog = promotionDocuments.map((document) => `${document.title} ${document.content}`).join(" ").toLowerCase();
    for (const topic of ["deposit", "slot", "live casino", "sports", "cashback", "referral", "loyalty"]) {
      expect(catalog).toContain(topic);
    }
  });

  it("retrieves the ten-offer overview for a broad promotion question", () => {
    const results = searchKnowledge("What promotions and bonuses are currently available?", 5);
    expect(results.some((result) => result.document.id === "gaming-promotion-overview")).toBe(true);
  });

  it("keeps responsible-use boundaries in every loss-related offer", () => {
    const lossOffers = promotionDocuments.filter((document) => /loss|cashback|rebate/i.test(`${document.title} ${document.content}`));
    expect(lossOffers.length).toBeGreaterThanOrEqual(2);
    expect(lossOffers.every((document) => /not a guarantee|does not guarantee|never be used as a reason|not a promise/i.test(document.content))).toBe(true);
  });
});
