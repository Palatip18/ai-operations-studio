export function isOpenAIConfigured() {
  return process.env.AI_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY);
}

export async function createOpenAIEmbeddings(inputs: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: inputs, encoding_format: "float" }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    throw new Error(`Embedding provider returned ${response.status}${requestId ? ` (request ${requestId})` : ""}`);
  }
  const payload = await response.json() as { data: { index: number; embedding: number[] }[]; model: string; usage?: { prompt_tokens: number; total_tokens: number } };
  const vectors = payload.data.sort((left, right) => left.index - right.index).map((item) => item.embedding);
  if (vectors.length !== inputs.length) throw new Error("Embedding provider returned an unexpected vector count");
  return { vectors, model: payload.model, usage: payload.usage };
}
