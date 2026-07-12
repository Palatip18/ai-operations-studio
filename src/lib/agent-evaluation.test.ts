import { describe, expect, it } from "vitest";
import {
  evaluateGroundedness,
  evaluateLatency,
  evaluateToolRouting,
  evaluateWorkflowDecisions,
  runAgentEvaluationSuite,
} from "./agent-evaluation";

describe("evaluateToolRouting", () => {
  it("scores routing accuracy on the fictional dataset", () => {
    const result = evaluateToolRouting();
    expect(result.total).toBeGreaterThan(0);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
  });
});

describe("evaluateWorkflowDecisions", () => {
  it("scores workflow policy decisions against expected outcomes", () => {
    const result = evaluateWorkflowDecisions();
    expect(result.total).toBe(result.results.length);
    expect(result.accuracy).toBe(result.passed / result.total);
  });
});

describe("evaluateGroundedness", () => {
  it("includes both answerable and no-answer cases", async () => {
    const result = await evaluateGroundedness();
    expect(result.noAnswerTotal).toBeGreaterThan(0);
    expect(result.noAnswerAccuracy).not.toBeNull();
    expect(result.groundednessAccuracy).toBeGreaterThanOrEqual(0);
  });
});

describe("evaluateLatency", () => {
  it("returns a latency summary across sample messages", async () => {
    const result = await evaluateLatency();
    expect(result.sampleCount).toBeGreaterThan(0);
    expect(result.minMs).toBeLessThanOrEqual(result.maxMs);
    expect(result.samplesMs.length).toBe(result.sampleCount);
  });
});

describe("runAgentEvaluationSuite", () => {
  it("aggregates all evaluation dimensions with an honest dataset-scope note", async () => {
    const suite = await runAgentEvaluationSuite();
    expect(suite.note.toLowerCase()).toContain("fictional");
    expect(suite.toolRouting).toBeDefined();
    expect(suite.workflowDecisions).toBeDefined();
    expect(suite.groundedness).toBeDefined();
    expect(suite.latency).toBeDefined();
  });
});
