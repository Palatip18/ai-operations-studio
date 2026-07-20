import { beforeEach, describe, expect, it } from "vitest";
import { createCustomerContextToken, findDemoCustomer, verifyCustomerContextToken } from "./support-customer";

describe("simulated support customer context", () => {
  beforeEach(() => {
    process.env.DEMO_PASSWORD = "test-demo-password";
  });

  it("finds only known fictional users", () => {
    expect(findDemoCustomer("user-ray01")?.userId).toBe("USER-RAY01");
    expect(findDemoCustomer("ABC123")?.userId).toBe("USER-RAY01");
    expect(findDemoCustomer("080-000-0001")?.userId).toBe("USER-RAY01");
    expect(findDemoCustomer("USER-UNKNOWN")).toBeNull();
  });

  it("creates a signed, expiring customer context", () => {
    const customer = findDemoCustomer("USER-RAY01");
    expect(customer).not.toBeNull();
    const token = createCustomerContextToken(customer!, 1_000);
    expect(verifyCustomerContextToken(token, 2_000)?.userId).toBe("USER-RAY01");
    expect(verifyCustomerContextToken(token, 1_000 + 7 * 60 * 60 * 1_000)?.userId).toBe("USER-RAY01");
    expect(verifyCustomerContextToken(token, 1_000 + 9 * 60 * 60 * 1_000)).toBeNull();
  });

  it("rejects a modified customer token", () => {
    const customer = findDemoCustomer("USER-RAY01")!;
    const token = createCustomerContextToken(customer);
    expect(verifyCustomerContextToken(`${token}tampered`)).toBeNull();
  });
});
