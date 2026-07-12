import { describe, expect, it } from "vitest";
import { composeCustomerResponse, deriveTone } from "./response-composer";

describe("response composer", () => {
  it("derives empathetic tone for complaints", () => {
    expect(deriveTone("This is unacceptable", "MEDIUM", "complaint")).toBe("empathetic");
  });

  it("creates natural Thai demo-queue wording without callback promises", async () => {
    const reply = await composeCustomerResponse({ message: "ยอดเงินผิด", intent: "billing_payment", risk: "HIGH", decision: "ESCALATE", escalationReason: "dispute", evidence: "", locale: "th", tone: "urgent", handoffId: "DEMO-CS-123" });
    expect(reply).toContain("เคสจำลอง");
    expect(reply).toContain("DEMO-CS-123");
    expect(reply).not.toMatch(/เจ้าหน้าที่มนุษย์|ติดต่อกลับ|ประสานงานให้เรียบร้อย/);
  });

  it("does not claim success when no handoff id exists", async () => {
    const reply = await composeCustomerResponse({ message: "help", intent: "unknown", risk: "HIGH", decision: "ESCALATE", escalationReason: "unknown", evidence: "", locale: "en", tone: "neutral", handoffId: null });
    expect(reply).toMatch(/could not be created/i);
    expect(reply).not.toMatch(/has been created|reference is/i);
  });
});
