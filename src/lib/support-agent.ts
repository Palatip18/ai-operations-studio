import { classifyIntent, classifyRisk, checkMandatoryEscalation, type Intent, type RiskLevel } from "./support-classification";
import { searchKnowledgeSemantic, type ScoreComponents } from "./knowledge";
import { runWorkflow } from "./workflow";
import { deriveWorkflowRequest } from "./tools";
import { verifyGroundedness, type VerifierResult } from "./verifier";
import { isOpenAIConfigured } from "./openai";
import { summarize } from "./trace-redaction";
import { RETRIEVAL_RELEVANCE_THRESHOLD } from "./agent";
import { classifyQueryTopics } from "./query-topics";

/**
 * Bounded customer-support agent:
 *
 *   message -> intent classification -> risk classification -> knowledge
 *   retrieval -> optional workflow tool -> draft response -> groundedness
 *   verification -> policy/safety decision -> AUTO_RESPOND | ESCALATE
 *
 * Intent classification, risk classification, the mandatory-escalation
 * keyword checks, and the final policy decision are all deterministic
 * rule-based logic (see support-classification.ts) — not model calls. The
 * only optional model-driven step is knowledge retrieval, which uses live
 * embeddings when configured and otherwise falls back to a deterministic
 * local vector search. At most 2 tools ever run (retrieval + optional
 * workflow), well within the same bounded-step philosophy as agent.ts.
 */

export type SupportDecision = "AUTO_RESPOND" | "ESCALATE";

export type SupportStepTrace = { tool: string; input: Record<string, unknown>; outputSummary: string; resultCount: number };
export type SupportSource = {
  id: string;
  title: string;
  /** hybridScore — the primary ranking signal */
  score: number;
  /** Score breakdown for technical/evaluation traces. Not included in customer-facing reply. */
  scoreComponents?: ScoreComponents;
};

export type SupportTrace = {
  intent: Intent;
  risk: RiskLevel;
  steps: SupportStepTrace[];
  sources: SupportSource[];
  verifier: VerifierResult;
  decision: SupportDecision;
  escalationReason: string | null;
  latencyMs: number;
  toolCallCount: number;
  modelCallCount: number;
  estimatedUsage: { promptTokens: number; totalTokens: number } | null;
  mode: "live" | "deterministic";
};

export type SupportResult = { answer: string; trace: SupportTrace };

const WORKFLOW_INTENTS = new Set<Intent>(["request_status", "account_onboarding"]);

/**
 * Pure policy decision, deliberately separated from retrieval so it can be
 * unit-tested with constructed inputs instead of depending on the (noisier,
 * scale-sensitive) retrieval step. Order matters: a keyword-based mandatory
 * trigger always wins, then insufficient evidence, then high risk.
 */
export type MandatoryEscalationCheck = ReturnType<typeof checkMandatoryEscalation>;

export function decideSupportPolicy(
  mandatory: MandatoryEscalationCheck,
  verifier: VerifierResult,
  risk: RiskLevel,
  intent: Intent,
): { decision: SupportDecision; escalationReason: string | null } {
  if (mandatory.escalate) return { decision: "ESCALATE", escalationReason: mandatory.reason };
  if (!verifier.grounded) {
    return {
      decision: "ESCALATE",
      escalationReason: intent === "unknown"
        ? "Ambiguous request with no grounded evidence; a safe automated answer could not be produced."
        : "Insufficient or unsupported evidence to answer this safely.",
    };
  }
  if (risk === "HIGH") return { decision: "ESCALATE", escalationReason: "High risk classification requires human review." };
  return { decision: "AUTO_RESPOND", escalationReason: null };
}

export async function runSupportAgent(message: string): Promise<SupportResult> {
  const start = Date.now();
  const intent = classifyIntent(message);
  const risk = classifyRisk(message, intent);
  const live = isOpenAIConfigured();

  const steps: SupportStepTrace[] = [];
  const sourceMap = new Map<string, SupportSource>();
  const groundingEvidence: { id: string; text: string }[] = [];
  let modelCallCount = 0;
  let promptTokens = 0;
  let totalTokens = 0;
  let sawUsage = false;

  // Step 1: knowledge retrieval (always attempted — a support answer should be grounded whenever possible)
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
  steps.push({
    tool: "search_knowledge",
    input: { query: summarize(message) },
    outputSummary: summarize(results.length ? `Top source: ${results[0].document.title} via ${retrieval.mode}` : `No source matched via ${retrieval.mode}`),
    resultCount: results.length,
  });

  // Use one source for ordinary questions and up to two independently ranked sources
  // for explicit multi-topic questions. Each section keeps its source id so the answer
  // does not imply that a single document supports every claim.
  const queryTopics = classifyQueryTopics(message).filter((topic) => topic !== "unknown");
  const selectedResults = results.slice(0, new Set(queryTopics).size > 1 ? 2 : 1);
  const fragments: string[] = [selectedResults.length
    ? selectedResults.map((result) => `[${result.document.id}] ${result.chunk}`).join("\n\n")
    : "No grounded answer was found in the knowledge base for this request."];
  if (WORKFLOW_INTENTS.has(intent)) {
    const args = deriveWorkflowRequest(message);
    const workflowSteps = runWorkflow(args);
    fragments.push(`Simulated status check: ${workflowSteps.map((s) => `${s.step}: ${s.detail}`).join(" ")}`);
    steps.push({
      tool: "preview_workflow",
      input: { requester: args.requester, type: args.type, priority: args.priority },
      outputSummary: summarize(`${workflowSteps.length} simulated workflow steps generated (no real ticketing system connected)`),
      resultCount: workflowSteps.length,
    });
  }

  const answer = summarize(fragments.join(" "), 2000);
  const verifier = verifyGroundedness(answer, groundingEvidence, message);
  const mandatory = checkMandatoryEscalation(message, intent);
  const { decision, escalationReason } = decideSupportPolicy(mandatory, verifier, risk, intent);

  const safeAnswer = decision === "AUTO_RESPOND"
    ? answer
    : `This request has been escalated to a human agent. ${escalationReason ?? ""}`.trim();

  return {
    answer: safeAnswer,
    trace: {
      intent,
      risk,
      steps,
      sources: [...sourceMap.values()],
      verifier,
      decision,
      escalationReason,
      latencyMs: Date.now() - start,
      toolCallCount: steps.length,
      modelCallCount,
      estimatedUsage: sawUsage ? { promptTokens, totalTokens } : null,
      mode: live ? "live" : "deterministic",
    },
  };
}
