import { describe, expect, it } from "vitest";
import { searchKnowledge } from "./knowledge";

describe("searchKnowledge", () => {
  it("ranks the expense policy for an expense query", () => {
    expect(searchKnowledge("expense claim receipt")[0]?.document.id).toBe("expense-policy");
  });
  it("returns no result for unrelated terms", () => {
    expect(searchKnowledge("astronomy telescope galaxy")).toEqual([]);
  });
});
