import { chunkText, cosineSimilarity, embedText, tokenize } from "./retrieval";
import { createOpenAIEmbeddings, isOpenAIConfigured } from "./openai";
import { classifyQueryTopics, type QueryTopic } from "./query-topics";

// ---------------------------------------------------------------------------
// Document metadata schema
// ---------------------------------------------------------------------------

/**
 * Optional structured metadata attached to each knowledge document.
 * Used by the hybrid retrieval pipeline to apply topic and lexical boosts
 * on top of the base vector similarity score.
 *
 * Design rules:
 * - `topics`: which query-topic classes this document is relevant to
 * - `capabilityStatus`: honest status label for portfolio audiences
 * - `keywords`: editorial topic vocabulary (query-surface phrasing);
 *   intentionally distinct from verbatim document body text to add recall
 *   without trivially inflating lexical scores for all queries
 */
export type CapabilityStatus = "IMPLEMENTED" | "SIMULATED" | "ROADMAP" | "MIXED";

export type DocumentMetadata = {
  topics: QueryTopic[];
  capabilityStatus?: CapabilityStatus;
  keywords: string[];
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  updated: string;
  content: string;
  metadata?: DocumentMetadata;
};

// ---------------------------------------------------------------------------
// Score components (exposed in technical/evaluation traces only)
// ---------------------------------------------------------------------------

/**
 * The three auditable components of the hybrid retrieval score.
 * Exposed in the agent execution trace for technical inspection and
 * evaluation; never included in the customer-facing answer text.
 *
 * Hybrid formula:
 *   hybridScore = HYBRID_WEIGHTS.vector * vectorScore
 *               + HYBRID_WEIGHTS.lexical * lexicalScore
 *               + HYBRID_WEIGHTS.topic * topicScore
 */
export type ScoreComponents = {
  vectorScore: number;
  lexicalScore: number;
  topicScore: number;
  hybridScore: number;
  matchedTopics: QueryTopic[];
  matchedKeywords: string[];
};

/**
 * Hybrid scoring weights. Treated as hypotheses validated against the
 * development and challenge datasets; adjusted values are documented
 * with justification in the commit notes.
 *
 * vector (0.55): primary content-relevance signal; preserved for all cases
 * lexical (0.25): editorial keyword overlap; adds recall for topic-specific phrasing
 * topic  (0.20): binary category boost; 1.0 when doc's topic ∩ query's topics ≠ ∅
 */
export const HYBRID_WEIGHTS = { vector: 0.55, lexical: 0.25, topic: 0.20 } as const;

/**
 * Minimum vector similarity required before the lexical + topic boost is
 * applied. Prevents a document with zero content relevance from being
 * surfaced by metadata boost alone. Topic boost alone (0.20) cannot push
 * a document past the final threshold (0.22 local) without a vectorScore
 * that passes this pre-filter.
 */
export const VECTOR_PREFILTER: Record<"local" | "live", number> = { local: 0.05, live: 0.15 };

// ---------------------------------------------------------------------------
// Knowledge documents (26 total)
// ---------------------------------------------------------------------------

export const knowledgeDocuments: KnowledgeDocument[] = [
  // --- Original operational documents ---
  {
    id: "remote-onboarding",
    title: "Remote Team Onboarding Guide",
    category: "People Operations",
    updated: "2026-06-12",
    content: "New remote team members receive account access on day one, complete security training within three business days, and meet their onboarding partner twice during the first week. Managers run a 30-day check-in and record agreed goals.",
    metadata: {
      topics: ["operational_policy"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["onboard", "onboarding", "remote", "training", "security", "week", "checklist", "starter", "manager", "access"],
    },
  },
  {
    id: "expense-policy",
    title: "Sample Expense Policy",
    category: "Finance Operations",
    updated: "2026-05-20",
    content: "Expense claims require a receipt, business purpose, and cost centre. Claims below 5,000 THB need manager approval. Higher-value claims also require finance review. Employees should submit claims within 30 days.",
    metadata: {
      topics: ["operational_policy"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["expense", "expenses", "claim", "claims", "receipt", "receipts", "reimbursement", "finance", "approval", "submit", "submitted"],
    },
  },
  {
    id: "incident-playbook",
    title: "Service Incident Playbook",
    category: "IT Operations",
    updated: "2026-06-01",
    content: "A high-severity incident is acknowledged within 15 minutes. The incident lead opens a shared channel, assigns an owner, publishes updates every 30 minutes, and schedules a blameless review within five business days after resolution.",
    metadata: {
      topics: ["operational_policy"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["incident", "severity", "severe", "acknowledge", "acknowledged", "update", "review", "blameless", "channel", "owner"],
    },
  },

  // --- Customer Support Copilot meta / portfolio documents ---
  {
    id: "product-vision",
    title: "Product Vision: Why the Support Copilot Was Built",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "This fictional Customer Support Copilot was built because support teams spend most of their time answering the same repetitive, low-risk questions instead of handling the complex cases that need a human. The goal is to automatically resolve routine, well-documented inquiries so human agents can focus on complex, sensitive, or high-risk cases. It is designed to target up to 80-90% automation of repetitive, low-risk customer inquiries when supported by a sufficiently comprehensive, validated, and continuously maintained knowledge base. This is a controlled-pilot target, not a guaranteed production result, and it is not designed or intended to replace customer support as a whole.",
    metadata: {
      topics: ["product_purpose", "business_value"],
      capabilityStatus: "MIXED",
      keywords: ["motivation", "purpose", "goal", "objective", "vision", "designed", "built", "created", "reason", "target", "automate"],
    },
  },
  {
    id: "support-pain-points",
    title: "Customer Support Pain Points This Prototype Targets",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "Common fictional support pain points include long wait times for simple questions, inconsistent answers between agents, repeated questions that already have documented answers, agents spending time searching multiple systems for one answer, and complex or sensitive cases getting stuck behind a queue of routine questions. Automating the routine share of inquiries is intended to reduce wait times for everyone and let human agents spend more time on cases that genuinely need judgment.",
    metadata: {
      topics: ["business_value", "product_purpose"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["problem", "challenge", "pain", "inefficiency", "solve", "address", "wait", "inconsistent", "repetitive", "queue"],
    },
  },
  {
    id: "target-users-channels",
    title: "Target Users and Supported Channels",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "The target users are customers of a fictional subscription product, and the internal support agents who supervise and handle escalations. In this prototype, only a web chat interface is IMPLEMENTED. Ticketing, email, and messaging channels such as LINE, Telegram, WhatsApp, and Slack are ROADMAP integrations, not present in this codebase.",
    metadata: {
      topics: ["current_capabilities", "roadmap"],
      capabilityStatus: "MIXED",
      keywords: ["user", "channel", "web", "chat", "interface", "telegram", "slack", "whatsapp"],
    },
  },
  {
    id: "kb-quality-requirements",
    title: "Knowledge-Base Quality Requirements",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "For automation to be safe and effective, the knowledge base must be complete (covers the real range of customer questions), accurate (reviewed and correct), fresh (updated as policy changes), and explicit about exceptions (edge cases and exclusions are documented, not assumed). A knowledge base that is out of date, incomplete, or silent on exceptions will produce ungrounded or incorrect automated answers, which is why this system is designed to escalate rather than guess when evidence is weak.",
    metadata: {
      topics: ["automation_conditions", "limitations"],
      capabilityStatus: "MIXED",
      keywords: ["quality", "accurate", "complete", "fresh", "maintained", "comprehensive", "validated", "exception", "requirement"],
    },
  },
  {
    id: "automation-coverage-conditions",
    title: "Conditions Needed to Target 80-90% Automation Coverage",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "Targeting 80-90% automation of repetitive, low-risk inquiries depends on several conditions holding together: a knowledge base that is comprehensive and validated for the supported intents, continuous maintenance as products and policies change, retrieval quality that reliably finds the right document, conservative escalation thresholds tuned against real outcomes, and a feedback loop where escalated and misclassified cases are reviewed and fed back into the knowledge base. Without these conditions, actual automation coverage will be lower, and this repository does not claim to have met them at production scale.",
    metadata: {
      topics: ["automation_conditions"],
      capabilityStatus: "MIXED",
      keywords: ["condition", "prerequisite", "requirement", "achieve", "threshold", "comprehensive", "validated", "feedback", "coverage"],
    },
  },
  {
    id: "support-copilot-architecture",
    title: "Current Architecture (Customer Support Copilot)",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "The support flow is: classify intent, classify risk, retrieve knowledge, optionally run a workflow tool, draft a response, run the groundedness verifier, apply deterministic policy rules, and return AUTO_RESPOND or ESCALATE with a reason. Intent and risk classification and the escalation rules are deterministic keyword-based logic, not model calls. Knowledge retrieval optionally uses a live embeddings provider and otherwise falls back to a deterministic local vector search. The full plan, tool calls, sources, verifier result, decision, and cost/latency are returned in one redacted execution trace.",
    metadata: {
      topics: ["operational_policy", "current_capabilities"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["architecture", "flow", "pipeline", "mechanism", "classify", "retrieve", "verify", "deterministic", "trace"],
    },
  },
  {
    id: "support-copilot-capabilities",
    title: "Current Capabilities (Customer Support Copilot)",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "IMPLEMENTED in this repository: deterministic intent classification, deterministic risk classification, mandatory-escalation rule checks, knowledge retrieval with citations, a groundedness verifier, an AUTO_RESPOND or ESCALATE decision, and a redacted execution trace with latency and token usage. SIMULATED / MOCKED: workflow automation steps, request-status lookups, and escalation routing (no real queue or ticketing system is connected). ROADMAP: CRM and ticketing integration, email and chat-channel connectors, a persisted vector database, model-based groundedness, and a real human-agent handoff queue.",
    metadata: {
      topics: ["current_capabilities"],
      capabilityStatus: "MIXED",
      keywords: ["implemented", "available", "working", "current", "existing", "supported", "simulated", "mocked", "work"],
    },
  },
  {
    id: "support-copilot-limitations",
    title: "Current Limitations (Customer Support Copilot)",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "This prototype uses a small, fictional knowledge base and a small fictional evaluation dataset; its measured accuracy figures describe that dataset only, not real customer traffic. Intent and risk classification are keyword-based and will misclassify phrasing outside the patterns they check for. The groundedness verifier is a lexical-overlap heuristic, not an entailment model, and can be fooled by paraphrase or coincidental keyword overlap. No case is actually escalated to a real person; escalation is represented as a decision and reason only.",
    metadata: {
      topics: ["limitations"],
      capabilityStatus: "MIXED",
      keywords: ["limit", "constraint", "gap", "weakness", "missing", "prototype", "fictional", "keyword", "heuristic"],
    },
  },
  {
    id: "pilot-deployment-plan",
    title: "Pilot Deployment Plan",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "A fictional controlled pilot would start with a narrow set of intents that have the most complete documentation (for example account onboarding and product usage), run in shadow mode alongside human agents to compare answers before enabling auto-response, and expand intent coverage only after the knowledge base and evaluation results support it. Escalation thresholds would start conservative and be relaxed gradually as real-world precision and recall are measured, not assumed.",
    metadata: {
      topics: ["roadmap", "operational_policy"],
      capabilityStatus: "ROADMAP",
      keywords: ["pilot", "deploy", "shadow", "expand", "conservative", "calibrate", "rollout", "gradual"],
    },
  },
  {
    id: "business-value-measurement",
    title: "Business Value Measurement",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "Suggested fictional business metrics for a pilot include automation coverage (share of eligible low-risk inquiries safely auto-resolved), escalation precision and recall (are escalations both necessary and complete), average handling time saved per automated case, customer satisfaction on automated versus escalated cases, and containment rate (customers who did not need to follow up after an automated answer). These are metrics to measure in a real pilot, not results already achieved by this prototype.",
    metadata: {
      topics: ["business_value"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["metric", "measure", "value", "coverage", "handling", "satisfaction", "containment", "roi"],
    },
  },
  {
    id: "enterprise-roadmap",
    title: "Enterprise Roadmap",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "A fictional path to an enterprise support platform includes: a persisted, access-controlled knowledge base with versioning; model-based groundedness and entailment checking in place of lexical overlap; multi-language intent and risk classification; a real human-agent handoff queue with full audit history; role-based access for support supervisors; and continuous evaluation against live, anonymized traffic samples rather than only a fictional test set.",
    metadata: {
      topics: ["roadmap"],
      capabilityStatus: "ROADMAP",
      keywords: ["enterprise", "scale", "platform", "future", "evolve", "mature", "persisted", "versioning", "audit"],
    },
  },
  {
    id: "integration-roadmap",
    title: "Integration Roadmap",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "ROADMAP integrations (not implemented in this codebase) include: CRM systems, ticketing systems, email, web chat widgets, and messaging channels such as LINE, Telegram, WhatsApp, and Slack, plus document sources such as Google Drive, Notion, and SharePoint for continuously syncing the knowledge base. This prototype only implements a single web chat demo UI backed by a small, manually curated, fictional document set.",
    metadata: {
      topics: ["roadmap", "current_capabilities"],
      capabilityStatus: "ROADMAP",
      keywords: ["planned", "upcoming", "integration", "future", "roadmap", "crm", "ticketing", "channel", "email", "messaging"],
    },
  },
  {
    id: "complaints-escalation-policy",
    title: "Complaints and Escalation Policy",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "A complaint that is highly negative, references legal action, or threatens public escalation (for example on social media) must be escalated to a human agent rather than answered automatically, even if the underlying question is otherwise simple. The goal is to make sure an upset customer reaches a person who can exercise judgment, not a scripted response.",
    metadata: {
      topics: ["operational_policy", "customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["complaint", "complaints", "dissatisfied", "unhappy", "disappointed", "negative", "legal", "escalate", "experience", "service"],
    },
  },
  {
    id: "tone-response-guidelines",
    title: "Tone and Response Guidelines",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "Automated responses should be concise, empathetic, and specific: acknowledge the question, give the grounded answer, and cite the source topic in plain language. Responses must never claim certainty they do not have, must never fabricate policy details not present in the knowledge base, and must clearly say when a case has been passed to a human agent and why.",
    metadata: {
      topics: ["operational_policy"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["tone", "response", "empathy", "grounded", "cite", "concise", "fabricate", "uncertain"],
    },
  },
  {
    id: "human-in-the-loop-policy",
    title: "Human-in-the-Loop Policy",
    category: "Customer Support Copilot",
    updated: "2026-07-01",
    content: "Human agents remain responsible for complex, sensitive, exceptional, disputed, or high-risk cases. Escalated cases in this prototype are represented only as a decision and a reason returned by the API; there is no real ticketing queue, and no case is actually routed to a human. A production deployment would connect escalation to a real queue and require an audit trail of every automated decision.",
    metadata: {
      topics: ["operational_policy", "limitations"],
      capabilityStatus: "MIXED",
      keywords: ["human", "escalation", "agent", "handoff", "complex", "sensitive", "responsible", "queue", "audit"],
    },
  },

  // --- Customer Support FAQ documents ---
  {
    id: "onboarding-faq",
    title: "Account and Onboarding FAQ",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "New customers can create an account with an email address and a password, then verify the email address to activate the account. A short setup checklist covers connecting a payment method and choosing a starter plan. Account creation and login are fictional sample flows in this prototype and do not connect to any real identity provider.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["account", "accounts", "create", "signup", "setup", "verify", "email", "activate", "started", "register"],
    },
  },
  {
    id: "product-usage-guidance",
    title: "Product Usage Guidance",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "The product dashboard has three main areas: a home overview, a reports section, and account settings. Common usage questions include how to invite a teammate, how to export a report, and how to change the display language. These are fictional sample product features used only to demonstrate grounded question answering.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["dashboard", "reports", "settings", "invite", "export", "language", "features", "usage", "overview"],
    },
  },
  {
    id: "request-status-guidance",
    title: "Request Status Guidance",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "Customers can check the status of a support request or order in the fictional 'My Requests' page, which shows one of: Received, In Progress, Waiting on Customer, or Resolved. Status lookups in this prototype are illustrative text only; there is no real order or ticketing system connected.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["status", "request", "ticket", "order", "received", "resolved", "progress", "track", "where"],
    },
  },
  {
    id: "billing-payment-faq",
    title: "Billing and Payment FAQ",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "Invoices are issued monthly on the customer's billing date. Accepted payment methods in this fictional product are credit card and bank transfer. A failed payment triggers one automatic retry after three days before the account is placed on hold. Customers disputing a charge or reporting an unauthorized charge must be escalated to a human agent rather than handled automatically.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["billing", "invoice", "payment", "credit", "bank", "transfer", "retry", "hold", "charge", "monthly"],
    },
  },
  {
    id: "refund-cancellation-policy",
    title: "Refund and Cancellation Policy",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "Subscriptions can be cancelled at any time and remain active until the end of the current billing period. Refunds for the current billing period are available within 14 days of the charge for standard cancellations. Refund requests involving a dispute, a claim of unauthorized charge, or a request for an exception outside this policy must be escalated to a human agent, not auto-approved.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["refund", "cancel", "cancellation", "subscription", "billing", "period", "days", "policy"],
    },
  },
  {
    id: "troubleshooting-guide",
    title: "Troubleshooting Guide",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "If the product will not load, customers should clear the browser cache and confirm they are using a supported browser. If login fails repeatedly, customers should confirm the email address and use the password reset link. If an error code appears, the fictional support article maps common error codes to a one-line explanation and a suggested next step. Issues that persist after these steps, or that suggest a security problem, should be escalated.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["troubleshoot", "error", "load", "loading", "cache", "browser", "login", "reset", "fix", "issue"],
    },
  },
  {
    id: "identity-document-requirements",
    title: "Identity and Document Requirements",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "Some account changes, such as recovering an account with no working email access, require identity verification with a government-issued ID or passport. Any request involving identity documents, personal identification numbers, or proof-of-identity uploads must be escalated to a human agent for careful handling; this prototype does not automatically process real identity documents.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["identity", "document", "documents", "passport", "verify", "verification", "government", "id", "proof"],
    },
  },
  {
    id: "privacy-security-guidance",
    title: "Privacy and Security Guidance",
    category: "Customer Support FAQ",
    updated: "2026-07-01",
    content: "Customers can request a copy or deletion of their personal data through the fictional privacy request form. Any report of a suspected data breach, account compromise, or unauthorized access must be escalated immediately to a human agent and is never handled by automated response in this design.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["privacy", "data", "personal", "deletion", "request", "breach", "security", "compromise", "access"],
    },
  },
];

// ---------------------------------------------------------------------------
// Hybrid scoring helpers
// ---------------------------------------------------------------------------

/**
 * Compute lexical overlap between query tokens and document editorial keywords.
 * Score = unique matched tokens / total query tokens (capped at 1).
 * Returns matched keyword strings for trace reporting.
 */
function computeLexicalScore(
  queryTokens: Set<string>,
  keywords: string[],
): { score: number; matchedKeywords: string[] } {
  if (queryTokens.size === 0 || keywords.length === 0) {
    return { score: 0, matchedKeywords: [] };
  }
  const matchedKeywords: string[] = [];
  const matchedTokens = new Set<string>();
  for (const kw of keywords) {
    const kwTokens = tokenize(kw);
    const kwMatched = kwTokens.filter((t) => queryTokens.has(t));
    if (kwMatched.length > 0) {
      matchedKeywords.push(kw);
      kwMatched.forEach((t) => matchedTokens.add(t));
    }
  }
  return {
    score: Math.min(1, matchedTokens.size / queryTokens.size),
    matchedKeywords,
  };
}

/**
 * Binary topic boost: 1.0 if the document's topics overlap with the query's
 * topics, else 0. Returns matched topics for trace reporting.
 * Returns 0 when queryTopics = ["unknown"].
 */
function computeTopicScore(
  queryTopics: QueryTopic[],
  docTopics: QueryTopic[],
): { score: number; matchedTopics: QueryTopic[] } {
  if (queryTopics.includes("unknown") || docTopics.length === 0) {
    return { score: 0, matchedTopics: [] };
  }
  const matched = queryTopics.filter((t) => docTopics.includes(t));
  return { score: matched.length > 0 ? 1 : 0, matchedTopics: matched };
}

/** Apply the weighted hybrid formula. */
function hybridScore(vector: number, lexical: number, topic: number): number {
  return HYBRID_WEIGHTS.vector * vector + HYBRID_WEIGHTS.lexical * lexical + HYBRID_WEIGHTS.topic * topic;
}

// ---------------------------------------------------------------------------
// Retrieval result type
// ---------------------------------------------------------------------------

export type KnowledgeResult = {
  document: KnowledgeDocument;
  chunk: string;
  chunkIndex: number;
  /** hybridScore — primary ranking signal; backward-compatible with prior score field */
  score: number;
  /** Full score breakdown for technical/evaluation traces */
  scoreComponents: ScoreComponents;
};

// ---------------------------------------------------------------------------
// Local-vector (deterministic) search
// ---------------------------------------------------------------------------

/**
 * Hybrid local-vector retrieval.
 *
 * Pipeline per chunk:
 *   1. Pre-filter: vectorScore >= VECTOR_PREFILTER.local (skip truly irrelevant docs)
 *   2. Lexical score: token overlap between query and editorial keywords
 *   3. Topic score: binary boost when doc topics ∩ query topics ≠ ∅
 *   4. Hybrid score: weighted sum (HYBRID_WEIGHTS)
 *   5. Rank by hybridScore descending; return top `limit`
 *
 * The final relevance threshold (RETRIEVAL_RELEVANCE_THRESHOLD in agent.ts)
 * is applied by the calling agent, not here — this function returns the
 * best-ranked results regardless of threshold so that evaluation functions
 * can inspect the raw ranking.
 *
 * Signature is backward-compatible: callers that only access .document.id,
 * .chunk, and .score are unaffected; scoreComponents is a new addition.
 */
export function searchKnowledge(query: string, limit = 3): KnowledgeResult[] {
  const queryVector = embedText(query);
  const queryTokens = new Set(tokenize(query));
  const queryTopics = classifyQueryTopics(query);

  return knowledgeDocuments
    .flatMap((document) =>
      chunkText(document.content).map((chunk, chunkIndex) => {
        const vectorScore = cosineSimilarity(
          queryVector,
          embedText(`${document.title} ${document.category} ${chunk}`),
        );
        // Pre-filter: skip chunks with no content relevance before boosting
        if (vectorScore < VECTOR_PREFILTER.local) return null;

        const { score: lexicalScore, matchedKeywords } = computeLexicalScore(
          queryTokens,
          document.metadata?.keywords ?? [],
        );
        const { score: topicScore, matchedTopics } = computeTopicScore(
          queryTopics,
          document.metadata?.topics ?? [],
        );
        const hybrid = hybridScore(vectorScore, lexicalScore, topicScore);

        return {
          document,
          chunk,
          chunkIndex,
          score: hybrid,
          scoreComponents: {
            vectorScore: Number(vectorScore.toFixed(3)),
            lexicalScore: Number(lexicalScore.toFixed(3)),
            topicScore,
            hybridScore: Number(hybrid.toFixed(3)),
            matchedTopics,
            matchedKeywords,
          },
        } satisfies KnowledgeResult;
      }),
    )
    .filter((r): r is KnowledgeResult => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Semantic (OpenAI-embeddings) search — same hybrid policy, different vector source
// ---------------------------------------------------------------------------

const semanticChunks = knowledgeDocuments.flatMap((document) =>
  chunkText(document.content).map((chunk, chunkIndex) => ({ document, chunk, chunkIndex })),
);
let documentEmbeddings: Promise<Awaited<ReturnType<typeof createOpenAIEmbeddings>>> | null = null;

export async function searchKnowledgeSemantic(query: string, limit = 3) {
  return (await searchKnowledgeSemanticBatch([query], limit))[0];
}

export type SemanticRetrievalUsage = { promptTokens: number; totalTokens: number } | null;

export async function searchKnowledgeSemanticBatch(queries: string[], limit = 3) {
  if (!isOpenAIConfigured()) {
    return queries.map((query) => ({
      results: searchKnowledge(query, limit),
      mode: "local-vector" as const,
      model: "feature-hashing-256",
      usage: null as SemanticRetrievalUsage,
    }));
  }
  try {
    documentEmbeddings ??= createOpenAIEmbeddings(
      semanticChunks.map(({ document, chunk }) => `${document.title}\n${document.category}\n${chunk}`),
    );
    const [documents, queryEmbeddings] = await Promise.all([
      documentEmbeddings,
      createOpenAIEmbeddings(queries),
    ]);
    const usage: SemanticRetrievalUsage = queryEmbeddings.usage
      ? { promptTokens: queryEmbeddings.usage.prompt_tokens, totalTokens: queryEmbeddings.usage.total_tokens }
      : null;

    return queryEmbeddings.vectors.map((queryVector, queryIndex) => {
      const query = queries[queryIndex];
      const queryTokens = new Set(tokenize(query));
      const queryTopics = classifyQueryTopics(query);

      const results: KnowledgeResult[] = semanticChunks
        .map((item, index) => {
          const vectorScore = cosineSimilarity(queryVector, documents.vectors[index]);
          if (vectorScore < VECTOR_PREFILTER.live) return null;

          const { score: lexicalScore, matchedKeywords } = computeLexicalScore(
            queryTokens,
            item.document.metadata?.keywords ?? [],
          );
          const { score: topicScore, matchedTopics } = computeTopicScore(
            queryTopics,
            item.document.metadata?.topics ?? [],
          );
          const hybrid = hybridScore(vectorScore, lexicalScore, topicScore);

          return {
            document: item.document,
            chunk: item.chunk,
            chunkIndex: item.chunkIndex,
            score: hybrid,
            scoreComponents: {
              vectorScore: Number(vectorScore.toFixed(3)),
              lexicalScore: Number(lexicalScore.toFixed(3)),
              topicScore,
              hybridScore: Number(hybrid.toFixed(3)),
              matchedTopics,
              matchedKeywords,
            },
          } satisfies KnowledgeResult;
        })
        .filter((r): r is KnowledgeResult => r !== null)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);

      return { results, mode: "openai-embeddings" as const, model: queryEmbeddings.model, usage };
    });
  } catch (error) {
    console.error("Semantic retrieval failed; using local vector fallback", error instanceof Error ? error.message : "Unknown error");
    documentEmbeddings = null;
    return queries.map((query) => ({
      results: searchKnowledge(query, limit),
      mode: "local-vector-fallback" as const,
      model: "feature-hashing-256",
      usage: null as SemanticRetrievalUsage,
    }));
  }
}
