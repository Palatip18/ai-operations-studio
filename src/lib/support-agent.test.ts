import { describe, expect, it } from "vitest";
import { decideSupportPolicy, runSupportAgent } from "./support-agent";
import { notApplicableVerifierResult, verifyGroundedness } from "./verifier";

describe("decideSupportPolicy (pure policy logic)", () => {
  it("escalates on insufficient evidence, even with no mandatory trigger and LOW risk", () => {
    const ungrounded = verifyGroundedness("No grounded answer was found.", []);
    const result = decideSupportPolicy({ escalate: false, reason: null }, ungrounded, "LOW", "troubleshooting");
    expect(result.decision).toBe("ESCALATE");
    expect(result.escalationReason).toMatch(/insufficient|unsupported/i);
  });

  it("uses an ambiguous-request reason when intent is unknown and evidence is insufficient", () => {
    const ungrounded = verifyGroundedness("No grounded answer was found.", []);
    const result = decideSupportPolicy({ escalate: false, reason: null }, ungrounded, "MEDIUM", "unknown");
    expect(result.decision).toBe("ESCALATE");
    expect(result.escalationReason).toMatch(/ambiguous/i);
  });

  it("escalates on a mandatory trigger even when grounded and LOW risk", () => {
    const grounded = verifyGroundedness("Grounded answer: some policy text.", [{ id: "doc", text: "Grounded answer: some policy text." }]);
    const result = decideSupportPolicy({ escalate: true, reason: "Potential financial loss or transaction dispute requires human review." }, grounded, "LOW", "billing_payment");
    expect(result.decision).toBe("ESCALATE");
    expect(result.escalationReason).toBe("Potential financial loss or transaction dispute requires human review.");
  });

  it("escalates on HIGH risk even when grounded and no mandatory trigger", () => {
    const grounded = verifyGroundedness("Grounded answer: some policy text.", [{ id: "doc", text: "Grounded answer: some policy text." }]);
    const result = decideSupportPolicy({ escalate: false, reason: null }, grounded, "HIGH", "complaint");
    expect(result.decision).toBe("ESCALATE");
    expect(result.escalationReason).toMatch(/high risk/i);
  });

  it("auto-responds when grounded, no mandatory trigger, and risk is not HIGH", () => {
    const grounded = verifyGroundedness("Grounded answer: some policy text.", [{ id: "doc", text: "Grounded answer: some policy text." }]);
    const result = decideSupportPolicy({ escalate: false, reason: null }, grounded, "MEDIUM", "billing_payment");
    expect(result.decision).toBe("AUTO_RESPOND");
    expect(result.escalationReason).toBeNull();
  });

  it("treats not-applicable verifier results (workflow/metrics) as satisfying the groundedness gate", () => {
    const result = decideSupportPolicy({ escalate: false, reason: null }, notApplicableVerifierResult(), "LOW", "request_status");
    expect(result.decision).toBe("AUTO_RESPOND");
  });
});

describe("runSupportAgent (integration, deterministic mode)", () => {
  it("auto-responds to a routine FAQ with a grounded source", async () => {
    const { answer, trace } = await runSupportAgent("How do I create a new account?");
    expect(trace.intent).toBe("account_onboarding");
    expect(trace.risk).toBe("LOW");
    expect(trace.decision).toBe("AUTO_RESPOND");
    expect(trace.sources.some((s) => s.id === "onboarding-faq")).toBe(true);
    expect(answer.toLowerCase()).not.toContain("escalated to a human agent");
  });

  it("escalates a financial-dispute message via the mandatory trigger", async () => {
    const { answer, trace } = await runSupportAgent("I was charged twice, this is an unauthorized charge and I want it disputed immediately.");
    expect(trace.risk).toBe("HIGH");
    expect(trace.decision).toBe("ESCALATE");
    expect(trace.escalationReason).not.toBeNull();
    expect(answer).toContain("escalated to a human agent");
  });

  it("escalates an angry complaint via the mandatory trigger", async () => {
    const { trace } = await runSupportAgent("This is unacceptable, I'm furious and I will report you online if this isn't fixed.");
    expect(trace.intent).toBe("complaint");
    expect(trace.decision).toBe("ESCALATE");
  });

  it("never runs more than 2 tools (retrieval + at most one workflow tool) — bounded execution", async () => {
    const cases = [
      "How do I create a new account?",
      "The product won't load, what should I do?",
      "I was charged twice, this is an unauthorized charge and I want it disputed immediately.",
    ];
    for (const message of cases) {
      const { trace } = await runSupportAgent(message);
      expect(trace.toolCallCount).toBeLessThanOrEqual(2);
    }
  });

  it("reports no provider usage data in deterministic mode", async () => {
    const { trace } = await runSupportAgent("How do I create a new account?");
    expect(trace.estimatedUsage).toBeNull();
    expect(trace.mode).toBe("deterministic");
  });
});

describe("trace redaction for the support agent", () => {
  it("redacts a secret-looking pattern embedded in the customer message", async () => {
    const { trace } = await runSupportAgent("My key is sk-shouldnotleak1234567890, how do I create a new account?");
    const raw = JSON.stringify(trace);
    expect(raw).not.toContain("sk-shouldnotleak1234567890");
  });
});
