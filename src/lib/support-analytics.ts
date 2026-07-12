import type { Intent, RiskLevel } from "./support-classification";
import type { SupportDecision, SupportTrace } from "./support-agent";

export type AnalyticsPeriod = "day" | "week" | "month";

export type SupportEvent = {
  id: string;
  occurredAt: string;
  intent: Intent;
  risk: RiskLevel;
  decision: SupportDecision;
  language: string;
  destination: string;
};

export type IssueMetric = {
  intent: Intent;
  label: string;
  count: number;
  share: number;
  previousCount: number;
  change: number;
  destination: string;
  recommendation: string;
};

const PERIOD_MS: Record<AnalyticsPeriod, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

const ISSUE_MODEL: Partial<Record<Intent, { label: string; destination: string; recommendation: string }>> = {
  deposit_withdrawal: { label: "Deposit & withdrawal", destination: "Payments Operations", recommendation: "Review gateway, bank-settlement, and transaction-status exceptions." },
  promotion_bonus: { label: "Promotions & turnover", destination: "CRM & Promotions", recommendation: "Clarify eligibility, contribution rates, expiry, and turnover details." },
  game_support: { label: "Game & round issues", destination: "Game Operations", recommendation: "Review provider errors, round disputes, and service-status patterns." },
  troubleshooting: { label: "Technical troubleshooting", destination: "Technical Support", recommendation: "Prioritize recurring device, browser, and connection failure patterns." },
  privacy_security: { label: "Security & privacy", destination: "Security & Risk", recommendation: "Investigate unauthorized-access and account-protection signals." },
  complaint: { label: "Complaints", destination: "Customer Experience", recommendation: "Audit repeated complaint themes and improve service recovery guidance." },
  identity_documents: { label: "Identity verification", destination: "Security & Risk", recommendation: "Review verification failures and protected-document handling paths." },
  refund_cancellation: { label: "Refund & cancellation", destination: "Finance Operations", recommendation: "Review exception reasons and clarify cancellation or refund policy." },
  billing_payment: { label: "Billing & payment", destination: "Finance Operations", recommendation: "Reconcile disputed charges and payment-failure reasons." },
  request_status: { label: "Request status", destination: "Customer Support Operations", recommendation: "Improve status visibility and reduce repeat contacts." },
  account_onboarding: { label: "Account & onboarding", destination: "Customer Support Operations", recommendation: "Simplify verification and account-recovery instructions." },
  product_usage: { label: "General usage", destination: "Customer Support Operations", recommendation: "Expand self-service guidance for common usage questions." },
  unknown: { label: "Unclassified", destination: "AI Quality & Knowledge", recommendation: "Review unmatched language and add missing intent or knowledge coverage." },
};

const eventStore: SupportEvent[] = [];
const reportStore: Array<{ reportId: string; period: AnalyticsPeriod; createdAt: string; recipients: string[] }> = [];
let eventSequence = 0;

function issueModel(intent: Intent) {
  return ISSUE_MODEL[intent] ?? ISSUE_MODEL.unknown!;
}

function seedDemoHistory(now = Date.now()) {
  if (eventStore.length > 0) return;
  const patterns: Array<{ intent: Intent; count: number; escalationEvery: number; risk: RiskLevel }> = [
    { intent: "deposit_withdrawal", count: 38, escalationEvery: 4, risk: "MEDIUM" },
    { intent: "promotion_bonus", count: 27, escalationEvery: 12, risk: "LOW" },
    { intent: "game_support", count: 20, escalationEvery: 6, risk: "LOW" },
    { intent: "troubleshooting", count: 14, escalationEvery: 7, risk: "LOW" },
    { intent: "complaint", count: 9, escalationEvery: 2, risk: "MEDIUM" },
    { intent: "privacy_security", count: 5, escalationEvery: 1, risk: "HIGH" },
    { intent: "identity_documents", count: 4, escalationEvery: 1, risk: "HIGH" },
    { intent: "unknown", count: 3, escalationEvery: 1, risk: "MEDIUM" },
  ];
  for (const pattern of patterns) {
    for (let index = 0; index < pattern.count; index += 1) {
      const daysAgo = (index * 7 + pattern.count) % 30;
      const hoursAgo = (index * 5 + pattern.count) % 24;
      eventStore.push({
        id: `DEMO-EVT-${String(++eventSequence).padStart(5, "0")}`,
        occurredAt: new Date(now - daysAgo * 86_400_000 - hoursAgo * 3_600_000).toISOString(),
        intent: pattern.intent,
        risk: pattern.risk,
        decision: index % pattern.escalationEvery === 0 ? "ESCALATE" : "AUTO_RESPOND",
        language: index % 5 === 0 ? "en" : "th",
        destination: issueModel(pattern.intent).destination,
      });
    }
  }
}

export function recordSupportEvent(trace: SupportTrace, now = Date.now()): SupportEvent {
  seedDemoHistory(now);
  const event: SupportEvent = {
    id: `DEMO-EVT-${String(++eventSequence).padStart(5, "0")}`,
    occurredAt: new Date(now).toISOString(),
    intent: trace.intent,
    risk: trace.risk,
    decision: trace.decision,
    language: trace.language,
    destination: issueModel(trace.intent).destination,
  };
  eventStore.push(event);
  if (eventStore.length > 5_000) eventStore.splice(0, eventStore.length - 5_000);
  return event;
}

function countByIntent(events: SupportEvent[]) {
  const counts = new Map<Intent, number>();
  for (const event of events) counts.set(event.intent, (counts.get(event.intent) ?? 0) + 1);
  return counts;
}

export function buildSupportAnalytics(period: AnalyticsPeriod, now = Date.now()) {
  seedDemoHistory(now);
  const windowMs = PERIOD_MS[period];
  const currentStart = now - windowMs;
  const previousStart = currentStart - windowMs;
  const current = eventStore.filter((event) => Date.parse(event.occurredAt) >= currentStart);
  const previous = eventStore.filter((event) => {
    const timestamp = Date.parse(event.occurredAt);
    return timestamp >= previousStart && timestamp < currentStart;
  });
  const currentCounts = countByIntent(current);
  const previousCounts = countByIntent(previous);
  const issues: IssueMetric[] = [...currentCounts.entries()]
    .map(([intent, count]) => {
      const model = issueModel(intent);
      const previousCount = previousCounts.get(intent) ?? 0;
      return {
        intent,
        label: model.label,
        count,
        share: current.length ? Number(((count / current.length) * 100).toFixed(1)) : 0,
        previousCount,
        change: previousCount ? Number((((count - previousCount) / previousCount) * 100).toFixed(1)) : count ? 100 : 0,
        destination: model.destination,
        recommendation: model.recommendation,
      };
    })
    .sort((left, right) => right.count - left.count);
  const escalated = current.filter((event) => event.decision === "ESCALATE").length;
  const autoResponded = current.length - escalated;
  const trendDays = period === "day" ? 1 : period === "week" ? 7 : 30;
  const trend = Array.from({ length: trendDays }, (_, index) => {
    const dayStart = new Date(now - (trendDays - index - 1) * 86_400_000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + 86_400_000;
    return {
      date: dayStart.toISOString().slice(0, 10),
      count: current.filter((event) => {
        const timestamp = Date.parse(event.occurredAt);
        return timestamp >= dayStart.getTime() && timestamp < dayEnd;
      }).length,
    };
  });
  return {
    simulated: true,
    period,
    generatedAt: new Date(now).toISOString(),
    window: { from: new Date(currentStart).toISOString(), to: new Date(now).toISOString() },
    source: { type: "bounded-in-memory-demo-events", retainedEvents: eventStore.length, containsCustomerText: false, containsCustomerIdentifiers: false },
    metrics: {
      totalInteractions: current.length,
      autoResponded,
      escalated,
      automationRate: current.length ? Number(((autoResponded / current.length) * 100).toFixed(1)) : 0,
      topIssue: issues[0]?.label ?? "No events",
    },
    issues,
    trend,
  };
}

export function dispatchSimulatedAnalyticsReport(period: AnalyticsPeriod, now = Date.now()) {
  const analytics = buildSupportAnalytics(period, now);
  const recipients = [...new Set(analytics.issues.slice(0, 5).map((issue) => issue.destination))];
  const report = {
    success: true,
    simulated: true,
    reportId: `DEMO-RPT-${period.toUpperCase()}-${new Date(now).toISOString().slice(0, 10).replace(/-/g, "")}`,
    status: "QUEUED" as const,
    period,
    createdAt: new Date(now).toISOString(),
    recipients,
    topIssue: analytics.metrics.topIssue,
    recommendations: analytics.issues.slice(0, 5).map(({ destination, recommendation }) => ({ destination, recommendation })),
  };
  reportStore.push({ reportId: report.reportId, period, createdAt: report.createdAt, recipients });
  if (reportStore.length > 50) reportStore.shift();
  return report;
}

export function resetSupportAnalyticsForTests() {
  eventStore.length = 0;
  reportStore.length = 0;
  eventSequence = 0;
}
