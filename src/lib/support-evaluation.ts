import { classifyIntent, classifyRisk, type Intent, type RiskLevel } from "./support-classification";
import { runSupportAgent, type SupportDecision } from "./support-agent";

/**
 * Fictional customer-support evaluation dataset (35 cases: 20 normal + 5
 * paraphrased + 5 insufficient-evidence + 5 mandatory-escalation). All
 * figures below describe behavior on this included dataset only — they are
 * not a claim of accuracy on real customer traffic, and 80-90% automation is
 * a controlled-pilot target, not a measured result of this small dataset.
 */

export type SupportCase = {
  message: string;
  expectedIntent: Intent;
  expectedRisk: RiskLevel;
  expectedDecision: SupportDecision;
  expectedDocId: string | null;
  group: "normal" | "paraphrase" | "insufficient_evidence" | "mandatory_escalation";
};

export const supportCases: SupportCase[] = [
  // -- normal (20) --
  { message: "How do I create a new account?", expectedIntent: "account_onboarding", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "onboarding-faq", group: "normal" },
  { message: "What are the setup steps to get started after signing up?", expectedIntent: "account_onboarding", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "onboarding-faq", group: "normal" },
  { message: "How do I use the reports feature in the dashboard?", expectedIntent: "product_usage", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "product-usage-guidance", group: "normal" },
  { message: "How does inviting a teammate to my account work?", expectedIntent: "product_usage", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "product-usage-guidance", group: "normal" },
  { message: "Where is my support request right now?", expectedIntent: "request_status", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "request-status-guidance", group: "normal" },
  { message: "Can you give me an update on my request status?", expectedIntent: "request_status", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "request-status-guidance", group: "normal" },
  { message: "When is my invoice issued each month?", expectedIntent: "billing_payment", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "billing-payment-faq", group: "normal" },
  { message: "What payment methods do you accept for billing?", expectedIntent: "billing_payment", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "billing-payment-faq", group: "normal" },
  { message: "How do I cancel my subscription?", expectedIntent: "refund_cancellation", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "refund-cancellation-policy", group: "normal" },
  { message: "Can I get a refund if I cancel this month?", expectedIntent: "refund_cancellation", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "refund-cancellation-policy", group: "normal" },
  { message: "The product won't load, what should I do?", expectedIntent: "troubleshooting", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "troubleshooting-guide", group: "normal" },
  { message: "I can't log in, what should I check first?", expectedIntent: "troubleshooting", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "troubleshooting-guide", group: "normal" },
  { message: "What documents do I need to verify my identity?", expectedIntent: "identity_documents", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "identity-document-requirements", group: "normal" },
  { message: "Do you need my passport for account recovery?", expectedIntent: "identity_documents", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: "identity-document-requirements", group: "normal" },
  { message: "How do I request a copy of my personal data?", expectedIntent: "privacy_security", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: "privacy-security-guidance", group: "normal" },
  { message: "What is your privacy policy about handling my data?", expectedIntent: "privacy_security", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: "privacy-security-guidance", group: "normal" },
  { message: "I am disappointed with the service I received recently.", expectedIntent: "complaint", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "complaints-escalation-policy", group: "normal" },
  { message: "I'm not very happy with my recent experience, can you help?", expectedIntent: "complaint", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "complaints-escalation-policy", group: "normal" },
  { message: "Why was this system built?", expectedIntent: "unknown", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "product-vision", group: "normal" },
  { message: "How far could this platform be developed in the future?", expectedIntent: "unknown", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "enterprise-roadmap", group: "normal" },

  // -- paraphrased (5) --
  { message: "Can you show me how to use the reporting tool?", expectedIntent: "product_usage", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "product-usage-guidance", group: "paraphrase" },
  { message: "I'd like to stop my subscription, how do I do that?", expectedIntent: "refund_cancellation", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "refund-cancellation-policy", group: "paraphrase" },
  { message: "The app is not loading at all for me right now.", expectedIntent: "troubleshooting", expectedRisk: "LOW", expectedDecision: "AUTO_RESPOND", expectedDocId: "troubleshooting-guide", group: "paraphrase" },
  { message: "On what date do you send my monthly invoice?", expectedIntent: "billing_payment", expectedRisk: "MEDIUM", expectedDecision: "AUTO_RESPOND", expectedDocId: "billing-payment-faq", group: "paraphrase" },
  { message: "I want a copy of all the personal information you hold about me.", expectedIntent: "privacy_security", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: "privacy-security-guidance", group: "paraphrase" },

  // -- insufficient evidence (5) --
  { message: "Do you offer a native mobile app for iOS and Android?", expectedIntent: "unknown", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: null, group: "insufficient_evidence" },
  { message: "Can I pay my invoice using cryptocurrency?", expectedIntent: "billing_payment", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: null, group: "insufficient_evidence" },
  { message: "Do you support hardware security key multi-factor authentication?", expectedIntent: "unknown", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: null, group: "insufficient_evidence" },
  { message: "What is the maximum file size I can upload to a report?", expectedIntent: "unknown", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: null, group: "insufficient_evidence" },
  { message: "Do you offer student or non-profit discount pricing?", expectedIntent: "billing_payment", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: null, group: "insufficient_evidence" },

  // -- mandatory escalation (5) --
  { message: "I was charged twice, this is an unauthorized charge and I want it disputed immediately.", expectedIntent: "billing_payment", expectedRisk: "HIGH", expectedDecision: "ESCALATE", expectedDocId: null, group: "mandatory_escalation" },
  { message: "Someone hacked my account, I think there was a security breach.", expectedIntent: "privacy_security", expectedRisk: "HIGH", expectedDecision: "ESCALATE", expectedDocId: null, group: "mandatory_escalation" },
  { message: "I need to submit my passport for identity verification, please process it now.", expectedIntent: "identity_documents", expectedRisk: "MEDIUM", expectedDecision: "ESCALATE", expectedDocId: null, group: "mandatory_escalation" },
  { message: "This is unacceptable, I'm furious and I will report you online if this isn't fixed.", expectedIntent: "complaint", expectedRisk: "HIGH", expectedDecision: "ESCALATE", expectedDocId: null, group: "mandatory_escalation" },
  { message: "Can you make an exception and waive your refund policy for me just this once?", expectedIntent: "refund_cancellation", expectedRisk: "HIGH", expectedDecision: "ESCALATE", expectedDocId: null, group: "mandatory_escalation" },
];

export function evaluateIntentAccuracy() {
  const results = supportCases.map((c) => ({ message: c.message, expected: c.expectedIntent, actual: classifyIntent(c.message), passed: classifyIntent(c.message) === c.expectedIntent }));
  const passed = results.filter((r) => r.passed).length;
  return { total: results.length, passed, accuracy: passed / results.length, results };
}

export function evaluateRiskAccuracy() {
  const results = supportCases.map((c) => {
    const intent = classifyIntent(c.message);
    const actual = classifyRisk(c.message, intent);
    return { message: c.message, expected: c.expectedRisk, actual, passed: actual === c.expectedRisk };
  });
  const passed = results.filter((r) => r.passed).length;
  return { total: results.length, passed, accuracy: passed / results.length, results };
}

async function runAll() {
  const runs: { testCase: SupportCase; result: Awaited<ReturnType<typeof runSupportAgent>> }[] = [];
  for (const testCase of supportCases) runs.push({ testCase, result: await runSupportAgent(testCase.message) });
  return runs;
}

export async function evaluateRetrievalTop1() {
  const runs = await runAll();
  const applicable = runs.filter((r) => r.testCase.expectedDocId !== null);
  const results = applicable.map(({ testCase, result }) => {
    const actual = result.trace.sources[0]?.id ?? null;
    return { message: testCase.message, expected: testCase.expectedDocId, actual, passed: actual === testCase.expectedDocId };
  });
  const passed = results.filter((r) => r.passed).length;
  return { total: results.length, passed, accuracy: results.length ? passed / results.length : null, results };
}

export async function evaluateGroundednessAndNoAnswer() {
  const runs = await runAll();
  const results = runs.map(({ testCase, result }) => ({
    message: testCase.message,
    group: testCase.group,
    grounded: result.trace.verifier.grounded,
    expectNoAnswer: testCase.group === "insufficient_evidence",
  }));
  const groundednessApplicable = results.filter((r) => r.group === "normal" || r.group === "paraphrase");
  const groundednessPassed = groundednessApplicable.filter((r) => r.grounded).length;
  const noAnswerCases = results.filter((r) => r.expectNoAnswer);
  const noAnswerPassed = noAnswerCases.filter((r) => !r.grounded).length;
  return {
    groundednessTotal: groundednessApplicable.length,
    groundednessPassed,
    groundednessAccuracy: groundednessApplicable.length ? groundednessPassed / groundednessApplicable.length : null,
    noAnswerTotal: noAnswerCases.length,
    noAnswerPassed,
    noAnswerAccuracy: noAnswerCases.length ? noAnswerPassed / noAnswerCases.length : null,
  };
}

export async function evaluateToolRoutingAccuracy() {
  const runs = await runAll();
  const results = runs.map(({ testCase, result }) => {
    const expectedWorkflowTool = testCase.expectedIntent === "request_status" || testCase.expectedIntent === "account_onboarding";
    const ranWorkflowTool = result.trace.steps.some((s) => s.tool === "preview_workflow");
    return { message: testCase.message, passed: ranWorkflowTool === expectedWorkflowTool };
  });
  const passed = results.filter((r) => r.passed).length;
  return { total: results.length, passed, accuracy: passed / results.length };
}

export async function evaluateEscalation() {
  const runs = await runAll();
  const results = runs.map(({ testCase, result }) => ({
    message: testCase.message,
    expected: testCase.expectedDecision,
    actual: result.trace.decision,
  }));
  const truePositives = results.filter((r) => r.expected === "ESCALATE" && r.actual === "ESCALATE").length;
  const falsePositives = results.filter((r) => r.expected === "AUTO_RESPOND" && r.actual === "ESCALATE").length;
  const falseNegatives = results.filter((r) => r.expected === "ESCALATE" && r.actual === "AUTO_RESPOND").length;
  const expectedEscalations = results.filter((r) => r.expected === "ESCALATE").length;
  const actualEscalations = results.filter((r) => r.actual === "ESCALATE").length;
  return {
    total: results.length,
    expectedEscalations,
    actualEscalations,
    precision: actualEscalations ? truePositives / actualEscalations : null,
    recall: expectedEscalations ? truePositives / expectedEscalations : null,
    falsePositives,
    falseNegatives,
    results,
  };
}

export async function evaluateResponsePolicyCompliance() {
  const runs = await runAll();
  const results = runs.map(({ testCase, result }) => {
    // Strip out retrieved document chunks (anything inside [doc-id] ... to avoid matching banned terms
    // that are legally part of the fictional operational policy documents).
    const cleanAnswer = result.answer.replace(/\[[a-zA-Z0-9_-]+\][^]*?(?=(?:\[[a-zA-Z0-9_-]+\]|Please let me know|Hello!|I have looked into|Based on|I apologize|สวัสดีครับ|ผมรับทราบเรื่อง|ต้องขออภัย|รับเรื่อง|จากการตรวจสอบ|您好|我理解|对于给您|已为您|根据系统|เข้าใจครับ|ผมได้ประสานงาน|ยินดีที่จะช่วย|รับเรื่องด่วน|ต้องขออภัย|我已将|我很乐意|理解您的|$))/g, "");
    
    // Check for rigid, robotic developer terms in the generated text only
    const hasRoboticTerms = /human agent|เจ้าหน้าที่มนุษย์|mandatory escalation|insufficient evidence|policy decision|high-risk complaint|escalation required/i.test(cleanAnswer);
    
    const compliant = !hasRoboticTerms;
    if (!compliant) {
      console.log(`Compliance failure for case: "${testCase.message}" -> Clean answer: "${cleanAnswer}"`);
    }
    return { message: testCase.message, decision: result.trace.decision, compliant };
  });
  const passed = results.filter((r) => r.compliant).length;
  return { total: results.length, passed, complianceRate: passed / results.length };
}

/**
 * Automation coverage = the proportion of included LOW-risk, answerable
 * (non-insufficient-evidence, non-mandatory-escalation) test cases that were
 * safely handled by AUTO_RESPOND. This is a measurement of the included
 * dataset only, not a claim about real traffic, and is not presented as the
 * 80-90% target — that target requires conditions (see
 * automation-coverage-conditions in the knowledge base) this small fictional
 * dataset does not attempt to demonstrate.
 */
export async function evaluateAutomationCoverage() {
  const runs = await runAll();
  const eligible = runs.filter(({ testCase }) => testCase.expectedRisk === "LOW" && (testCase.group === "normal" || testCase.group === "paraphrase"));
  const autoResponded = eligible.filter(({ result }) => result.trace.decision === "AUTO_RESPOND").length;
  return {
    eligibleCount: eligible.length,
    autoRespondedCount: autoResponded,
    coverage: eligible.length ? autoResponded / eligible.length : null,
    note: "Coverage measures this dataset's low-risk, answerable cases only. It is not a claim about real customer traffic and is not presented as the 80-90% pilot target.",
  };
}

export async function evaluateWorkflowDecisionAccuracy() {
  return evaluateToolRoutingAccuracy();
}

export async function evaluateLatencySummary() {
  const runs = await runAll();
  const samples = runs.map(({ result }) => result.trace.latencyMs);
  return {
    sampleCount: samples.length,
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
    meanMs: Math.round(samples.reduce((sum, v) => sum + v, 0) / samples.length),
  };
}

export async function runSupportEvaluationSuite() {
  const [intent, risk, retrieval, groundedness, toolRouting, escalation, compliance, coverage, latency] = await Promise.all([
    Promise.resolve(evaluateIntentAccuracy()),
    Promise.resolve(evaluateRiskAccuracy()),
    evaluateRetrievalTop1(),
    evaluateGroundednessAndNoAnswer(),
    evaluateToolRoutingAccuracy(),
    evaluateEscalation(),
    evaluateResponsePolicyCompliance(),
    evaluateAutomationCoverage(),
    evaluateLatencySummary(),
  ]);
  return {
    note: "All figures below describe behavior on this repository's small, fictional customer-support evaluation dataset (35 cases) only. They are not a measurement of real customer traffic, and 80-90% automation is a controlled-pilot target, not a result claimed here.",
    datasetSize: supportCases.length,
    intentAccuracy: intent,
    riskAccuracy: risk,
    retrievalTop1: retrieval,
    groundedness,
    toolRoutingAccuracy: toolRouting,
    escalation,
    responsePolicyCompliance: compliance,
    automationCoverage: coverage,
    latency,
  };
}
