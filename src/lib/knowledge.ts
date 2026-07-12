export type KnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  updated: string;
  content: string;
};

import { chunkText, cosineSimilarity, embedText } from "./retrieval";
import { createOpenAIEmbeddings, isOpenAIConfigured } from "./openai";

export const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "remote-onboarding",
    title: "Remote Team Onboarding Guide",
    category: "People Operations",
    updated: "2026-06-12",
    content: "New remote team members receive account access on day one, complete security training within three business days, and meet their onboarding partner twice during the first week. Managers run a 30-day check-in and record agreed goals.",
  },
  {
    id: "expense-policy",
    title: "Sample Expense Policy",
    category: "Finance Operations",
    updated: "2026-05-20",
    content: "Expense claims require a receipt, business purpose, and cost centre. Claims below 5,000 THB need manager approval. Higher-value claims also require finance review. Employees should submit claims within 30 days.",
  },
  {
    id: "incident-playbook",
    title: "Service Incident Playbook",
    category: "IT Operations",
    updated: "2026-06-01",
    content: "A high-severity incident is acknowledged within 15 minutes. The incident lead opens a shared channel, assigns an owner, publishes updates every 30 minutes, and schedules a blameless review within five business days after resolution.",
  },
];

export function searchKnowledge(query: string, limit = 3) {
  const queryVector = embedText(query);
  return knowledgeDocuments.flatMap((document) =>
    chunkText(document.content).map((chunk, chunkIndex) => ({
      document,
      chunk,
      chunkIndex,
      score: cosineSimilarity(
        queryVector,
        embedText(`${document.title} ${document.category} ${chunk}`),
      ),
    })),
  )
    .filter((result) => result.score >= 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const semanticChunks = knowledgeDocuments.flatMap((document) =>
  chunkText(document.content).map((chunk, chunkIndex) => ({ document, chunk, chunkIndex })),
);
let documentEmbeddings: Promise<Awaited<ReturnType<typeof createOpenAIEmbeddings>>> | null = null;

export async function searchKnowledgeSemantic(query: string, limit = 3) {
  return (await searchKnowledgeSemanticBatch([query], limit))[0];
}

export async function searchKnowledgeSemanticBatch(queries: string[], limit = 3) {
  if (!isOpenAIConfigured()) return queries.map((query) => ({ results: searchKnowledge(query, limit), mode: "local-vector" as const, model: "feature-hashing-256" }));
  try {
    documentEmbeddings ??= createOpenAIEmbeddings(
      semanticChunks.map(({ document, chunk }) => `${document.title}\n${document.category}\n${chunk}`),
    );
    const [documents, queryEmbeddings] = await Promise.all([
      documentEmbeddings,
      createOpenAIEmbeddings(queries),
    ]);
    return queryEmbeddings.vectors.map((queryVector) => ({
      results: semanticChunks
        .map((item, index) => ({ ...item, score: cosineSimilarity(queryVector, documents.vectors[index]) }))
        .filter((result) => result.score >= 0.25)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit),
      mode: "openai-embeddings" as const,
      model: queryEmbeddings.model,
    }));
  } catch (error) {
    console.error("Semantic retrieval failed; using local vector fallback", error instanceof Error ? error.message : "Unknown error");
    documentEmbeddings = null;
    return queries.map((query) => ({ results: searchKnowledge(query, limit), mode: "local-vector-fallback" as const, model: "feature-hashing-256" }));
  }
}
