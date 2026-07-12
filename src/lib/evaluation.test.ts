import { describe, expect, it } from "vitest";
import { evaluateRetrieval } from "./evaluation";

describe("retrieval evaluation", () => {
  it("passes the documented sample set", () => {
    const metrics = evaluateRetrieval();
    expect(metrics.total).toBe(3);
    expect(metrics.top1Accuracy).toBe(1);
  });
});
