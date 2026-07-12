/**
 * Deterministic, keyword-based classification for the customer-support
 * agent. Every function here is a rule-based lookup, not a model call — this
 * keeps intent/risk/escalation decisions testable, explainable, and free to
 * run in deterministic mode. (Contrast with the LLM-driven live-provider path
 * used only for tool-calling in the original AI Chat module.)
 */

export type Intent =
  | "account_onboarding"
  | "product_usage"
  | "request_status"
  | "billing_payment"
  | "refund_cancellation"
  | "troubleshooting"
  | "identity_documents"
  | "privacy_security"
  | "complaint"
  | "unknown";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

const INTENT_PATTERNS: { intent: Intent; pattern: RegExp }[] = [
  { intent: "refund_cancellation", pattern: /refund|cancel(?:lation)?|money back|stop (?:my )?subscription|end (?:my )?subscription/i },
  { intent: "billing_payment", pattern: /bill(?:ing)?|invoice|payment|charge(?:d)?|subscription cost|pric\w*/i },
  { intent: "identity_documents", pattern: /passport|id card|identity document|verify my identity|proof of identity|national id/i },
  { intent: "privacy_security", pattern: /privacy|personal data|personal information|gdpr|data breach|security breach|hacked|my data/i },
  { intent: "troubleshooting", pattern: /error|bug|not working|broken|crash|can'?t log in|won'?t load|not loading|isn'?t loading|troubleshoot/i },
  { intent: "request_status", pattern: /status of my (?:request|ticket|order)|where is my.*?(?:order|request|ticket)|track(?:ing)? my|update on my (?:request|ticket|order)/i },
  { intent: "account_onboarding", pattern: /sign(?:ing)? up|onboard(?:ing)?|creat(?:e|ing) (?:a|an|my)?\s*(?:new )?account|get(?:ting)? started|set up (?:my )?account/i },
  { intent: "complaint", pattern: /complain|furious|unacceptable|terrible service|worst (?:service|experience)|disappointed|not (?:very )?happy|unhappy|dissatisfied|angry/i },
  { intent: "product_usage", pattern: /how (?:do i|can i|to) use|how does .* work|\bfeature\b|tutorial|guide me|reporting tool/i },
];

export function classifyIntent(message: string): Intent {
  for (const { intent, pattern } of INTENT_PATTERNS) {
    if (pattern.test(message)) return intent;
  }
  return "unknown";
}

const HIGH_RISK_KEYWORDS =
  /dispute|unauthorized charge|chargeback|fraudulent|fraud|hacked|security breach|lawsuit|legal action|compliance violation|gdpr complaint|lost money|financial loss|make an exception|waive (?:the|your) policy|bend the rules|special exception outside|social media|post this online|report you (?:publicly|online)|talk to (?:my )?lawyer|threaten(?:ing)? to/i;

const MEDIUM_RISK_INTENTS = new Set<Intent>(["billing_payment", "refund_cancellation", "identity_documents", "privacy_security", "complaint"]);

/** Deterministic risk classification. Mandatory-escalation keyword matches always classify as HIGH regardless of intent. */
export function classifyRisk(message: string, intent: Intent): RiskLevel {
  if (HIGH_RISK_KEYWORDS.test(message)) return "HIGH";
  if (intent === "unknown") return "MEDIUM";
  if (MEDIUM_RISK_INTENTS.has(intent)) return "MEDIUM";
  return "LOW";
}

export type MandatoryEscalationCheck = { escalate: boolean; reason: string | null };

/**
 * Rule-based mandatory-escalation triggers that can be detected from the
 * message alone, before retrieval runs. Three other mandatory triggers from
 * the spec — insufficient/unsupported evidence, low retrieval relevance, and
 * an ambiguous case where no safe grounded answer exists — necessarily
 * depend on the retrieval/verifier result and are therefore evaluated by the
 * orchestrator (`support-agent.ts`) after retrieval, not here.
 */
export function checkMandatoryEscalation(message: string, intent: Intent): MandatoryEscalationCheck {
  if (/dispute|unauthorized charge|chargeback|fraudulent charge|lost money|financial loss/i.test(message)) {
    return { escalate: true, reason: "Potential financial loss or transaction dispute requires human review." };
  }
  if (/passport|national id|social security|personal data|personal information|my data|identity document/i.test(message) && (intent === "identity_documents" || intent === "privacy_security")) {
    return { escalate: true, reason: "Request involves personal or sensitive identity/data handling." };
  }
  if (/fraud|hacked|security breach|lawsuit|legal action|compliance violation|gdpr complaint/i.test(message)) {
    return { escalate: true, reason: "Message raises a fraud, security, legal, or compliance concern." };
  }
  if (/make an exception|waive (?:the|your) policy|bend the rules|special exception outside/i.test(message)) {
    return { escalate: true, reason: "Customer is requesting an exception outside documented policy." };
  }
  if (/furious|unacceptable|terrible service|worst (?:service|experience)|social media|post this online|report you (?:publicly|online)|talk to (?:my )?lawyer/i.test(message)) {
    return { escalate: true, reason: "Highly negative complaint or threat of public escalation requires human handling." };
  }
  return { escalate: false, reason: null };
}
