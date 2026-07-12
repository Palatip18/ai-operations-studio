import { describe, expect, it } from "vitest";
import { executeTool, routeTool } from "./tools";

describe("tool routing", () => {
  it("routes policy questions to retrieval", () => expect(routeTool("What is the expense policy?")?.name).toBe("search_knowledge"));
  it("routes workflow requests to the workflow tool", () => expect(routeTool("Create a high priority equipment workflow")?.name).toBe("preview_workflow"));
  it("exposes evaluation results", () => expect(executeTool("get_demo_metrics", {}).trace.resultCount).toBe(3));
});
