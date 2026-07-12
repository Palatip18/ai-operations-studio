import { planAgent, runAgent } from "./agent";
import { runWorkflow, type WorkflowRequest } from "./workflow";
import type { ToolName } from "./tools";

/**
 * Extended evaluation suite for the agent milestone. All cases use the same
 * small, fictional, domain-neutral dataset already in this repository —
 * these metrics describe behavior on that included dataset only and are not
 * a claim of accuracy on any other data.
 */

export type ToolRoutingCase = { message: string; expectedTool: ToolName | null };

export const toolRoutingCases: ToolRoutingCase[] = [
  { message: "What is the deadline for submitting an expense claim?", expectedTool: "search_knowledge" },
  { message: "How quickly is a severe incident acknowledged?", expectedTool: "search_knowledge" },
  { message: "Create a high priority equipment workflow for Priya Nair.", expectedTool: "preview_workflow" },
  { message: "Analyze this software access request for Sam Okafor.", expectedTool: "preview_workflow" },
  { message: "Show the retrieval evaluation score.", expectedTool: "get_demo_metrics" },
  { message: "What is today's weather forecast?", expectedTool: null },
];

export function evaluateToolRouting() {
  const results = toolRoutingCases.map((testCase) => {
    const plan = planAgent(testCase.message);
    const actual = plan[0]?.tool ?? null;
    return { ...testCase, actual, passed: actual === testCase.expectedTool };
  });
  const passed = results.filter((result) => result.passed).length;
  return { total: results.length, passed, accuracy: passed / results.length, results };
}

export type WorkflowDecisionCase = { request: WorkflowRequest; expectedDecision: "review" | "complete" };

export const workflowDecisionCases: WorkflowDecisionCase[] = [
  { request: { requester: "Demo User", type: "Software access", priority: "Normal", details: "Standard tool access." }, expectedDecision: "complete" },
  { request: { requester: "Demo User", type: "Equipment", priority: "Normal", details: "Replacement keyboard." }, expectedDecision: "review" },
  { request: { requester: "Demo User", type: "Training", priority: "High", details: "Urgent certification." }, expectedDecision: "review" },
  { request: { requester: "Demo User", type: "Training", priority: "Normal", details: "Optional course." }, expectedDecision: "complete" },
];

export function evaluateWorkflowDecisions() {
  const results = workflowDecisionCases.map((testCase) => {
    const steps = runWorkflow(testCase.request);
    const policyStep = steps.find((step) => step.step === "Policy check");
    const actualDecision = policyStep?.status === "review" ? "review" : "complete";
    return { ...testCase, actualDecision, passed: actualDecision === testCase.expectedDecision };
  });
  const passed = results.filter((result) => result.passed).length;
  return { total: results.length, passed, accuracy: passed / results.length, results };
}

export type GroundednessCase = { message: string; expectNoAnswer: boolean };

export const groundednessCases: GroundednessCase[] = [
  { message: "When are expense claims due and what receipt is required for reimbursement?", expectNoAnswer: false },
  { message: "What is the incident acknowledgement time and update frequency for a high-severity incident?", expectNoAnswer: false },
  { message: "When must new remote hires complete security training?", expectNoAnswer: false },
  { message: "How many annual leave days does an employee receive?", expectNoAnswer: true },
  { message: "What is the CEO's personal home address, per policy?", expectNoAnswer: true },
];

export async function evaluateGroundedness() {
  const traces: { message: string; expectNoAnswer: boolean; grounded: boolean; groundednessScore: number; passed: boolean }[] = [];
  for (const testCase of groundednessCases) {
    const { trace } = await runAgent(testCase.message);
    const grounded = trace.verifier.grounded;
    const passed = testCase.expectNoAnswer ? !grounded : grounded;
    traces.push({ message: testCase.message, expectNoAnswer: testCase.expectNoAnswer, grounded, groundednessScore: trace.verifier.groundednessScore, passed });
  }
  const passed = traces.filter((result) => result.passed).length;
  const noAnswerCases = traces.filter((result) => result.expectNoAnswer);
  const noAnswerPassed = noAnswerCases.filter((result) => result.passed).length;
  return {
    total: traces.length,
    passed,
    groundednessAccuracy: passed / traces.length,
    noAnswerTotal: noAnswerCases.length,
    noAnswerPassed,
    noAnswerAccuracy: noAnswerCases.length ? noAnswerPassed / noAnswerCases.length : null,
    results: traces,
  };
}

const LATENCY_SAMPLE_MESSAGES = [
  "What is the deadline for submitting an expense claim?",
  "Create a high priority equipment workflow for Priya Nair.",
  "Show the retrieval evaluation score.",
  "What is the company's policy on annual leave days for staff?",
];

export async function evaluateLatency() {
  const samples: number[] = [];
  for (const message of LATENCY_SAMPLE_MESSAGES) {
    const { trace } = await runAgent(message);
    samples.push(trace.latencyMs);
  }
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return { sampleCount: samples.length, minMs: min, maxMs: max, meanMs: Math.round(mean), samplesMs: samples };
}

export async function runAgentEvaluationSuite() {
  const [toolRouting, workflowDecisions, groundedness, latency] = await Promise.all([
    Promise.resolve(evaluateToolRouting()),
    Promise.resolve(evaluateWorkflowDecisions()),
    evaluateGroundedness(),
    evaluateLatency(),
  ]);
  return {
    note: "All figures below describe behavior on this repository's small fictional evaluation dataset only. They are not claims of accuracy on any other data.",
    toolRouting,
    workflowDecisions,
    groundedness,
    latency,
  };
}

export type AgentEvaluationSuite = Awaited<ReturnType<typeof runAgentEvaluationSuite>>;
