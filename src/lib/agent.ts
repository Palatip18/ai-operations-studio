import { evaluateRetrieval } from "./evaluation";
import { deriveWorkflowRequest, type ToolName } from "./tools";
import { runWorkflow } from "./workflow";
import { searchKnowledgeSemantic, type ScoreComponents } from "./knowledge";
import { isOpenAIConfigured } from "./openai";
import { notApplicableVerifierResult, verifyGroundedness, type VerifierResult } from "./verifier";
import { summarize } from "./trace-redaction";

/**
 * Bounded Planner -> Tool Execution -> Verifier agent.
 *
 * This is intentionally a deterministic, rule-based planner rather than an
 * LLM-driven one: it demonstrates the agentic *pattern* (explicit plan,
 * bounded steps, visible trace, groundedness check) without the cost,
 * latency, or unbounded-loop risk of letting a model decide when to stop.
 * The plan can select at most MAX_PLAN_STEPS tools and always terminates —
 * there is no recursive re-planning. A deterministic fallback answer is
 * always available even when no tool matches or the live provider is down.
 */

export const MAX_PLAN_STEPS = 3;

/**
 * Final relevance gate applied to the hybridScore returned by searchKnowledge /
 * searchKnowledgeSemantic. Results below this value are treated as "no
 * relevant evidence found" and trigger escalation rather than an automated
 * answer.
 *
 * Threshold history and calibration:
 *
 * Previous milestone (raw-vector scores): local=0.3, live=0.4
 *   Calibrated after KB grew from 3→26 documents; 0.3 kept on-topic FAQ
 *   matches (raw vectorScore 0.31-0.46) while filtering off-topic collisions
 *   (raw 0.10-0.27). However, portfolio/meta queries (raw ~0.10-0.25) fell
 *   below the threshold, causing unwanted escalation.
 *
 * Current milestone (hybrid scores, formula 0.55·vector+0.25·lexical+0.20·topic):
 *   The vector component weight (0.55) compresses the raw-vector scale, so
 *   the same threshold value in hybrid space requires re-calibration.
 *   Empirically validated against the development dataset (35 cases) and the
 *   challenge dataset (20 cases):
 *
 *   Local mode:
 *     Genuine on-topic matches with no boost: 0.55×0.31 ≈ 0.17 (would fail 0.3)
 *     Genuine matches with lexical+topic boost: 0.17–0.55 (pass 0.22)
 *     Portfolio queries (vector ~0.10-0.25) with topic+lexical: ≥0.28 (pass 0.22)
 *     Off-topic (no boost): 0.55×0.10 = 0.055 (fail 0.22) ✓
 *     Selected threshold: 0.22 (hypothesis; validated against dev+challenge datasets)
 *
 *   Live OpenAI embeddings:
 *     Genuine matches: raw 0.55-0.60 → hybrid min 0.55×0.55=0.30 (pass 0.30)
 *     Off-topic: raw 0.27-0.29 → hybrid max 0.55×0.29=0.16 (fail 0.30) ✓
 *     Selected threshold: 0.30 (hypothesis; cannot be validated without live API)
 *
 * These values are prototype-specific calibration points, not universal
 * retrieval architecture constants.
 */
export const RETRIEVAL_RELEVANCE_THRESHOLD: Record<"local" | "live", number> = { local: 0.22, live: 0.30 };

export type PlanStep = { tool: ToolName; reason: string };

export type AgentStepTrace = {
  tool: ToolName;
  input: Record<string, unknown>;
  outputSummary: string;
  resultCount: number;
};

export type AgentSource = {
  id: string;
  title: string;
  /** hybridScore — the primary ranking signal */
  score: number;
  /** Score breakdown (technical trace only; never shown in the customer-facing answer) */
  scoreComponents?: ScoreComponents;
};

export type AgentTrace = {
  plan: PlanStep[];
  steps: AgentStepTrace[];
  sources: AgentSource[];
  verifier: VerifierResult;
  latencyMs: number;
  toolCallCount: number;
  modelCallCount: number;
  estimatedUsage: { promptTokens: number; totalTokens: number } | null;
  mode: "live" | "deterministic";
};

export type AgentResult = { answer: string; trace: AgentTrace };

/** Deterministic, keyword-based plan. Bounded to MAX_PLAN_STEPS by construction (one slot per known tool). */
export function planAgent(message: string): PlanStep[] {
  const lower = message.toLowerCase();
  const plan: PlanStep[] = [];

  if (/metric|accuracy|evaluation|quality|score/.test(lower)) {
    plan.push({ tool: "get_demo_metrics", reason: "The message asks about evaluation, quality, or accuracy metrics." });
  }
  if (/workflow|access request|equipment|training request|approve/.test(lower)) {
    plan.push({ tool: "preview_workflow", reason: "The message describes an internal request that should go through policy automation." });
  }
  if (/polic|onboard|incident|expense|receipt|security training|claim|leave|vacation/.test(lower)) {
    plan.push({ tool: "search_knowledge", reason: "The message asks a knowledge question that should be grounded in retrieved documents." });
  }

  return plan.slice(0, MAX_PLAN_STEPS);
}

function synthesizeAnswer(fragments: string[]): string {
  if (fragments.length === 0) {
    return "This request could not be confidently mapped to knowledge retrieval, workflow policy, or evaluation metrics. This portfolio prototype only answers questions covered by its fictional sample documents and policies — try one of the recruiter scenarios or rephrase the question.";
  }
  return fragments.join(" ");
}

export async function runAgent(message: string): Promise<AgentResult> {
  const start = Date.now();
  const plan = planAgent(message);
  const live = isOpenAIConfigured();

  const steps: AgentStepTrace[] = [];
  const sourceMap = new Map<string, AgentSource>();
  const fragments: string[] = [];
  const groundingEvidence: { id: string; text: string }[] = [];
  let modelCallCount = 0;
  let promptTokens = 0;
  let totalTokens = 0;
  let sawUsage = false;
  let ranRetrieval = false;

  for (const step of plan.slice(0, MAX_PLAN_STEPS)) {
    if (step.tool === "search_knowledge") {
      ranRetrieval = true;
      const retrieval = await searchKnowledgeSemantic(message);
      const relevanceThreshold = retrieval.mode === "openai-embeddings" ? RETRIEVAL_RELEVANCE_THRESHOLD.live : RETRIEVAL_RELEVANCE_THRESHOLD.local;
      const results = retrieval.results.filter((result) => result.score >= relevanceThreshold);
      for (const result of results) {
        sourceMap.set(result.document.id, {
          id: result.document.id,
          title: result.document.title,
          score: Number(result.score.toFixed(3)),
          scoreComponents: result.scoreComponents,
        });
        groundingEvidence.push({ id: result.document.id, text: result.chunk });
      }
      if (retrieval.mode === "openai-embeddings") {
        modelCallCount += 1;
        if (retrieval.usage) {
          sawUsage = true;
          promptTokens += retrieval.usage.promptTokens;
          totalTokens += retrieval.usage.totalTokens;
        }
      }
      // Multi-document evidence: include all top-k grounded chunks so multi-topic
      // queries can cite more than one source rather than returning a partial answer.
      const answerChunks = results.map((r) => r.chunk);
      fragments.push(answerChunks.length ? `Grounded answer: ${answerChunks.join(" ")}` : "No grounded answer was found in the sample documents.");
      steps.push({
        tool: step.tool,
        input: { query: summarize(message) },
        outputSummary: summarize(results.length ? `Top source: ${results[0].document.title} via ${retrieval.mode}` : `No source matched via ${retrieval.mode}`),
        resultCount: results.length,
      });
    } else if (step.tool === "preview_workflow") {
      const args = deriveWorkflowRequest(message);
      const workflowSteps = runWorkflow(args);
      const policyDecision = workflowSteps.find((s) => s.step === "Policy check")?.status ?? "unknown";
      fragments.push(`Workflow preview created with ${workflowSteps.length} auditable steps. ${workflowSteps.map((s) => `${s.step}: ${s.detail}`).join(" ")}`);
      steps.push({
        tool: step.tool,
        input: { requester: args.requester, type: args.type, priority: args.priority },
        outputSummary: summarize(`${workflowSteps.length} workflow steps generated; policy decision: ${policyDecision}`),
        resultCount: workflowSteps.length,
      });
    } else {
      const metrics = evaluateRetrieval();
      fragments.push(`The current retrieval evaluation passes ${metrics.passed} of ${metrics.total} cases (${Math.round(metrics.top1Accuracy * 100)}% top-1 accuracy) on the small documented sample set.`);
      steps.push({
        tool: step.tool,
        input: {},
        outputSummary: summarize(`${metrics.passed}/${metrics.total} evaluation cases passed`),
        resultCount: metrics.total,
      });
    }
  }

  const answer = summarize(synthesizeAnswer(fragments), 2000);
  const verifier = ranRetrieval ? verifyGroundedness(answer, groundingEvidence) : notApplicableVerifierResult();

  return {
    answer,
    trace: {
      plan,
      steps,
      sources: [...sourceMap.values()],
      verifier,
      latencyMs: Date.now() - start,
      toolCallCount: steps.length,
      modelCallCount,
      estimatedUsage: sawUsage ? { promptTokens, totalTokens } : null,
      mode: live ? "live" : "deterministic",
    },
  };
}
