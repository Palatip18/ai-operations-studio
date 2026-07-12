import { searchKnowledge } from "./knowledge";

export const evaluationCases = [
  { query: "When must expense claims be submitted?", expected: "expense-policy" },
  { query: "How quickly is a severe incident acknowledged?", expected: "incident-playbook" },
  { query: "When is the new starter security training due?", expected: "remote-onboarding" },
];

export function evaluateRetrieval() {
  const results = evaluationCases.map((testCase) => {
    const topResult = searchKnowledge(testCase.query, 1)[0];
    return { ...testCase, actual: topResult?.document.id ?? null, passed: topResult?.document.id === testCase.expected };
  });
  const passed = results.filter((result) => result.passed).length;
  return { total: results.length, passed, top1Accuracy: passed / results.length, results };
}
