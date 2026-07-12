import { describe, expect, it } from "vitest";

import {
  buildSupportLocalizationInstruction,
  supportBehaviorConfig,
} from "./support-behavior";

describe("support behavior configuration", () => {
  it("exposes an active, versioned internal behavior policy", () => {
    expect(supportBehaviorConfig.status).toBe("ACTIVE");
    expect(supportBehaviorConfig.version).toMatch(/^support-behavior-/);
    expect(supportBehaviorConfig.responsePrinciples.length).toBeGreaterThanOrEqual(4);
    expect(supportBehaviorConfig.escalationRules.length).toBeGreaterThanOrEqual(3);
  });

  it("builds Thai localization instructions from the configured persona and guardrails", () => {
    const instruction = buildSupportLocalizationInstruction("th");

    expect(instruction).toContain(supportBehaviorConfig.persona.th);
    expect(instruction).toContain("ค่ะ/นะคะ");
    expect(instruction).toContain("เจ้าหน้าที่มนุษย์");
    expect(instruction).toContain(supportBehaviorConfig.responsePrinciples[0]);
  });

  it("builds a constrained Simplified Chinese support instruction", () => {
    const instruction = buildSupportLocalizationInstruction("zh");

    expect(instruction).toContain(supportBehaviorConfig.persona.zh);
    expect(instruction).toContain("Simplified Chinese");
    expect(instruction).toContain("do not expose internal system terminology");
  });
});
