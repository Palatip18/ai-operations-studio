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
    expect(answer).toContain("DEMO-CS-");
    expect(answer).toContain("billing issue");
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

  it("handles promotion and game questions with the gaming knowledge base", async () => {
    const promotion = await runSupportAgent("What are the turnover conditions for the welcome promotion?");
    expect(promotion.trace.intent).toBe("promotion_bonus");
    expect(promotion.trace.sources.some((s) => s.id.startsWith("gaming-") && /promotion|bonus/.test(s.id))).toBe(true);

    const game = await runSupportAgent("The game round is frozen and my balance did not update.");
    expect(game.trace.intent).toBe("game_support");
    expect(game.trace.sources.some((s) => s.id === "gaming-game-issue-guide")).toBe(true);
  });

  it("creates a simulated transaction-review case for missing deposits and withdrawals", async () => {
    for (const message of [
      "My deposit DEP-1002 was completed but the credit was not received.",
      "My withdrawal WDL-2002 says completed but the money was not received.",
    ]) {
      const result = await runSupportAgent(message, [], "USER-RAY01");
      expect(result.trace.intent).toBe("deposit_withdrawal");
      expect(result.trace.risk).toBe("HIGH");
      expect(result.trace.decision).toBe("ESCALATE");
      expect(result.handoff?.success).toBe(true);
      expect(result.answer).toContain("DEMO-CS-");
    }
  });

  it("understands the core Thai deposit and withdrawal scenarios", async () => {
    const deposit = await runSupportAgent("ฝากเงินรายการ DEP-1002 สำเร็จแล้ว แต่เครดิตยังไม่เข้า", [], "USER-RAY01");
    expect(deposit.trace.intent).toBe("deposit_withdrawal");
    expect(deposit.trace.decision).toBe("ESCALATE");
    expect(deposit.answer).toContain("ตรวจสอบธุรกรรม");

    const withdrawal = await runSupportAgent("รายการ WDL-2002 แสดงว่าถอนเงินสำเร็จแล้ว แต่เงินยังไม่เข้าบัญชี", [], "USER-RAY01");
    expect(withdrawal.trace.intent).toBe("deposit_withdrawal");
    expect(withdrawal.trace.decision).toBe("ESCALATE");
  });

  it("checks a normal back-office status without creating a support case", async () => {
    const result = await runSupportAgent("Please check withdrawal WDL-2001; it is still pending.", [], "USER-RAY01");
    expect(result.transaction?.status).toBe("PROCESSING");
    expect(result.trace.steps.some((step) => step.tool === "lookup_transaction_status")).toBe(true);
    expect(result.trace.decision).toBe("AUTO_RESPOND");
    expect(result.handoff).toBeNull();
  });

  it("requests a transaction reference before opening a case", async () => {
    const result = await runSupportAgent("My deposit has not arrived.", [], "USER-RAY01");
    expect(result.transaction?.status).toBe("NEEDS_REFERENCE");
    expect(result.trace.decision).toBe("AUTO_RESPOND");
    expect(result.handoff).toBeNull();
    expect(result.answer).toMatch(/DEP-1001|transaction reference/i);
  });

  it("asks for a User ID only when an unverified customer needs an account lookup", async () => {
    const transaction = await runSupportAgent("ฝากเงินไม่เข้า ช่วยตรวจสอบให้หน่อย");
    expect(transaction.customerVerificationRequired).toBe(true);
    expect(transaction.trace.decision).toBe("AUTO_RESPOND");
    expect(transaction.handoff).toBeNull();
    expect(transaction.answer).toContain("User ID");

    const promotion = await runSupportAgent("โปรโมชั่นสมาชิกใหม่มีเงื่อนไขอะไรบ้าง");
    expect(promotion.customerVerificationRequired).toBe(false);
    expect(promotion.answer).not.toContain("User ID");
  });

  it("treats a Thai deposit correction as the current topic instead of repeating withdrawal guidance", async () => {
    const result = await runSupportAgent(
      "ไม่ใช่ถอน ฝากไม่เข้า",
      ["ถอนเงินสำเร็จแล้วแต่บัญชีปลายทางยังไม่ได้รับเงิน"],
      "USER-RAY01",
    );
    expect(result.trace.intent).toBe("deposit_withdrawal");
    expect(result.transaction).toMatchObject({ status: "NEEDS_REFERENCE", kind: "DEPOSIT", reviewRequired: false });
    expect(result.trace.decision).toBe("AUTO_RESPOND");
    expect(result.handoff).toBeNull();
    expect(result.answer).toContain("รายการฝากเงิน");
    expect(result.answer).toContain("DEP-1001");
    expect(result.answer).not.toContain("หมายเลขอ้างอิงการถอน");
  });
});

describe("trace redaction for the support agent", () => {
  it("redacts a secret-looking pattern embedded in the customer message", async () => {
    const { trace } = await runSupportAgent("My key is sk-shouldnotleak1234567890, how do I create a new account?");
    const raw = JSON.stringify(trace);
    expect(raw).not.toContain("sk-shouldnotleak1234567890");
    expect(raw).toContain("[redacted]");
  });

  it("ensures personal data like phone, email, and tokens do not leak into technical traces", async () => {
    const message = "Dispute charge immediately. Contact me at user@demo.com or +66-81-234-5678. Reference txn_987654321 and token bearer_secret_token_123.";
    const { trace } = await runSupportAgent(message);
    const rawTraceStr = JSON.stringify(trace);

    // Assert absolute absence of raw PII/secrets inside traces
    expect(rawTraceStr).not.toContain("user@demo.com");
    expect(rawTraceStr).not.toContain("+66-81-234-5678");
    expect(rawTraceStr).not.toContain("txn_987654321");
    expect(rawTraceStr).not.toContain("bearer_secret_token_123");
    
    // Validate trace input schema constraints (redacted info/safe summary code only)
    const handoffStep = trace.steps.find((s) => s.tool === "create_support_handoff");
    expect(handoffStep).toBeDefined();
    expect(handoffStep?.input).not.toHaveProperty("customerMessage");
    expect(handoffStep?.input).not.toHaveProperty("idempotencyKey");
    expect(handoffStep?.input).toHaveProperty("redactedIdempotencyIdentifier");
    expect(handoffStep?.input).toHaveProperty("escalationReasonCode");
  });
});
