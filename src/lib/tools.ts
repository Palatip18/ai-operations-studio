import { searchKnowledge, searchKnowledgeSemantic } from "./knowledge";
import { runWorkflow, type WorkflowRequest } from "./workflow";
import { evaluateRetrieval } from "./evaluation";

export type ToolName = "search_knowledge" | "preview_workflow" | "get_demo_metrics";
export type ToolTrace = { name: ToolName; arguments: Record<string, unknown>; resultCount: number; summary: string };

export const toolDefinitions = [
  { type: "function", function: { name: "search_knowledge", description: "Search fictional operations documents and return grounded passages.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } } },
  { type: "function", function: { name: "preview_workflow", description: "Preview policy steps for a fictional internal request.", parameters: { type: "object", properties: { requester: { type: "string" }, type: { type: "string", enum: ["Software access", "Equipment", "Training"] }, priority: { type: "string", enum: ["Normal", "High"] }, details: { type: "string" } }, required: ["requester", "type", "priority", "details"], additionalProperties: false } } },
  { type: "function", function: { name: "get_demo_metrics", description: "Return automated retrieval evaluation results for this prototype.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
] as const;

export function routeTool(message: string): { name: ToolName; arguments: Record<string, unknown> } | null {
  const lower = message.toLowerCase();
  if (/metric|accuracy|evaluation|quality|score/.test(lower)) return { name: "get_demo_metrics", arguments: {} };
  if (/workflow|access request|equipment|training request/.test(lower)) return { name: "preview_workflow", arguments: { requester: "Demo User", type: lower.includes("equipment") ? "Equipment" : lower.includes("training") ? "Training" : "Software access", priority: lower.includes("high") || lower.includes("urgent") ? "High" : "Normal", details: message } };
  if (/policy|onboard|incident|expense|receipt|security training|claim/.test(lower)) return { name: "search_knowledge", arguments: { query: message } };
  return null;
}

export function executeTool(name: ToolName, args: Record<string, unknown>): { answer: string; trace: ToolTrace } {
  if (name === "search_knowledge") {
    const results = searchKnowledge(String(args.query ?? ""));
    return { answer: results.length ? `Grounded answer: ${results[0].chunk}` : "No grounded answer was found in the sample documents.", trace: { name, arguments: args, resultCount: results.length, summary: results.length ? `Top source: ${results[0].document.title}` : "No source matched" } };
  }
  if (name === "preview_workflow") {
    const steps = runWorkflow(args as unknown as WorkflowRequest);
    return { answer: `Workflow preview created with ${steps.length} auditable steps. ${steps.map((step) => `${step.step}: ${step.detail}`).join(" ")}`, trace: { name, arguments: args, resultCount: steps.length, summary: `${steps.length} workflow steps generated` } };
  }
  const metrics = evaluateRetrieval();
  return { answer: `The current retrieval evaluation passes ${metrics.passed} of ${metrics.total} cases (${Math.round(metrics.top1Accuracy * 100)}% top-1 accuracy) on the small documented sample set.`, trace: { name, arguments: args, resultCount: metrics.total, summary: `${metrics.passed}/${metrics.total} evaluation cases passed` } };
}

export async function executeToolLive(name: ToolName, args: Record<string, unknown>) {
  if (name !== "search_knowledge") return executeTool(name, args);
  const retrieval = await searchKnowledgeSemantic(String(args.query ?? ""));
  const results = retrieval.results;
  return {
    answer: results.length ? `Grounded answer: ${results[0].chunk}` : "No grounded answer was found in the sample documents.",
    trace: {
      name,
      arguments: args,
      resultCount: results.length,
      summary: results.length ? `Top source: ${results[0].document.title} via ${retrieval.model}` : `No source matched via ${retrieval.model}`,
    } satisfies ToolTrace,
  };
}
