/**
 * Challenge evaluation dataset — 20 cases across 5 groups.
 *
 * Completely separate from the development dataset in support-evaluation.ts
 * (35 cases). Results are reported separately and never merged.
 *
 * Groups:
 *   A — portfolio_paraphrase : unseen paraphrases of portfolio-intent queries
 *   B — short_ambiguous      : short or inherently ambiguous queries
 *   C — off_topic            : off-topic queries that share support vocabulary
 *   D — negation             : queries using negation or constraint phrasing
 *   E — escalation_guard     : mandatory-risk escalation regression guards
 *
 * Design rule: no challenge case was used to design the patterns or weights
 * in query-topics.ts or knowledge.ts. These are acceptance tests only.
 *
 * Acceptance targets (local/deterministic mode, honestly stated):
 *   Group A: ≥4/6 AUTO_RESPOND (6 is the target; 4 is the honest minimum)
 *   Group B: ≥2/4 correct     (short queries are a known limit of local embeddings)
 *   Group C: 4/4 ESCALATE     (off-topic must never auto-respond)
 *   Group D: ≥2/3 AUTO_RESPOND
 *   Group E: 3/3 correct      (mandatory escalation must never regress)
 */

import { runSupportAgent, type SupportDecision } from "./support-agent";
import { supportCases } from "./support-evaluation";

export type ChallengeGroup =
  | "portfolio_paraphrase"
  | "short_ambiguous"
  | "off_topic"
  | "negation"
  | "escalation_guard";

export type ChallengeCase = {
  message: string;
  expectedDecision: SupportDecision;
  /** Primary expected source document id, or null for cases that should escalate */
  expectedDocId: string | null;
  group: ChallengeGroup;
  /** Honest notes about anticipated difficulty or failure mode */
  notes?: string;
};

export const challengeCases: ChallengeCase[] = [
  // ── Group A: portfolio paraphrases (6) ──────────────────────────────────
  // These are the five priority queries + one additional paraphrase.
  // None of these exact phrasings appear in the development dataset.
  {
    message: "What business problem does it solve?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-pain-points",
    group: "portfolio_paraphrase",
  },
  {
    message: "Under what conditions could it target up to 80–90% automation?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "automation-coverage-conditions",
    group: "portfolio_paraphrase",
  },
  {
    message: "What is implemented now?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-copilot-capabilities",
    group: "portfolio_paraphrase",
  },
  {
    message: "What is roadmap only?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "integration-roadmap",
    group: "portfolio_paraphrase",
  },
  {
    message: "How could this become an enterprise support platform?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "enterprise-roadmap",
    group: "portfolio_paraphrase",
  },
  {
    message: "What is the motivation for building this tool?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "product-vision",
    group: "portfolio_paraphrase",
    notes: "Paraphrase of product-vision query using 'motivation' and 'building'",
  },

  // ── Group B: short / ambiguous queries (4) ───────────────────────────────
  {
    message: "What's missing?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-copilot-limitations",
    group: "short_ambiguous",
    notes: "Only 2 content tokens; may fail in local mode — limitation to report honestly",
  },
  {
    message: "Does it work?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-copilot-capabilities",
    group: "short_ambiguous",
    notes: "2 content tokens, very low vector signal; may fail in local mode",
  },
  {
    message: "Is it ready?",
    expectedDecision: "ESCALATE",
    expectedDocId: null,
    group: "short_ambiguous",
    notes: "Genuinely ambiguous — 'ready' for what? Insufficient evidence to auto-respond safely",
  },
  {
    message: "Tell me about the gaps.",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-copilot-limitations",
    group: "short_ambiguous",
    notes: "'gaps' is in limitations keywords; topic should also fire",
  },

  // ── Group C: off-topic with support vocabulary (4) ───────────────────────
  // Must escalate — topic/lexical boost must not surface a wrong document.
  {
    message: "Can I use this for HR case management?",
    expectedDecision: "ESCALATE",
    expectedDocId: null,
    group: "off_topic",
    notes: "Shares 'case', 'support', 'human' tokens but is genuinely off-KB",
  },
  {
    message: "Do you support HIPAA compliance?",
    expectedDecision: "ESCALATE",
    expectedDocId: null,
    group: "off_topic",
    notes: "'support' is a shared token but HIPAA is not in the KB",
  },
  {
    message: "What is the agent commission rate?",
    expectedDecision: "ESCALATE",
    expectedDocId: null,
    group: "off_topic",
    notes: "'agent' is a shared token; commission is off-topic",
  },
  {
    message: "How many support tickets does your team handle per day?",
    expectedDecision: "ESCALATE",
    expectedDocId: null,
    group: "off_topic",
    notes: "Dense support vocabulary but asking about team capacity — not in KB",
  },

  // ── Group D: negation / constraint phrasing (3) ──────────────────────────
  {
    message: "What won't the system automate?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-copilot-limitations",
    group: "negation",
    notes: "Negation form of capabilities; limitations topic should fire",
  },
  {
    message: "What types of questions does this not answer?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-copilot-limitations",
    group: "negation",
    notes: "Surface negation; limitations topic fires on 'not'",
  },
  {
    message: "What can't it handle today?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "support-copilot-limitations",
    group: "negation",
    notes: "Contraction + negation; limitations pattern should catch 'can't'",
  },

  // ── Group E: mandatory escalation regression guards (3) ──────────────────
  // These must escalate regardless of any retrieval improvement.
  {
    message: "I think there was a security breach on my account.",
    expectedDecision: "ESCALATE",
    expectedDocId: null,
    group: "escalation_guard",
    notes: "Security breach mandatory trigger: 'security breach' fires the mandatory rule",
  },
  {
    message: "I am filing a dispute on this charge.",
    expectedDecision: "ESCALATE",
    expectedDocId: null,
    group: "escalation_guard",
    notes: "Financial dispute mandatory trigger: 'dispute' fires the mandatory rule",
  },
  {
    message: "What is the knowledge base made of?",
    expectedDecision: "AUTO_RESPOND",
    expectedDocId: "kb-quality-requirements",
    group: "escalation_guard",
    notes: "No mandatory trigger; knowledge-base quality doc should be retrievable",
  },
];

// ---------------------------------------------------------------------------
// Evaluation helpers
// ---------------------------------------------------------------------------

/** Verify no challenge case duplicates a development dataset message */
export function validateNoDuplicates(): { valid: boolean; duplicates: string[] } {
  const devMessages = new Set(supportCases.map((c) => c.message));
  const duplicates = challengeCases
    .filter((c) => devMessages.has(c.message))
    .map((c) => c.message);
  return { valid: duplicates.length === 0, duplicates };
}

export type ChallengeResult = {
  message: string;
  group: ChallengeGroup;
  expectedDecision: SupportDecision;
  actualDecision: SupportDecision;
  expectedDocId: string | null;
  actualDocId: string | null;
  decisionPassed: boolean;
  retrievalPassed: boolean | null; // null when expectedDocId is null
  notes?: string;
};

export async function runChallengeSuite(): Promise<{
  note: string;
  datasetSize: number;
  results: ChallengeResult[];
  byGroup: Record<ChallengeGroup, { total: number; decisionPassed: number; retrievalPassed: number }>;
  overallDecisionAccuracy: number;
}> {
  const results: ChallengeResult[] = [];

  for (const c of challengeCases) {
    const { trace } = await runSupportAgent(c.message);
    const actualDocId = trace.sources[0]?.id ?? null;
    const decisionPassed = trace.decision === c.expectedDecision;
    const retrievalPassed = c.expectedDocId !== null
      ? actualDocId === c.expectedDocId
      : null;
    results.push({
      message: c.message,
      group: c.group,
      expectedDecision: c.expectedDecision,
      actualDecision: trace.decision,
      expectedDocId: c.expectedDocId,
      actualDocId,
      decisionPassed,
      retrievalPassed,
      notes: c.notes,
    });
  }

  const groups: ChallengeGroup[] = [
    "portfolio_paraphrase", "short_ambiguous", "off_topic", "negation", "escalation_guard",
  ];
  const byGroup = Object.fromEntries(
    groups.map((g) => {
      const gResults = results.filter((r) => r.group === g);
      return [g, {
        total: gResults.length,
        decisionPassed: gResults.filter((r) => r.decisionPassed).length,
        retrievalPassed: gResults.filter((r) => r.retrievalPassed === true).length,
      }];
    }),
  ) as Record<ChallengeGroup, { total: number; decisionPassed: number; retrievalPassed: number }>;

  const overallDecisionAccuracy = results.filter((r) => r.decisionPassed).length / results.length;

  return {
    note: "Challenge dataset (20 cases, 5 groups). Results are reported separately from the development dataset (35 cases) and must not be merged into a single accuracy figure. These are acceptance tests for the hybrid retrieval milestone; cases were written after patterns and weights were finalized.",
    datasetSize: challengeCases.length,
    results,
    byGroup,
    overallDecisionAccuracy,
  };
}
