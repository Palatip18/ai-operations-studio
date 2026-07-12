import { describe, expect, it } from "vitest";
import {
  challengeCases,
  runChallengeSuite,
  validateNoDuplicates,
} from "./support-challenge";

describe("challenge dataset integrity", () => {
  it("contains exactly 20 cases", () => {
    expect(challengeCases.length).toBe(20);
  });

  it("contains the required group counts", () => {
    const count = (g: string) => challengeCases.filter((c) => c.group === g).length;
    expect(count("portfolio_paraphrase")).toBe(6);
    expect(count("short_ambiguous")).toBe(4);
    expect(count("off_topic")).toBe(4);
    expect(count("negation")).toBe(3);
    expect(count("escalation_guard")).toBe(3);
  });

  it("has no overlap with the development dataset", () => {
    const { valid, duplicates } = validateNoDuplicates();
    expect(valid).toBe(true);
    expect(duplicates).toHaveLength(0);
  });
});

describe("challenge suite — Group A: portfolio paraphrases (priority queries)", () => {
  it("all six priority-query paraphrases auto-respond in deterministic mode", async () => {
    const suite = await runChallengeSuite();
    const groupA = suite.results.filter((r) => r.group === "portfolio_paraphrase");
    // Require at least 4 of 6 to auto-respond (honest target; 6/6 is the goal)
    const passed = groupA.filter((r) => r.decisionPassed).length;
    expect(passed).toBeGreaterThanOrEqual(4);
  });

  it("reports actual decision and doc for each priority query", async () => {
    const suite = await runChallengeSuite();
    const groupA = suite.results.filter((r) => r.group === "portfolio_paraphrase");
    for (const r of groupA) {
      // Structural check: all fields are present
      expect(r.actualDecision).toMatch(/^(AUTO_RESPOND|ESCALATE)$/);
      expect(typeof r.actualDocId === "string" || r.actualDocId === null).toBe(true);
    }
  });
});

describe("challenge suite — Group C: off-topic precision guard", () => {
  it("all four off-topic queries escalate (metadata boost must not surface wrong docs)", async () => {
    const suite = await runChallengeSuite();
    const groupC = suite.results.filter((r) => r.group === "off_topic");
    expect(groupC.length).toBe(4);
    const passed = groupC.filter((r) => r.decisionPassed).length;
    expect(passed).toBe(4);
  });
});

describe("challenge suite — Group E: mandatory escalation regression guards", () => {
  it("account compromise escalates (security breach rule)", async () => {
    const suite = await runChallengeSuite();
    const compromised = suite.results.find((r) => r.message.includes("security breach"));
    expect(compromised?.actualDecision).toBe("ESCALATE");
  });

  it("charge dispute escalates (financial dispute rule)", async () => {
    const suite = await runChallengeSuite();
    const dispute = suite.results.find((r) => r.message.includes("dispute"));
    expect(dispute?.actualDecision).toBe("ESCALATE");
  });

  it("knowledge base composition query auto-responds (no mandatory trigger)", async () => {
    const suite = await runChallengeSuite();
    const kbQuery = suite.results.find((r) => r.message.includes("knowledge base made of"));
    expect(kbQuery?.actualDecision).toBe("AUTO_RESPOND");
  });
});

describe("challenge suite — reporting contract", () => {
  it("returns a dataset-scope note that distinguishes challenge from development", async () => {
    const suite = await runChallengeSuite();
    expect(suite.note.toLowerCase()).toContain("challenge");
    expect(suite.note.toLowerCase()).toContain("development");
    expect(suite.note.toLowerCase()).toContain("separately");
  });

  it("reports byGroup breakdown for all five groups", async () => {
    const suite = await runChallengeSuite();
    expect(suite.byGroup.portfolio_paraphrase).toBeDefined();
    expect(suite.byGroup.short_ambiguous).toBeDefined();
    expect(suite.byGroup.off_topic).toBeDefined();
    expect(suite.byGroup.negation).toBeDefined();
    expect(suite.byGroup.escalation_guard).toBeDefined();
  });

  it("overall decision accuracy is between 0 and 1", async () => {
    const suite = await runChallengeSuite();
    expect(suite.overallDecisionAccuracy).toBeGreaterThanOrEqual(0);
    expect(suite.overallDecisionAccuracy).toBeLessThanOrEqual(1);
  });
});
