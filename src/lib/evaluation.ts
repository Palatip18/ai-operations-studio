import { searchKnowledge, searchKnowledgeSemanticBatch } from "./knowledge";

export const evaluationCases = [
  { query: "When must expense claims be submitted?", expected: "expense-policy" },
  { query: "How quickly is a severe incident acknowledged?", expected: "incident-playbook" },
  { query: "When is the new starter security training due?", expected: "remote-onboarding" },
];

export const semanticEvaluationCases: { query: string; expected: string | null }[] = [
  { query: "How long after a purchase can I request reimbursement?", expected: "expense-policy" },
  { query: "Who signs off a costly claim?", expected: "expense-policy" },
  { query: "What proof must accompany a reimbursement request?", expected: "expense-policy" },
  { query: "How quickly should staff react to a critical outage?", expected: "incident-playbook" },
  { query: "How often are updates shared during a severe service disruption?", expected: "incident-playbook" },
  { query: "When should the post-incident review happen?", expected: "incident-playbook" },
  { query: "What is the cyber training deadline for a new hire?", expected: "remote-onboarding" },
  { query: "How often does a new starter meet their buddy in week one?", expected: "remote-onboarding" },
  { query: "When does the manager follow up after the first month?", expected: "remote-onboarding" },
  { query: "How many annual leave days does an employee receive?", expected: null },
];

export function evaluateRetrieval() {
  const results = evaluationCases.map((testCase) => {
    const topResult = searchKnowledge(testCase.query, 1)[0];
    return { ...testCase, actual: topResult?.document.id ?? null, passed: topResult?.document.id === testCase.expected };
  });
  const passed = results.filter((result) => result.passed).length;
  return { total: results.length, passed, top1Accuracy: passed / results.length, results };
}

export async function evaluateSemanticRetrieval() {
  const retrievals = await searchKnowledgeSemanticBatch(semanticEvaluationCases.map((testCase) => testCase.query), 1);
  const results = semanticEvaluationCases.map((testCase, index) => {
    const retrieval = retrievals[index];
    const topResult = retrieval.results[0];
    const actual = topResult?.document.id ?? null;
    return { ...testCase, actual, score: topResult?.score ?? null, passed: actual === testCase.expected, mode: retrieval.mode, model: retrieval.model };
  });
  const passed = results.filter((result) => result.passed).length;
  return { total: results.length, passed, top1Accuracy: passed / results.length, results };
}
