import { beforeEach, describe, expect, it } from "vitest";

import type { SupportTrace } from "./support-agent";
import { buildSupportAnalytics, dispatchSimulatedAnalyticsReport, recordSupportEvent, resetSupportAnalyticsForTests } from "./support-analytics";

const NOW = Date.parse("2026-07-13T05:00:00.000Z");

function trace(intent: SupportTrace["intent"], decision: SupportTrace["decision"]): SupportTrace {
  return {
    intent,
    risk: decision === "ESCALATE" ? "HIGH" : "LOW",
    decision,
    language: "th",
    customerScope: "USER-SHOULD-NOT-BE-STORED",
    steps: [],
    sources: [],
    verifier: { applicable: false, grounded: true, groundednessScore: 1, supportingSourceIds: [], querySupportScore: 1, warning: null },
    escalationReason: null,
    latencyMs: 20,
    toolCallCount: 1,
    modelCallCount: 0,
    estimatedUsage: null,
    mode: "deterministic",
    normalizationMode: "local-map",
  };
}

describe("support analytics", () => {
  beforeEach(() => resetSupportAnalyticsForTests());

  it("builds reconciled day, week, and month metrics", () => {
    for (const period of ["day", "week", "month"] as const) {
      resetSupportAnalyticsForTests();
      const report = buildSupportAnalytics(period, NOW);
      expect(report.metrics.autoResponded + report.metrics.escalated).toBe(report.metrics.totalInteractions);
      expect(report.issues.reduce((sum, issue) => sum + issue.count, 0)).toBe(report.metrics.totalInteractions);
      expect(report.trend).toHaveLength(period === "day" ? 1 : period === "week" ? 7 : 30);
    }
  });

  it("records only classified operational fields without customer identifiers or messages", () => {
    const event = recordSupportEvent(trace("deposit_withdrawal", "ESCALATE"), NOW);
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("USER-SHOULD-NOT-BE-STORED");
    expect(serialized).not.toMatch(/message|customerScope|phone/i);
    expect(event.destination).toBe("Payments Operations");
    expect(event.resolutionPath).toBe("EMPLOYEE_REVIEW");
    expect(event.reasonCode).toBe("HIGH_RISK");
  });

  it("identifies the highest-volume issue and its responsible team", () => {
    const report = buildSupportAnalytics("month", NOW);
    expect(report.metrics.topIssue).toBe("Deposit & withdrawal");
    expect(report.issues[0].destination).toBe("Payments Operations");
    expect(report.issues[0].recommendation).toMatch(/gateway|transaction/i);
    expect(report.learning.aiResolvedCases + report.learning.employeeReviewCases).toBe(report.metrics.totalInteractions);
    expect(report.learning.recentCases.every((item) => item.resolutionPath === "AI_RESOLVED" || item.resolutionPath === "EMPLOYEE_REVIEW")).toBe(true);
    expect(report.learning.improvementBacklog[0].employeeReviewCount).toBeGreaterThan(0);
  });

  it("creates a simulated report routed to responsible teams", () => {
    const dispatch = dispatchSimulatedAnalyticsReport("week", NOW);
    expect(dispatch.success).toBe(true);
    expect(dispatch.simulated).toBe(true);
    expect(dispatch.status).toBe("QUEUED");
    expect(dispatch.recipients).toContain("Payments Operations");
    expect(dispatch.recommendations.length).toBeGreaterThan(0);
  });

  it("labels the source and privacy boundary honestly", () => {
    const report = buildSupportAnalytics("month", NOW);
    expect(report.source.type).toBe("bounded-in-memory-demo-events");
    expect(report.source.containsCustomerText).toBe(false);
    expect(report.source.containsCustomerIdentifiers).toBe(false);
    expect(report.simulated).toBe(true);
  });
});
