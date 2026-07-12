import { describe, expect, it } from "vitest";
import { checkMandatoryEscalation, classifyIntent, classifyRisk } from "./support-classification";

describe("classifyIntent", () => {
  it("classifies each documented intent from representative phrasing", () => {
    expect(classifyIntent("How do I create a new account?")).toBe("account_onboarding");
    expect(classifyIntent("How do I use the reports feature in the dashboard?")).toBe("product_usage");
    expect(classifyIntent("Where is my support request right now?")).toBe("request_status");
    expect(classifyIntent("When is my invoice issued each month?")).toBe("billing_payment");
    expect(classifyIntent("How do I cancel my subscription?")).toBe("refund_cancellation");
    expect(classifyIntent("The product won't load, what should I do?")).toBe("troubleshooting");
    expect(classifyIntent("Do you need my passport for account recovery?")).toBe("identity_documents");
    expect(classifyIntent("How do I request a copy of my personal data?")).toBe("privacy_security");
    expect(classifyIntent("I am disappointed with the service I received.")).toBe("complaint");
    expect(classifyIntent("What is today's weather?")).toBe("unknown");
  });
});

describe("classifyRisk", () => {
  it("classifies LOW for routine, non-sensitive intents", () => {
    expect(classifyRisk("How do I create a new account?", "account_onboarding")).toBe("LOW");
    expect(classifyRisk("The product won't load", "troubleshooting")).toBe("LOW");
  });

  it("classifies MEDIUM for money/identity/privacy/complaint intents and unknown intent", () => {
    expect(classifyRisk("When is my invoice issued?", "billing_payment")).toBe("MEDIUM");
    expect(classifyRisk("What is today's weather?", "unknown")).toBe("MEDIUM");
  });

  it("classifies HIGH whenever a high-risk keyword is present, regardless of intent", () => {
    expect(classifyRisk("I want to dispute an unauthorized charge", "billing_payment")).toBe("HIGH");
    expect(classifyRisk("Someone hacked my account", "privacy_security")).toBe("HIGH");
    expect(classifyRisk("This is unacceptable, I'm furious and I will report you online", "complaint")).toBe("HIGH");
  });
});

describe("checkMandatoryEscalation", () => {
  it("triggers on financial dispute language", () => {
    const result = checkMandatoryEscalation("This is an unauthorized charge, I want to dispute it.", "billing_payment");
    expect(result.escalate).toBe(true);
    expect(result.reason).not.toBeNull();
  });

  it("triggers on personal/sensitive data requests", () => {
    const result = checkMandatoryEscalation("How do I request a copy of my personal data?", "privacy_security");
    expect(result.escalate).toBe(true);
  });

  it("triggers on fraud/security/legal language", () => {
    const result = checkMandatoryEscalation("Someone hacked my account, there was a security breach.", "privacy_security");
    expect(result.escalate).toBe(true);
  });

  it("triggers on an exception-outside-policy request", () => {
    const result = checkMandatoryEscalation("Can you make an exception and waive your refund policy?", "refund_cancellation");
    expect(result.escalate).toBe(true);
  });

  it("triggers on a highly negative complaint or threat of public escalation", () => {
    const result = checkMandatoryEscalation("This is unacceptable, I'm furious and I will report you online.", "complaint");
    expect(result.escalate).toBe(true);
  });

  it("does not trigger for a routine, low-intensity message", () => {
    const result = checkMandatoryEscalation("How do I create a new account?", "account_onboarding");
    expect(result.escalate).toBe(false);
    expect(result.reason).toBeNull();
  });
});
