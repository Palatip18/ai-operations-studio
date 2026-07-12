import { tokenize } from "./retrieval";

export type VerifierResult = {
  /** False when the answer is procedural (workflow/metrics) and has no retrieved-evidence claim to check. */
  applicable: boolean;
  grounded: boolean;
  groundednessScore: number;
  supportingSourceIds: string[];
  warning: string | null;
};

export type EvidenceItem = { id: string; text: string };

const GROUNDED_SCORE_THRESHOLD = 0.35;
const SUPPORTING_SOURCE_THRESHOLD = 0.15;

/**
 * Lexical-overlap groundedness heuristic: what fraction of the answer's
 * content words also appear in the retrieved evidence. This is a cheap,
 * dependency-free proxy for "is this answer supported by what was
 * retrieved" — it is NOT an entailment model and does not guarantee
 * factual correctness. It can be fooled by paraphrase (missed support) or
 * by keyword overlap without real entailment (false support), and it
 * should be read as a low-confidence, explainable signal, not a proof.
 */
export function verifyGroundedness(answer: string, evidence: EvidenceItem[]): VerifierResult {
  const answerTokens = new Set(tokenize(answer));
  if (answerTokens.size === 0 || evidence.length === 0) {
    return {
      applicable: true,
      grounded: false,
      groundednessScore: 0,
      supportingSourceIds: [],
      warning: "No retrieved evidence was available to support this answer.",
    };
  }

  const perSource = evidence.map((item) => {
    const sourceTokens = new Set(tokenize(item.text));
    const overlap = [...answerTokens].filter((token) => sourceTokens.has(token)).length;
    return { id: item.id, overlapRatio: overlap / answerTokens.size };
  });

  const supportingSourceIds = perSource
    .filter((source) => source.overlapRatio >= SUPPORTING_SOURCE_THRESHOLD)
    .map((source) => source.id);
  const groundednessScore = Math.min(1, Math.max(0, ...perSource.map((source) => source.overlapRatio)));
  const grounded = groundednessScore >= GROUNDED_SCORE_THRESHOLD && supportingSourceIds.length > 0;

  return {
    applicable: true,
    grounded,
    groundednessScore: Number(groundednessScore.toFixed(2)),
    supportingSourceIds,
    warning: grounded
      ? null
      : "This answer could not be strongly matched to retrieved evidence. Treat it as low-confidence and verify independently.",
  };
}

/** Used for procedural tool outputs (workflow/metrics) where groundedness against retrieved text does not apply. */
export function notApplicableVerifierResult(): VerifierResult {
  return { applicable: false, grounded: true, groundednessScore: 1, supportingSourceIds: [], warning: null };
}
