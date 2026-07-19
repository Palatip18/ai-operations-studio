import { describe, expect, it } from "vitest";

import { knowledgeDocuments, searchKnowledge } from "./knowledge";
import { localizeSupportAnswer, normalizeLocally } from "./multilingual";

const csPatternDocuments = knowledgeDocuments.filter((document) =>
  document.id.startsWith("cs-pattern-"),
);

describe("fictional CS promotion-control patterns", () => {
  it("contains six privacy-safe portfolio documents", () => {
    expect(csPatternDocuments).toHaveLength(6);
    expect(new Set(csPatternDocuments.map((document) => document.id)).size).toBe(6);
    expect(csPatternDocuments.every((document) => document.metadata?.capabilityStatus === "SIMULATED")).toBe(true);
    expect(csPatternDocuments.every((document) => !/fictional|simulated/i.test(`${document.title} ${document.content}`))).toBe(true);
  });

  it("contains no URL, contact handle, customer identifier, or credential pattern", () => {
    const corpus = csPatternDocuments.map((document) => `${document.title}\n${document.content}`).join("\n");
    expect(corpus).not.toMatch(/https?:\/\/|www\.|telegram|line\.biz|@[a-z0-9_]+/i);
    expect(corpus).not.toMatch(/\b(?:user(?:name)?|password|account)\s*(?:id)?\s*[:=]\s*\S+/i);
    expect(corpus).not.toMatch(/\b[A-Z]{2,}-\d{3,}\b/);
  });

  it("retrieves current status and claim destination guidance", () => {
    const results = searchKnowledge(
      "Is this promotion currently open or closed, where do I claim it, and which bonus wallet receives it?",
      6,
    );
    const ids = results.map((result) => result.document.id);
    expect(ids).toContain("cs-pattern-promotion-status-control");
    expect(ids).toContain("cs-pattern-promotion-claim-and-credit-route");
  });

  it("retrieves the tiered response for a repeated unavailable offer", () => {
    const results = searchKnowledge(
      "The limited promotion is unavailable after I retried and followed up. What should the customer response and handoff be?",
      6,
    );
    const ids = results.map((result) => result.document.id);
    expect(ids).toContain("cs-pattern-limited-capacity-offer");
    expect(ids).toContain("cs-pattern-tiered-customer-response");
  });

  it("normalizes Thai and Chinese CS phrases into retrieval vocabulary", () => {
    expect(normalizeLocally("สถานะโปรเปิดอยู่ไหม กดรับโบนัสที่ไหน", "th")).toContain("promotion status");
    expect(normalizeLocally("สถานะโปรเปิดอยู่ไหม กดรับโบนัสที่ไหน", "th")).toContain("claim channel");
    expect(normalizeLocally("促销状态开放吗？奖金在哪里领取？", "zh")).toContain("promotion status");
    expect(normalizeLocally("促销状态开放吗？奖金在哪里领取？", "zh")).toContain("claim channel");
  });

  it("localizes the fictional promotion record without an online model", async () => {
    const evidence = csPatternDocuments.find((document) => document.id === "cs-pattern-promotion-status-control")?.content ?? "";
    await expect(localizeSupportAnswer(evidence, "th")).resolves.toContain("ศูนย์กิจกรรม");
    await expect(localizeSupportAnswer(evidence, "zh")).resolves.toContain("活动中心");
  });
});
