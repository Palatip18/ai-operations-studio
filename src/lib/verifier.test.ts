import { describe, expect, it } from "vitest";
import { notApplicableVerifierResult, verifyGroundedness } from "./verifier";

describe("verifyGroundedness", () => {
  it("marks an answer grounded when it overlaps strongly with evidence", () => {
    const evidence = [{ id: "expense-policy", text: "Expense claims require a receipt and must be submitted within 30 days." }];
    const result = verifyGroundedness("Grounded answer: Expense claims require a receipt and must be submitted within 30 days.", evidence);
    expect(result.applicable).toBe(true);
    expect(result.grounded).toBe(true);
    expect(result.groundednessScore).toBeGreaterThan(0.35);
    expect(result.supportingSourceIds).toContain("expense-policy");
    expect(result.warning).toBeNull();
  });

  it("marks an answer unsupported when there is no evidence", () => {
    const result = verifyGroundedness("No grounded answer was found in the sample documents.", []);
    expect(result.grounded).toBe(false);
    expect(result.groundednessScore).toBe(0);
    expect(result.supportingSourceIds).toEqual([]);
    expect(result.warning).not.toBeNull();
  });

  it("marks an answer unsupported when evidence does not overlap with the claim", () => {
    const evidence = [{ id: "incident-playbook", text: "A high-severity incident is acknowledged within 15 minutes." }];
    const result = verifyGroundedness("The company offers unlimited vacation and a free gym membership for every employee.", evidence);
    expect(result.grounded).toBe(false);
    expect(result.warning).not.toBeNull();
  });

  it("never claims to guarantee factual correctness in its warning text", () => {
    const result = verifyGroundedness("x", []);
    expect(result.warning?.toLowerCase()).not.toContain("guarantee");
  });
});

describe("notApplicableVerifierResult", () => {
  it("is trivially grounded and not applicable for procedural outputs", () => {
    const result = notApplicableVerifierResult();
    expect(result.applicable).toBe(false);
    expect(result.grounded).toBe(true);
    expect(result.warning).toBeNull();
  });
});
