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
    content: "This fictional Customer Support Copilot was built because support teams spend much of their time answering repetitive, low-risk questions instead of handling complex cases that require judgment. The goal is to resolve routine, well-documented inquiries automatically so customer-support specialists can focus on complex, sensitive, or high-risk cases. It is designed to target up to 80-90% automation of repetitive, low-risk customer inquiries when supported by a sufficiently comprehensive, validated, and continuously maintained knowledge base. This is a controlled-pilot target, not a guaranteed production result, and it is not designed to replace customer support as a whole.",
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
    content: "Common fictional support pain points include long waits for simple questions, inconsistent answers, repeated questions that already have documented answers, time spent searching multiple systems, and complex cases getting stuck behind routine inquiries. Automating the routine share is intended to reduce wait times and let customer-support specialists spend more time on cases that genuinely need judgment.",
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
    content: "The support flow is: classify intent, classify risk, retrieve knowledge, optionally run a workflow tool, verify the evidence, apply deterministic policy rules, and return AUTO_RESPOND or ESCALATE. AUTO_RESPOND replies pass through a locale-aware response composer. ESCALATE creates a simulated, idempotent support case with a demo reference ID through a shared handoff service. No real employee or external CRM receives the case. Intent, risk, and escalation rules remain deterministic and testable, while retrieval can use live embeddings or the local fallback. Safe technical details are returned in a redacted execution trace.",
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
    content: "IMPLEMENTED in this repository: deterministic intent and risk classification, mandatory-escalation rules, hybrid knowledge retrieval with citations, a groundedness verifier, AUTO_RESPOND or ESCALATE decisions, multilingual response composition, a protected simulated-handoff API, structured handoff results, idempotency, and redacted execution traces. SIMULATED / MOCKED: workflow status lookups and the in-memory customer-support queue; the demo creates a simulated case and reference ID but does not notify a real employee or external system. ROADMAP: CRM and ticketing integration, messaging-channel connectors, a persisted vector database, model-based groundedness, and a production human-review queue.",
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
    content: "A fictional controlled pilot would start with a narrow set of intents that have the most complete documentation, run in shadow mode alongside the customer-support team to compare answers before enabling auto-response, and expand coverage only after the knowledge base and evaluation results support it. Escalation thresholds would start conservative and be adjusted gradually as real-world precision and recall are measured, not assumed.",
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
    content: "A complaint that is highly negative, references legal action, or threatens public escalation must not receive an automatic resolution, even if the underlying question is simple. In this demo, the system creates a simulated support case and reference ID for further review. A production integration would route the case to an authorized customer-support team.",
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
    content: "Customer-facing responses should be concise, empathetic, and specific: acknowledge the question, answer from retrieved evidence, and explain the next step in plain language. Responses must not expose internal labels or document IDs, fabricate policy details, promise a callback, or claim that a real employee received a case. When the demo creates a simulated case, the reply must identify it as a demo case and provide only the simulated reference ID.",
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
    content: "People remain responsible for complex, sensitive, exceptional, disputed, or high-risk cases. For demonstration purposes, an ESCALATE decision creates an idempotent simulated case in an in-memory queue and returns a structured demo reference. It does not notify a real employee or external ticketing platform. A production deployment would replace the simulated adapter with an authenticated CRM or helpdesk integration and an immutable audit trail.",
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
    content: "Invoices are issued monthly on the customer's billing date. Accepted payment methods in this fictional product are credit card and bank transfer. A failed payment triggers one automatic retry after three days before the account is placed on hold. A disputed or unauthorized charge must not be resolved automatically; the demo creates a simulated case for further review.",
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
    content: "Subscriptions can be cancelled at any time and remain active until the end of the current billing period. Refunds for the current billing period are available within 14 days of the charge for standard cancellations. A dispute, unauthorized charge, or exception request must not be auto-approved; the demo creates a simulated case for additional review.",
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
    content: "Some account changes, such as recovering an account with no working email access, require identity verification with a government-issued ID or passport. Requests involving identity documents or personal identification numbers must not be processed automatically. This prototype creates only a simulated review case and never accepts real identity documents.",
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
    content: "Customers can request a copy or deletion of their personal data through the fictional privacy request form. A suspected data breach, account compromise, or unauthorized access must not receive an automated resolution. This demo creates a simulated security-review case; a production system would route it to an authorized security team.",
    metadata: {
      topics: ["customer_support_faq"],
      capabilityStatus: "IMPLEMENTED",
      keywords: ["privacy", "data", "personal", "deletion", "request", "breach", "security", "compromise", "access"],
    },
  },
  {
    id: "gaming-promotion-overview",
    title: "Available Promotion Details — 10 Demo Offers (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "Ten fictional offers are available in this demo knowledge base: Welcome Deposit 50%, New Member Sports Bonus, Daily Slot Reload, Weekly Slot Free Spins, Weekly Slot Cashback, Live Casino Rebate, Sports Accumulator Boost, Weekend Casino Reload, Verified Referral Reward, and Loyalty Points Exchange. The assistant should explain the relevant offer details and conditions, not recommend higher spending. Every offer has its own eligibility, minimum deposit or qualifying activity, maximum reward, eligible products, validity period, and turnover requirement. Only one deposit promotion can be active at a time unless the promotion details explicitly allow otherwise. Promotional credit is not withdrawable as cash until its stated conditions are complete. No offer guarantees a profit or winning outcome, and customers should never deposit or continue playing to recover losses.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["promotion", "bonus", "welcome", "cashback", "referral", "free", "spin", "offer", "turnover", "wagering", "eligible", "validity"],
    },
  },
  {
    id: "promo-welcome-deposit-50",
    title: "Welcome Deposit 50% (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A newly verified customer may choose a fictional 50% bonus on the first eligible deposit, up to 1,000 demo credits. The example minimum deposit is 100 credits. Eligible slot and selected live-casino bets contribute according to the promotion details; excluded games contribute zero. The example turnover is 8x the deposit plus bonus and must be completed within 7 days. The offer is limited to one customer, account, device, and payment source, cannot be combined with another deposit promotion, and does not guarantee a return.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["welcome", "new member", "first deposit", "50 percent", "1000", "slot", "live casino", "turnover", "7 days"] },
  },
  {
    id: "promo-new-member-sports",
    title: "New Member Sports Bonus (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A newly verified customer may choose a fictional sports bonus equal to 100% of the first eligible sports-wallet deposit, up to 1,500 demo credits. The example minimum deposit is 200 credits. The bonus is limited to pre-match and live sports selections with decimal odds of at least 1.70; void, cashed-out, or opposing bets do not qualify. The example turnover is 5x the bonus within 10 days. This offer cannot be combined with the Welcome Deposit 50% offer and does not guarantee a winning bet.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["sports", "sport", "new member", "first deposit", "100 percent", "odds", "1.70", "turnover", "10 days"] },
  },
  {
    id: "promo-daily-slot-reload",
    title: "Daily Slot Reload 10% (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A verified customer may receive a fictional 10% bonus on the first eligible slot-wallet deposit of the day, up to 500 demo credits. The example minimum deposit is 100 credits and the example turnover is 5x the bonus within 24 hours. Only listed slot games contribute; table games, live casino, sports, and opposite-side bets are excluded. The offer is available once per calendar day and cannot be stacked with another active deposit promotion.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["daily", "slot", "reload", "deposit", "10 percent", "500", "24 hours", "turnover"] },
  },
  {
    id: "promo-weekly-slot-free-spins",
    title: "Weekly Slot Free Spins (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A verified customer who completes the fictional weekly qualifying activity may receive 20 free spins on one listed demo slot. Free spins expire 48 hours after issue. Winnings from the spins are credited as promotional balance and carry an example 3x winnings turnover before withdrawal. The spins cannot be exchanged for cash, moved to another game, or restored after expiry. Availability and the qualifying game must be checked in the current promotion details.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["weekly", "slot", "free spins", "20 spins", "48 hours", "promotional balance", "3x"] },
  },
  {
    id: "promo-weekly-slot-cashback",
    title: "Weekly Slot Cashback 5% (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A verified customer may receive fictional cashback equal to 5% of eligible weekly net slot losses, up to 1,000 demo credits. Net loss is calculated from settled eligible slot bets minus settled winnings and previously credited rewards during the stated weekly period. Void bets, excluded games, and promotional-credit bets do not count. The cashback carries an example 1x turnover and must be claimed within 3 days. Cashback is a limited rebate, not a guarantee of recovering losses, and should never be used as a reason to continue playing.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["weekly", "slot", "cashback", "net loss", "5 percent", "1000", "1x", "3 days"] },
  },
  {
    id: "promo-live-casino-rebate",
    title: "Live Casino Rebate 3% (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A verified customer may receive a fictional 3% rebate on eligible weekly net losses from selected live-casino tables, up to 1,500 demo credits. Tie bets, opposite-side bets, void rounds, bonus-funded bets, and excluded tables do not qualify. The example turnover is 1x the rebate within 3 days. The rebate is calculated only after all included rounds settle and cannot be combined with another loss-rebate offer. It is not a promise to recover losses.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["live casino", "casino", "rebate", "cashback", "net loss", "3 percent", "1500", "table"] },
  },
  {
    id: "promo-sports-accumulator-boost",
    title: "Sports Accumulator Boost (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A fictional bonus may add 10% to net winnings from an eligible settled sports accumulator, up to 500 demo credits. The example accumulator requires at least 5 selections, each with decimal odds of at least 1.50. All selections must win; void legs, cashed-out bets, system bets, and opposite outcomes are excluded. The boost applies to the calculated net winnings, not the stake, and does not change the underlying odds or guarantee that the accumulator will win.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["sports", "accumulator", "parlay", "boost", "5 selections", "odds", "10 percent", "500"] },
  },
  {
    id: "promo-weekend-casino-reload",
    title: "Weekend Casino Reload 15% (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A verified customer may choose a fictional 15% weekend reload bonus on one eligible casino-wallet deposit, up to 800 demo credits. The example minimum deposit is 200 credits and the example turnover is 8x the deposit plus bonus within 3 days. Selected slots and live-casino tables contribute at different rates shown in the promotion details. The offer is available once during the stated weekend window and cannot be combined with another deposit bonus.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["weekend", "casino", "reload", "15 percent", "800", "deposit", "turnover", "3 days"] },
  },
  {
    id: "promo-verified-referral",
    title: "Verified Referral Reward (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A verified customer may receive a fictional 200-credit referral reward after the referred customer completes account verification, makes an eligible deposit from their own payment source, and completes the stated qualifying activity. Self-referrals, duplicate accounts, shared devices, shared payment details, or misleading invitations are not eligible. The reward is fixed, is not based on the referred customer's losses, and does not guarantee a return. The example reward carries a 3x turnover and cannot be combined with another referral claim for the same person.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["referral", "refer friend", "invite", "verified", "200", "reward", "3x", "duplicate"] },
  },
  {
    id: "promo-loyalty-points-exchange",
    title: "Loyalty Points Exchange (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "Eligible settled activity in selected slots, live casino, and sports may earn fictional loyalty points at rates published in the current promotion details. Points may be exchanged for listed demo rewards after the minimum redemption threshold is met. Void, refunded, promotional-credit, and suspicious or opposite-side activity does not earn points. Points have no cash value before redemption, may expire after 90 days of inactivity, and should not be presented as a reason to increase spending or continue playing.",
    metadata: { topics: ["customer_support_faq", "operational_policy"], capabilityStatus: "SIMULATED", keywords: ["loyalty", "points", "exchange", "redeem", "slot", "live casino", "sports", "90 days"] },
  },
  {
    id: "gaming-welcome-bonus-policy",
    title: "Welcome Bonus and Turnover Policy (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "The fictional welcome offer is available once to a newly verified account. Example offer bands range from 20% to 100% of an eligible first deposit, with a fictional maximum bonus shown in the promotion details. The turnover requirement may range from 3x to 20x of the deposit plus bonus, depending on the selected offer and game category. Some games may contribute partially or not at all. The offer expires if the required turnover is not completed during its validity period. Duplicate accounts, shared payment details, or attempts to claim the same welcome offer more than once require manual review.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["welcome", "first", "deposit", "bonus", "percent", "maximum", "turnover", "wagering", "game", "expiry", "duplicate", "verified"],
    },
  },
  {
    id: "gaming-daily-cashback-policy",
    title: "Daily Bonus, Cashback, and Referral Policy (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A fictional daily deposit offer may add 10% to 20% to the first eligible deposit of the day, subject to a maximum bonus and turnover requirement. Weekly cashback may return a small percentage of eligible net losses and normally has a lower turnover requirement than a deposit bonus. Referral and free-spin rewards are credited only after their stated verification conditions are met. Promotions cannot be stacked unless the promotion details explicitly say otherwise, and settled or expired offers cannot be applied retroactively.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["daily", "deposit", "cashback", "loss", "referral", "free", "spin", "stack", "retroactive", "turnover", "reward"],
    },
  },
  {
    id: "gaming-deposit-pending-guide",
    title: "Deposit Pending or Credit Not Received (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "A bank transfer can appear as pending while the payment gateway verifies the transaction. Customers should first confirm the transfer status in their banking app and wait up to 5 minutes before retrying. Do not make a duplicate deposit for the same intended amount. If credit is still missing, collect only the deposit amount, transaction time, payment channel, and a masked transaction reference. Never request a password, PIN, OTP, full bank-account number, or unredacted financial document. A missing deposit creates a simulated high-priority review case in this demo.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["deposit", "pending", "credit", "missing", "not", "received", "bank", "transfer", "gateway", "transaction", "duplicate", "reference"],
    },
  },
  {
    id: "gaming-withdrawal-processing-guide",
    title: "Withdrawal Pending or Delayed (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "Withdrawal statuses are Received, Under Review, Approved, Sent to Bank, and Completed. A normal fictional target is several minutes after approval, but bank maintenance, identity review, promotion turnover, mismatched account details, or risk checks can extend processing. Support must not promise an exact completion time. For a delayed withdrawal, confirm the current status, requested amount, request time, whether identity verification is complete, and whether an active promotion still has unmet turnover. Do not ask the customer to submit the same withdrawal repeatedly.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["withdrawal", "pending", "delayed", "slow", "review", "approved", "bank", "maintenance", "identity", "turnover", "status", "processing"],
    },
  },
  {
    id: "gaming-withdrawal-missing-guide",
    title: "Withdrawal Completed but Funds Not Received (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "If a withdrawal is marked Completed but the destination account has not received the funds, do not tell the customer to create another withdrawal. Confirm the masked destination account, amount, completion timestamp, and demo withdrawal reference. Allow for the fictional bank-settlement window shown in the status panel. If the settlement window has passed, create a high-priority simulated review case. Support must not claim the funds are lost, guarantee a payment time, or request passwords, OTPs, or full banking credentials.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["withdrawal", "completed", "money", "funds", "not", "received", "missing", "destination", "settlement", "reference", "bank"],
    },
  },
  {
    id: "gaming-game-issue-guide",
    title: "Game and Round Issue Support (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "For a game that will not open, freezes, disconnects, or shows an unexpected balance, first ask the customer to refresh once, confirm network stability, and check the service-status notice. If the problem concerns a settled game round, collect the fictional provider name, game title, round ID, approximate time, displayed balance, and a screenshot with personal data masked. Never change a game result manually or promise compensation before the provider review is complete. The assistant provides troubleshooting and case intake only; it does not recommend betting strategies or claim that any game can guarantee profit.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["game", "round", "provider", "freeze", "stuck", "disconnect", "balance", "result", "screenshot", "troubleshoot", "compensation"],
    },
  },
  {
    id: "gaming-responsible-use-guidance",
    title: "Responsible Use and Support Boundary (Fictional)",
    category: "Online Gaming Support",
    updated: "2026-07-13",
    content: "The assistant explains account, payment, promotion, and technical-support procedures. It must not promise winnings, recommend a betting strategy, encourage a customer to recover losses by spending more, or describe promotional credit as guaranteed income. Requests involving self-exclusion, spending limits, or loss-of-control concerns should receive a supportive response and be directed to the platform's responsible-use controls in a production implementation.",
    metadata: {
      topics: ["customer_support_faq", "operational_policy"],
      capabilityStatus: "SIMULATED",
      keywords: ["responsible", "limit", "self", "exclusion", "loss", "control", "strategy", "winning", "profit", "support"],
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

function promotionCatalogBoost(query: string, documentId: string): number {
  if (documentId !== "gaming-promotion-overview") return 0;
  const asksForPromotions = /promotion|promotions|bonus|bonuses|offer|offers|โปรโมชั่น|โปรโมชัน|โบนัส|优惠|促销/i.test(query);
  const asksForCatalog = /what|which|available|current|list|มีอะไร|อะไรบ้าง|แนะนำ|有哪些|目前/i.test(query);
  return asksForPromotions && asksForCatalog ? 0.3 : 0;
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
        const hybrid = Math.min(1, hybridScore(vectorScore, lexicalScore, topicScore) + promotionCatalogBoost(query, document.id));

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
          const hybrid = Math.min(1, hybridScore(vectorScore, lexicalScore, topicScore) + promotionCatalogBoost(query, item.document.id));

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
