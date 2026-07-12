import { describe, expect, it } from "vitest";
import {
  evaluateAutomationCoverage,
  evaluateEscalation,
  evaluateGroundednessAndNoAnswer,
  evaluateIntentAccuracy,
  evaluateLatencySummary,
  evaluateResponsePolicyCompliance,
  evaluateRetrievalTop1,
  evaluateRiskAccuracy,
  evaluateToolRoutingAccuracy,
  runSupportEvaluationSuite,
  supportCases,
} from "./support-evaluation";

describe("support evaluation dataset", () => {
  it("has the minimum required case counts per group", () => {
    const byGroup = (group: string) => supportCases.filter((c) => c.group === group).length;
    expect(supportCases.length).toBeGreaterThanOrEqual(35);
    expect(byGroup("normal")).toBeGreaterThanOrEqual(20);
    expect(byGroup("paraphrase")).toBeGreaterThanOrEqual(5);
    expect(byGroup("insufficient_evidence")).toBeGreaterThanOrEqual(5);
    expect(byGroup("mandatory_escalation")).toBeGreaterThanOrEqual(5);
  });
});

describe("deterministic-mode evaluation metrics (real, measured — not asserted as 100%)", () => {
  it("scores intent classification accuracy at 100% (deterministic, keyword-based)", () => {
    expect(evaluateIntentAccuracy().accuracy).toBe(1);
  });

  it("scores risk classification accuracy at 100% (deterministic, keyword-based)", () => {
    expect(evaluateRiskAccuracy().accuracy).toBe(1);
  });

  it("scores tool-routing accuracy at 100% (deterministic, intent-based)", async () => {
    expect((await evaluateToolRoutingAccuracy()).accuracy).toBe(1);
  });

  it("always produces a response matching its decision's expected format", async () => {
    expect((await evaluateResponsePolicyCompliance()).complianceRate).toBe(1);
  });

  it("measures a real (non-perfect) retrieval top-1 accuracy — deterministic local-vector retrieval is weaker at this KB scale than live embeddings", async () => {
    const result = await evaluateRetrievalTop1();
    expect(result.accuracy).toBeGreaterThanOrEqual(0.2);
    expect(result.accuracy).toBeLessThanOrEqual(1);
  });

  it("measures groundedness and no-answer detection as real numbers, not asserted as perfect", async () => {
    const result = await evaluateGroundednessAndNoAnswer();
    expect(result.groundednessAccuracy).toBeGreaterThan(0);
    expect(result.noAnswerAccuracy).toBeGreaterThanOrEqual(0);
    expect(result.noAnswerAccuracy).toBeLessThanOrEqual(1);
  });

  it("measures escalation precision and recall as real numbers", async () => {
    const result = await evaluateEscalation();
    expect(result.precision).toBeGreaterThan(0);
    expect(result.recall).toBeGreaterThan(0);
    expect(result.expectedEscalations).toBeGreaterThan(0);
  });

  it("measures automation coverage over low-risk, answerable cases only", async () => {
    const result = await evaluateAutomationCoverage();
    expect(result.eligibleCount).toBeGreaterThan(0);
    expect(result.coverage).toBeGreaterThanOrEqual(0);
    expect(result.coverage).toBeLessThanOrEqual(1);
    expect(result.note.toLowerCase()).toContain("not");
  });

  it("returns a latency summary across the dataset", async () => {
    const result = await evaluateLatencySummary();
    expect(result.sampleCount).toBe(supportCases.length);
    expect(result.minMs).toBeLessThanOrEqual(result.maxMs);
  });
});

describe("runSupportEvaluationSuite", () => {
  it("aggregates every dimension with an honest dataset-scope note", async () => {
    const suite = await runSupportEvaluationSuite();
    expect(suite.note.toLowerCase()).toContain("fictional");
    expect(suite.note.toLowerCase()).not.toContain("achieved"); // must not present 80-90% as an achieved result
    expect(suite.intentAccuracy).toBeDefined();
    expect(suite.riskAccuracy).toBeDefined();
    expect(suite.retrievalTop1).toBeDefined();
    expect(suite.groundedness).toBeDefined();
    expect(suite.escalation).toBeDefined();
    expect(suite.automationCoverage).toBeDefined();
    expect(suite.latency).toBeDefined();
  });
});
