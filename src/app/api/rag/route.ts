import { NextResponse } from "next/server";
import { searchKnowledgeSemantic } from "@/lib/knowledge";

export async function POST(request: Request) {
  const body = (await request.json()) as { query?: string };
  const query = body.query?.trim();
  if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });
  const retrieval = await searchKnowledgeSemantic(query);
  const matches = retrieval.results;
  return NextResponse.json({
    answer: matches.length ? matches[0].chunk : "No grounded answer was found in the sample documents.",
    sources: matches.map(({ document, score }) => ({ id: document.id, title: document.title, score })),
    retrievalMode: retrieval.mode,
    embeddingModel: retrieval.model,
  });
}
