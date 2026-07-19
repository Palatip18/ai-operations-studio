import type { Intent } from "./support-classification";

export type LearnedLanguagePattern = {
  phrase: string;
  intent: Exclude<Intent, "unknown">;
  confirmations: number;
  updatedAt: string;
};

const learnedPatterns = new Map<string, LearnedLanguagePattern>();
const MAX_PATTERNS = 250;

function phraseKey(phrase: string) {
  return phrase.toLocaleLowerCase().replace(/[\s.,!?;:()[\]{}'"“”‘’]+/gu, "").trim();
}

function isSafePhrase(phrase: string) {
  return phrase.length >= 3
    && phrase.length <= 120
    && !/@|https?:\/\/|USER-|\b(?:DEP|WDL)-\d+\b|\b\d{8,}\b/i.test(phrase);
}

export function resolveLearnedIntent(phrase: string): Exclude<Intent, "unknown"> | null {
  return learnedPatterns.get(phraseKey(phrase))?.intent ?? null;
}

/**
 * Learns only a language-to-intent alias after an explicit clarification.
 * Customer text can never alter policies, promotion conditions, risk rules,
 * or factual knowledge.
 */
export function learnLanguagePattern(phrase: string, intent: Intent): LearnedLanguagePattern | null {
  if (intent === "unknown" || !isSafePhrase(phrase)) return null;
  const key = phraseKey(phrase);
  if (!key) return null;
  const existing = learnedPatterns.get(key);
  const learned: LearnedLanguagePattern = {
    phrase: phrase.trim(),
    intent,
    confirmations: (existing?.intent === intent ? existing.confirmations : 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  learnedPatterns.set(key, learned);
  if (learnedPatterns.size > MAX_PATTERNS) {
    const oldest = learnedPatterns.keys().next().value as string | undefined;
    if (oldest) learnedPatterns.delete(oldest);
  }
  return learned;
}

export function resetLearnedLanguagePatternsForTests() {
  learnedPatterns.clear();
}
