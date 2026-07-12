import { classifyIntent, classifyRisk, checkMandatoryEscalation, type Intent, type RiskLevel } from "./support-classification";
import { searchKnowledgeSemantic, type ScoreComponents } from "./knowledge";
import { runWorkflow } from "./workflow";
import { deriveWorkflowRequest } from "./tools";
import { verifyGroundedness, type VerifierResult } from "./verifier";
import { isOpenAIConfigured } from "./openai";
import { summarize } from "./trace-redaction";
import { RETRIEVAL_RELEVANCE_THRESHOLD } from "./agent";
import { classifyQueryTopics } from "./query-topics";
import { applyConversationContext, normalizeSupportInput } from "./multilingual";
import { deriveTone, composeCustomerResponse } from "./response-composer";
import { handleSimulatedHandoff, type HandoffResult } from "./support-handoff";
import { composeTransactionStatusReply, lookupSimulatedTransaction, type BackofficeTransactionResult } from "./support-backoffice";

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
 * local vector search. At most 3 tools run (retrieval, an optional status or
 * workflow lookup, and an optional simulated handoff), preserving the same
 * bounded-step philosophy as agent.ts.
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
  language: string;
  normalizationMode: "original" | "local-map" | "live-translation";
  customerScope: string | null;
};

export type SupportResult = { answer: string; customerVerificationRequired?: boolean; transaction?: BackofficeTransactionResult | null; handoff?: HandoffResult | null; trace: SupportTrace };

const WORKFLOW_INTENTS = new Set<Intent>(["request_status", "account_onboarding"]);

/**
 * Pure policy decision, deliberately separated from retrieval so it can be
 * unit-tested with constructed findings instead of depending on retrieval.
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

export async function runSupportAgent(message: string, previousUserMessages: string[] = [], customerUserId: string | null = null): Promise<SupportResult> {
  const start = Date.now();
  const multilingual = await normalizeSupportInput(message);
  const processingMessage = applyConversationContext(message, multilingual.normalized, previousUserMessages.slice(-4));
  const intent = classifyIntent(processingMessage);
  const risk = classifyRisk(processingMessage, intent);
  const live = isOpenAIConfigured();

  const steps: SupportStepTrace[] = [];
  const sourceMap = new Map<string, SupportSource>();
  const groundingEvidence: { id: string; text: string }[] = [];
  let modelCallCount = 0;
  let promptTokens = 0;
  let totalTokens = 0;
  let sawUsage = false;
  if (multilingual.mode === "live-translation") modelCallCount += 1;

  // Step 1: knowledge retrieval (always attempted — a support answer should be grounded whenever possible)
  const retrieval = await searchKnowledgeSemantic(processingMessage);
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

  // Step 2 for payment-status requests: call the shared simulated back-office
  // adapter. A missing reference asks for the minimum information first; a
  // normal status is answered directly; only an anomaly or unknown valid
  // reference is eligible for a review case.
  const transaction = intent === "deposit_withdrawal" && customerUserId ? lookupSimulatedTransaction(message, customerUserId) : null;
  const customerVerificationRequired = intent === "deposit_withdrawal" && !customerUserId;
  if (transaction) {
    steps.push({
      tool: "lookup_transaction_status",
      input: { reference: transaction.reference ?? "[required]", kind: transaction.kind ?? "UNKNOWN" },
      outputSummary: summarize(`Simulated back-office result: ${transaction.status}; review required: ${transaction.reviewRequired}`),
      resultCount: transaction.found ? 1 : 0,
    });
  }

  // Use one source for ordinary questions and up to two independently ranked sources
  // for explicit multi-topic questions. Each section keeps its source id so the answer
  // does not imply that a single document supports every claim.
  const queryTopics = classifyQueryTopics(processingMessage).filter((topic) => topic !== "unknown");
  const selectedResults = results.slice(0, new Set(queryTopics).size > 1 ? 2 : 1);
  const fragments: string[] = [selectedResults.length
    ? selectedResults.map((result) => `[${result.document.id}] ${result.chunk}`).join("\n\n")
    : "No grounded answer was found in the knowledge base for this request."];
  if (WORKFLOW_INTENTS.has(intent)) {
    const args = deriveWorkflowRequest(processingMessage);
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
  const verifier = verifyGroundedness(answer, groundingEvidence, processingMessage);
  const mandatory = checkMandatoryEscalation(processingMessage, intent);
  let { decision, escalationReason } = decideSupportPolicy(mandatory, verifier, risk, intent);
  if (customerVerificationRequired) {
    decision = "AUTO_RESPOND";
    escalationReason = null;
    steps.push({
      tool: "request_customer_verification",
      input: { requiredFor: "transaction_lookup" },
      outputSummary: "Customer User ID is required before accessing account-scoped transaction data.",
      resultCount: 0,
    });
  } else if (transaction) {
    if (transaction.status === "NEEDS_REFERENCE") {
      decision = "AUTO_RESPOND";
      escalationReason = null;
    } else if (transaction.reviewRequired) {
      decision = "ESCALATE";
      escalationReason = transaction.status === "NOT_FOUND"
        ? "Valid-looking transaction reference was not found in the simulated back office."
        : "Reported outcome conflicts with the simulated back-office transaction status.";
    } else {
      decision = "AUTO_RESPOND";
      escalationReason = null;
    }
  }

  // If escalated, invoke the simulated support handoff tool
  let handoff: HandoffResult | null = null;
  if (decision === "ESCALATE") {
    // Deterministic key based on message content to protect idempotency (demo scope)
    const idempotencyKey = `idemp-${Buffer.from(message.slice(0, 30)).toString("hex")}`;
    
    // Call the shared simulated handoff service directly
    const resultHandoff = handleSimulatedHandoff({
      customerMessage: summarize(message), // Apply existing trace-redaction protections
      intent,
      risk,
      escalationReason: escalationReason ?? "Escalation",
      locale: multilingual.language,
      idempotencyKey
    });

    handoff = resultHandoff;

    // Apply strict safe trace redaction (no full message or raw keys in technical traces)
    steps.push({
      tool: "create_support_handoff",
      input: {
        intent,
        risk,
        escalationReasonCode: escalationReason ? escalationReason.slice(0, 30) : "Escalation",
        locale: multilingual.language,
        sourceCount: groundingEvidence.length,
        messageLength: message.length,
        redactedIdempotencyIdentifier: `idemp-sha-${idempotencyKey.slice(-8)}`
      },
      outputSummary: `Simulated case handoff finished. Status: ${resultHandoff.status}. Handoff ID: ${resultHandoff.handoffId ?? "NONE"}`,
      resultCount: resultHandoff.success ? 1 : 0
    });
  }

  // Derive tone and compose natural conversational customer reply using the Response Composer layer
  const tone = deriveTone(message, risk, intent);
  let safeAnswer = await composeCustomerResponse({
    message,
    intent,
    risk,
    decision,
    escalationReason,
    evidence: decision === "AUTO_RESPOND" ? answer : "",
    locale: multilingual.language,
    tone,
    handoffId: handoff?.handoffId ?? null
  });
  if (customerVerificationRequired) {
    safeAnswer = multilingual.language === "th"
      ? "ยินดีช่วยตรวจสอบให้ครับ ก่อนเปิดดูรายการฝากหรือถอน ขอทราบ User ID ของลูกค้าเพื่อให้ระบบตรวจสอบข้อมูลได้ตรงบัญชีและปลอดภัยครับ ไม่ต้องส่งรหัสผ่าน OTP หรือเลขบัญชีธนาคาร"
      : multilingual.language === "zh"
        ? "很乐意帮您查询。查看存款或提款记录前，请提供客户 User ID，以便系统安全地查询正确账户。请勿发送密码、OTP 或银行账号。"
        : "I’ll be happy to check that. Before viewing a deposit or withdrawal, please provide the customer User ID so the system can securely query the correct account. Do not send a password, OTP, or bank-account number.";
  } else if (transaction) {
    safeAnswer = composeTransactionStatusReply(transaction, multilingual.language);
    if (handoff?.handoffId) {
      safeAnswer += multilingual.language === "th"
        ? ` หมายเลขอ้างอิงเคสสำหรับเดโมคือ ${handoff.handoffId}`
        : multilingual.language === "zh"
          ? ` 演示工单编号为 ${handoff.handoffId}。`
          : ` Your demo case reference is ${handoff.handoffId}.`;
    }
  }

  return {
    answer: safeAnswer,
    customerVerificationRequired,
    transaction,
    handoff,
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
      modelCallCount: modelCallCount + (multilingual.language !== "en" && live ? 1 : 0),
      estimatedUsage: sawUsage ? { promptTokens, totalTokens } : null,
      mode: live ? "live" : "deterministic",
      language: multilingual.language,
      normalizationMode: multilingual.mode,
      customerScope: customerUserId,
    },
  };
}
