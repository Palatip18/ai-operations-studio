import { describe, expect, it } from "vitest";
import { lookupSimulatedTransaction } from "./support-backoffice";

describe("simulated support back office", () => {
  it("requires a reference before looking up a transaction", () => {
    expect(lookupSimulatedTransaction("My withdrawal is delayed").status).toBe("NEEDS_REFERENCE");
  });

  it("returns a structured normal status without review", () => {
    const result = lookupSimulatedTransaction("Check WDL-2001 please");
    expect(result).toMatchObject({ found: true, reference: "WDL-2001", status: "PROCESSING", reviewRequired: false, simulated: true });
  });

  it("flags a completed-ledger/customer-missing mismatch for review", () => {
    const result = lookupSimulatedTransaction("WDL-2002 is completed but the money was not received");
    expect(result).toMatchObject({ found: true, status: "COMPLETED", reviewRequired: true });
  });

  it("sends a valid-looking unknown reference for review", () => {
    const result = lookupSimulatedTransaction("Please check DEP-9999");
    expect(result).toMatchObject({ found: false, status: "NOT_FOUND", reviewRequired: true });
  });
});
