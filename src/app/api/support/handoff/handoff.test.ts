import { beforeEach, describe, expect, it } from "vitest";
import { handleSimulatedHandoff, resetSimulatedHandoffsForTests } from "@/lib/support-handoff";

describe("simulated support handoff", () => {
  beforeEach(() => resetSimulatedHandoffsForTests());

  it("returns the exact original record for a duplicate key", () => {
    const input = { customerMessage: "demo", intent: "complaint", risk: "HIGH", escalationReason: "complaint", locale: "en", idempotencyKey: "same-key" };
    const first = handleSimulatedHandoff(input);
    const second = handleSimulatedHandoff(input);
    expect(second.handoffId).toBe(first.handoffId);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.idempotent).toBe(true);
  });
});
