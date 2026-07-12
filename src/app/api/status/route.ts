import { NextResponse } from "next/server";
import { isOpenAIConfigured } from "@/lib/openai";

export async function GET() {
  return NextResponse.json({
    liveAI: isOpenAIConfigured(),
    chat: isOpenAIConfigured() ? "openai-tool-calling" : "deterministic-fallback",
    retrieval: isOpenAIConfigured() ? "openai-embeddings" : "local-vector-fallback",
  });
}
