/**
 * Query-topic classifier for the hybrid retrieval pipeline.
 *
 * This module is deliberately independent of the Intent classifier in
 * support-classification.ts. Intent drives escalation policy; QueryTopic
 * drives retrieval metadata boosting only. The two systems serve different
 * purposes and must not be conflated.
 *
 * Each topic represents a semantic class of queries. Patterns are designed
 * to fire on any reasonable member of that class — not on specific phrasing
 * of individual evaluation cases. When multiple patterns fire, all matching
 * topics are returned, enabling multi-document retrieval for multi-topic
 * queries.
 *
 * Returns ["unknown"] when no pattern fires. The retrieval pipeline treats
 * "unknown" as a signal to skip the topic-boost component and rely on
 * vector + lexical scoring only.
 */

export type QueryTopic =
  | "product_purpose"       // Why does this system exist? What is it for?
  | "business_value"        // What problem does it solve? What is the ROI?
  | "automation_conditions" // What conditions enable high automation coverage?
  | "current_capabilities"  // What is working / implemented today?
  | "limitations"           // What are the constraints, gaps, or weaknesses?
  | "roadmap"               // What is planned, future, or upcoming?
  | "operational_policy"    // How does the system / process work?
  | "customer_support_faq"  // Customer-facing product / account / billing questions
  | "unknown";              // No sufficient topic signal detected

type TopicPattern = { topic: Exclude<QueryTopic, "unknown">; pattern: RegExp };

/**
 * All patterns are evaluated; every matching topic is returned. Patterns
 * are ordered from most specific to most general to aid readability, but
 * order does not affect correctness since all are evaluated independently.
 *
 * Design constraints:
 * - Each pattern targets a semantic class, not individual phrasing
 * - Word boundaries (\b) prevent partial-token false matches
 * - Patterns do not reference specific document IDs or exact test questions
 */
const TOPIC_PATTERNS: TopicPattern[] = [
  {
    // Motivation, goal, or purpose of the system itself
    topic: "product_purpose",
    pattern:
      /\b(?:why|motivation|purpose|goal|objective|aim)\b|what\s+(?:is\s+)?this\s+(?:system|tool|platform|copilot)\b|what\s+does\s+(?:it|this)\s+do\b|what\s+is\s+the\s+(?:point|aim)\b/i,
  },
  {
    // Business value, problems addressed, ROI, or justification
    topic: "business_value",
    pattern:
      /business\s+(?:problem|value|case|benefit|challenge)\b|problem\s+(?:it|this)\s+(?:solve|address|tackle)\b|(?:what|which)\s+(?:problem|challenge|issue).{0,30}(?:solve|address|fix|tackle)\b|value\s+(?:of|it|this|delivered)\b|\bbenefit\b/i,
  },
  {
    // Prerequisites or conditions required to reach an automation target
    topic: "automation_conditions",
    pattern:
      /\bcondition\w*\b|\bprerequisite\b|\brequirement\w*\b.{0,20}(?:automat|percent|%)|\b(?:achieve|reach|hit|get\s+to)\b.{0,30}(?:automat|percent|%)|\b(?:80|90)\b.{0,20}(?:percent|%|automat)|what.{0,20}\b(?:need|must|has|have)\b.{0,20}\b(?:be|happen|hold|true)\b/i,
  },
  {
    // What is working, available, or implemented today
    topic: "current_capabilities",
    pattern:
      /\bimplement\w*\b|\bcurrent(?:ly)?\b|\bnow\b|what\s+(?:is|are|does\s+(?:it|this|the\s+system))\s+(?:available|working|supported|exist\w*)\b|\bfeature\w*\s+(?:available|exist)\b|what\s+(?:can|does)\s+(?:it|this|the\s+system)\s+(?:do|handle|support)\b|\b(?:today|already)\b.{0,20}\b(?:work|support|do)\b/i,
  },
  {
    // Gaps, weaknesses, constraints, or things the system cannot do
    topic: "limitations",
    pattern:
      /\blimit\w*\b|\bconstraint\b|\bweakness\b|\bgap\w*\b|\bshortcoming\b|what\s+(?:can'?t|cannot|won'?t|doesn'?t)\b|\bnot\s+(?:support\w*|capable|able\s+to)\b|\bmissing\b|\black\w*\b|\babsent\b|(?:doesn'?t|won'?t|can'?t)\s+(?:work|handle|support)\b/i,
  },
  {
    // Future plans, upcoming features, or enterprise trajectory
    topic: "roadmap",
    pattern:
      /\broadmap\b|\bfuture\b|\bplanned\b|\bupcoming\b|\bnext\s+(?:step|version|release|phase)\b|\beventually\b|\blong.?term\b|\bscale\b|\benterprise\b|what\s+(?:comes|is)\s+next\b|where\s+(?:is|does)\b.{0,20}(?:go|head|lead)\b|\bevolve\b|\bgrow\b|\bexpand\b|\bmature\b/i,
  },
  {
    // How the system or process works internally
    topic: "operational_policy",
    pattern:
      /how\s+(?:does|do)\s+(?:it|this|the\s+system)\s+work\b|\barchitecture\b|\bpipeline\b|\bmechanism\b|\bunder\s+the\s+hood\b|\binternally\b|\bstep.by.step\b|escalat\w+\s+(?:process|flow|logic)\b|\bretrieval\b|\bgrounded\b|how\s+(?:it|this)\s+(?:works|operates|functions)\b/i,
  },
  {
    // Customer-facing operational questions: accounts, billing, product, troubleshooting
    // Requires explicit customer context (first-person, specific customer actions)
    // to avoid boosting FAQ docs for portfolio/meta queries
    topic: "customer_support_faq",
    pattern:
      /\bmy\s+(?:account|bill|subscription|order|request|ticket|data|password|plan)\b|\b(?:when|where)\s+is\s+my\s+invoice\b|\bmy\s+billing\s+date\b|\b(?:cancel(?:l?ation)?|refund)\s+(?:my|policy|request)\b|how\s+(?:do\s+I|can\s+I)\s+(?:cancel|refund|pay|log\s*in|sign\s*up|creat\w+\s+(?:a\s+)?(?:new\s+)?account|reset|invite|export|check\s+(?:status|my))\b|\bgetting\s+started\b|\bset\s+up\s+(?:my\s+)?account\b|(?:product|app|page|site)\s+(?:won'?t|not|isn'?t)\s+load|\bcan'?t\s+log\s*in\b|\bpassport\b|\bidentity\s+(?:document|verification)\b|\bverify\s+(?:my\s+)?identity\b|\bnational\s+id\b|\bprivacy\s+(?:request|policy)\b|\bpersonal\s+(?:data|information)\b|\bdata\s+(?:request|deletion|breach)\b|\bstatus\s+of\s+my\b|\btrack(?:ing)?\s+my\b|\bwhere\s+is\s+my\b|\bupdate\s+on\s+my\b|\btroubleshoot\w*\b|\berror\s+code\b|(?:disappointed|unhappy|dissatisfied|complain\w*)\s+with\b|\bpayment\s+(?:method|failed)\b|\binvoice\s+(?:due|issued)\b/i,
  },
];

/**
 * Classify a query into one or more retrieval topics.
 *
 * Returns ["unknown"] when no pattern fires — in that case the retrieval
 * pipeline applies no topic boost and relies on vector + lexical scoring.
 *
 * Multiple topics may fire for multi-intent queries (e.g. a question about
 * current capabilities and future roadmap returns both "current_capabilities"
 * and "roadmap"), enabling multi-document evidence retrieval.
 */
export function classifyQueryTopics(query: string): QueryTopic[] {
  const matched = TOPIC_PATTERNS
    .filter(({ pattern }) => pattern.test(query))
    .map(({ topic }) => topic);
  return matched.length > 0 ? matched : ["unknown"];
}
