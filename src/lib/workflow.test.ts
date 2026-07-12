import { describe, expect, it } from "vitest";
import { runWorkflow } from "./workflow";

describe("runWorkflow", () => {
  it("routes high-priority requests to review", () => {
    const steps = runWorkflow({ requester: "Demo User", type: "Software access", priority: "High", details: "Sample request" });
    expect(steps.find((step) => step.step === "Policy check")?.status).toBe("review");
  });
});
