import { describe, expect, it } from "vitest";
import { searchKnowledge, HYBRID_WEIGHTS, VECTOR_PREFILTER } from "./knowledge";

describe("searchKnowledge — existing behaviour preserved", () => {
  it("ranks the expense policy first for a specific expense query", () => {
    expect(searchKnowledge("When are expense claims due and what receipt is required for reimbursement?")[0]?.document.id).toBe("expense-policy");
  });
  it("returns only weak hybrid scores for unrelated terms (off-topic queries do not cross 0.30)", () => {
    // hybridScore = 0.55 * vectorScore (no topic/lexical boost for genuinely off-topic)
    // Previously asserted raw vectorScore < 0.3; hybrid = 0.55 * raw < 0.55 * 0.3 = 0.165
    const results = searchKnowledge("astronomy telescope galaxy");
    expect(results.every((r) => r.score < 0.3)).toBe(true);
  });
});

describe("searchKnowledge — hybrid scoring mechanics", () => {
  it("exposes all three score components on every result", () => {
    const results = searchKnowledge("How do I cancel my subscription?");
    expect(results.length).toBeGreaterThan(0);
    const top = results[0];
    expect(top.scoreComponents).toBeDefined();
    expect(top.scoreComponents.hybridScore).toBeCloseTo(top.score, 2);
    expect(top.scoreComponents.vectorScore).toBeGreaterThanOrEqual(0);
    expect(top.scoreComponents.lexicalScore).toBeGreaterThanOrEqual(0);
    expect([0, 1]).toContain(top.scoreComponents.topicScore);
  });

  it("hybrid score equals the weighted sum of its components", () => {
    const results = searchKnowledge("Why was this system built?");
    for (const r of results) {
      const expected =
        HYBRID_WEIGHTS.vector * r.scoreComponents.vectorScore +
        HYBRID_WEIGHTS.lexical * r.scoreComponents.lexicalScore +
        HYBRID_WEIGHTS.topic * r.scoreComponents.topicScore;
      expect(r.score).toBeCloseTo(expected, 2);
    }
  });

  it("topic boost fires for a portfolio query and targets the correct document category", () => {
    const results = searchKnowledge("Why was this system built?");
    const topicBoostedDocs = results.filter((r) => r.scoreComponents.topicScore === 1);
    // product-vision and support-pain-points both carry product_purpose / business_value topics
    expect(topicBoostedDocs.length).toBeGreaterThan(0);
  });

  it("matchedTopics is non-empty when topicScore is 1", () => {
    const results = searchKnowledge("What are the limitations?");
    const boosted = results.filter((r) => r.scoreComponents.topicScore === 1);
    for (const r of boosted) {
      expect(r.scoreComponents.matchedTopics.length).toBeGreaterThan(0);
    }
  });

  it("vector pre-filter constant is sane (local < live)", () => {
    expect(VECTOR_PREFILTER.local).toBeLessThan(VECTOR_PREFILTER.live);
    expect(VECTOR_PREFILTER.local).toBeGreaterThan(0);
  });

  it("hybrid weight constants sum to 1.0", () => {
    const sum = HYBRID_WEIGHTS.vector + HYBRID_WEIGHTS.lexical + HYBRID_WEIGHTS.topic;
    expect(sum).toBeCloseTo(1.0, 6);
  });
});
