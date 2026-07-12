import { describe, expect, it } from "vitest";
import { composeCustomerResponse, deriveTone, sanitizeCustomerFacingResponse } from "./response-composer";

describe("response composer", () => {
  it("derives empathetic tone for complaints", () => {
    expect(deriveTone("This is unacceptable", "MEDIUM", "complaint")).toBe("empathetic");
  });

  it("creates natural Thai demo-queue wording without callback promises", async () => {
    const reply = await composeCustomerResponse({ message: "ยอดเงินผิด", intent: "billing_payment", risk: "HIGH", decision: "ESCALATE", escalationReason: "dispute", evidence: "", locale: "th", tone: "urgent", handoffId: "DEMO-CS-123" });
    expect(reply).toContain("แอดมิน");
    expect(reply).toContain("ค่ะ");
    expect(reply).not.toMatch(/ระบบ|จำลอง|เจ้าหน้าที่มนุษย์/);
    expect(reply).toContain("DEMO-CS-123");
    expect(reply).not.toMatch(/เจ้าหน้าที่มนุษย์|ติดต่อกลับ|ประสานงานให้เรียบร้อย/);
  });

  it("does not claim success when no handoff id exists", async () => {
    const reply = await composeCustomerResponse({ message: "help", intent: "unknown", risk: "HIGH", decision: "ESCALATE", escalationReason: "unknown", evidence: "", locale: "en", tone: "neutral", handoffId: null });
    expect(reply).toMatch(/could not be created/i);
    expect(reply).not.toMatch(/has been created|reference is/i);
  });

  it("removes internal document identifiers from customer-facing answers", async () => {
    const reply = await composeCustomerResponse({ message: "How do I sign up?", intent: "account_onboarding", risk: "LOW", decision: "AUTO_RESPOND", escalationReason: null, evidence: "[onboarding-faq] Create an account with an email address.", locale: "en", tone: "helpful", handoffId: null });
    expect(reply).toContain("Create an account");
    expect(reply).not.toContain("[onboarding-faq]");
  });

  it("uses an empathetic lead for customer complaints", async () => {
    const reply = await composeCustomerResponse({ message: "This is upsetting", intent: "complaint", risk: "MEDIUM", decision: "AUTO_RESPOND", escalationReason: null, evidence: "The documented next step is to review the request.", locale: "en", tone: "empathetic", handoffId: null });
    expect(reply).toMatch(/^I understand your concern\./);
  });

  it("removes model-generated source labels from customer-facing text", () => {
    expect(sanitizeCustomerFacingResponse("ตรวจสอบรายละเอียดได้ค่ะ [AUSupport]")).toBe("ตรวจสอบรายละเอียดได้ค่ะ");
    expect(sanitizeCustomerFacingResponse("Terms apply [source promotion-policy].")).toBe("Terms apply.");
  });

  it("replaces unnatural Thai promotion-panel wording", () => {
    expect(sanitizeCustomerFacingResponse("กรุณาตรวจสอบในแผงโปรโมชั่นนะคะ"))
      .toBe("กรุณาตรวจสอบในรายละเอียดของโปรโมชั่นนะคะ");
  });
});
