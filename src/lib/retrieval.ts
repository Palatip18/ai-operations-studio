export type Vector = number[];

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
  "in", "is", "it", "of", "on", "or", "should", "the", "to", "what", "when",
  "where", "which", "who", "with",
]);

export function tokenize(value: string) {
  return (value.toLowerCase().match(/[a-z0-9]+|[\u0E00-\u0E7F]+/g) ?? [])
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function hash(token: string) {
  let value = 2166136261;
  for (const character of token) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/**
 * A deterministic local feature-hashing embedding. It is intentionally small
 * and dependency-free for the public demo; a production system would replace
 * this adapter with a managed embedding model and persisted vector store.
 */
export function embedText(value: string, dimensions = 256): Vector {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of tokenize(value)) {
    const tokenHash = hash(token);
    const index = tokenHash % dimensions;
    const sign = tokenHash & 1 ? 1 : -1;
    vector[index] += sign;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  return magnitude ? vector.map((item) => item / magnitude) : vector;
}

export function cosineSimilarity(left: Vector, right: Vector) {
  return left.reduce((sum, item, index) => sum + item * (right[index] ?? 0), 0);
}

export function chunkText(value: string, maxWords = 45) {
  const sentences = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()) ?? [];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const candidate = `${current} ${sentence}`.trim();
    if (tokenize(candidate).length > maxWords && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
