import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { searchKnowledgeSemantic } from "@/lib/knowledge";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "rag", 20, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await request.json()) as { query?: string };
  const query = body.query?.trim();
  if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });
  if (query.length > 500) return NextResponse.json({ error: "Query must be 500 characters or fewer" }, { status: 400 });
  const retrieval = await searchKnowledgeSemantic(query);
  const matches = retrieval.results;
  return NextResponse.json({
    answer: matches.length ? matches[0].chunk : "No grounded answer was found in the sample documents.",
    sources: matches.map(({ document, score, scoreComponents }) => ({ id: document.id, title: document.title, score, scoreComponents })),
    retrievalMode: retrieval.mode,
    embeddingModel: retrieval.model,
  });
}
