import { describe, expect, it } from "vitest";
import { MAX_PLAN_STEPS, planAgent, runAgent } from "./agent";

describe("planAgent routing", () => {
  it("routes a policy question to knowledge retrieval", () => {
    const plan = planAgent("What is the deadline for submitting an expense claim?");
    expect(plan.map((step) => step.tool)).toContain("search_knowledge");
  });

  it("routes a request description to the workflow tool", () => {
    const plan = planAgent("Create a high priority equipment workflow for Priya Nair.");
    expect(plan.map((step) => step.tool)).toContain("preview_workflow");
  });

  it("routes a metrics question to the evaluation tool", () => {
    const plan = planAgent("Show the retrieval evaluation score.");
    expect(plan.map((step) => step.tool)).toContain("get_demo_metrics");
  });

  it("returns an empty plan when nothing matches", () => {
    expect(planAgent("What is today's weather forecast?")).toEqual([]);
  });

  it("never exceeds MAX_PLAN_STEPS even when every category matches", () => {
    const plan = planAgent("workflow equipment access request metric accuracy evaluation quality score policy onboarding incident expense receipt security training claim leave vacation");
    expect(plan.length).toBeLessThanOrEqual(MAX_PLAN_STEPS);
    expect(plan.length).toBe(3);
    expect(new Set(plan.map((step) => step.tool)).size).toBe(plan.length);
  });
});

describe("runAgent", () => {
  it("produces a grounded answer with sources for an on-topic policy question", async () => {
    const { answer, trace } = await runAgent("When are expense claims due and what receipt is required for reimbursement?");
    expect(answer.length).toBeGreaterThan(0);
    expect(trace.mode).toBe("deterministic");
    expect(trace.toolCallCount).toBeGreaterThan(0);
    expect(trace.sources.length).toBeGreaterThan(0);
    expect(trace.verifier.applicable).toBe(true);
    expect(trace.verifier.grounded).toBe(true);
    expect(trace.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports insufficient evidence for an off-topic policy question", async () => {
    const { trace } = await runAgent("How much annual leave do I get?");
    expect(trace.verifier.applicable).toBe(true);
    expect(trace.verifier.grounded).toBe(false);
    expect(trace.verifier.warning).not.toBeNull();
  });

  it("marks workflow-only responses as not applicable for groundedness", async () => {
    const { trace } = await runAgent("Create a high priority equipment workflow for Priya Nair.");
    expect(trace.plan.map((step) => step.tool)).toEqual(["preview_workflow"]);
    expect(trace.verifier.applicable).toBe(false);
    expect(trace.verifier.grounded).toBe(true);
  });

  it("falls back to a deterministic no-match answer without crashing", async () => {
    const { answer, trace } = await runAgent("What is today's weather forecast?");
    expect(trace.plan).toEqual([]);
    expect(trace.steps).toEqual([]);
    expect(answer.length).toBeGreaterThan(0);
  });

  it("never runs more than MAX_PLAN_STEPS tool calls", async () => {
    const { trace } = await runAgent("workflow equipment access request metric accuracy evaluation quality score policy onboarding incident expense receipt security training claim leave vacation");
    expect(trace.toolCallCount).toBeLessThanOrEqual(MAX_PLAN_STEPS);
  });

  it("reports no provider usage data in deterministic mode", async () => {
    const { trace } = await runAgent("What is the deadline for submitting an expense claim?");
    expect(trace.estimatedUsage).toBeNull();
    expect(trace.modelCallCount).toBe(0);
  });
});
