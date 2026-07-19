import { describe, expect, it } from "vitest";

import { knowledgeDocuments, searchKnowledge } from "./knowledge";

const patternDocuments = knowledgeDocuments.filter((document) =>
  document.id.startsWith("fictional-"),
);

describe("anonymized operational-pattern knowledge", () => {
  it("contains four explicitly fictional decision policies", () => {
    expect(patternDocuments).toHaveLength(4);
    expect(patternDocuments.every((document) => document.metadata?.capabilityStatus === "SIMULATED")).toBe(true);
    expect(patternDocuments.every((document) => /fictional/i.test(`${document.title} ${document.content}`))).toBe(true);
  });

  it("does not contain URLs, contact handles, internal IDs, or customer-like identifiers", () => {
    const corpus = patternDocuments.map((document) => `${document.title}\n${document.content}`).join("\n");
    expect(corpus).not.toMatch(/https?:\/\/|www\.|telegram|@[a-z0-9_]+|\b(?:user|task|mission)\s*id\s*:/i);
    expect(corpus).not.toMatch(/\b[A-Z]{2,}-\d{3,}\b/);
  });

  it("retrieves the withdrawal decision table for a rule-heavy bonus question", () => {
    const results = searchKnowledge(
      "What turnover, eligible games, free-spin and maximum withdrawal cap rules apply to the Starter Match bonus?",
      5,
    );
    expect(results.some((result) => result.document.id === "fictional-bonus-withdrawal-decision-table")).toBe(true);
  });

  it("retrieves KYC policy for an expired identity and payment-owner mismatch", () => {
    const results = searchKnowledge(
      "My passport expired and the payment account owner does not match. What KYC review is required?",
      5,
    );
    expect(results.some((result) => result.document.id === "fictional-payment-ownership-kyc-policy")).toBe(true);
  });
});
