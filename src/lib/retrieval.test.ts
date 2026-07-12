import { describe, expect, it } from "vitest";
import { chunkText, cosineSimilarity, embedText } from "./retrieval";

describe("local vector retrieval", () => {
  it("gives related text a higher cosine score", () => {
    const query = embedText("expense receipt claim");
    expect(cosineSimilarity(query, embedText("expense claims need a receipt"))).toBeGreaterThan(cosineSimilarity(query, embedText("incident response channel")));
  });
  it("chunks long text without dropping content", () => {
    const text = "First sentence has several words. Second sentence has several more words. Third sentence finishes the example.";
    expect(chunkText(text, 6).join(" ")).toBe(text);
  });
});
