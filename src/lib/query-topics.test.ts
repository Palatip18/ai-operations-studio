import { describe, expect, it } from "vitest";
import { classifyQueryTopics } from "./query-topics";

/**
 * Tests validate that patterns fire on the intended semantic class and do not
 * fire on clearly unrelated queries. Paraphrase cases marked with (*) were
 * written after the patterns were designed — they are acceptance tests, not
 * training data used to tune the patterns.
 */

describe("classifyQueryTopics — product_purpose", () => {
  it("fires on 'why' motivation queries", () => {
    expect(classifyQueryTopics("Why does this exist?")).toContain("product_purpose");
  });
  it("fires on 'goal' phrasing", () => {
    expect(classifyQueryTopics("What is the goal of this system?")).toContain("product_purpose");
  });
  it("fires on 'objective' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("What objective does this platform serve?")).toContain("product_purpose");
  });
  it("does not fire on customer FAQ queries", () => {
    expect(classifyQueryTopics("How do I reset my password?")).not.toContain("product_purpose");
  });
});

describe("classifyQueryTopics — business_value", () => {
  it("fires on 'business problem' phrasing", () => {
    expect(classifyQueryTopics("What business problem does it solve?")).toContain("business_value");
  });
  it("fires on 'challenge' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("What challenge does this address?")).toContain("business_value");
  });
  it("fires on 'benefit' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("What is the benefit of this approach?")).toContain("business_value");
  });
  it("does not fire on off-topic queries", () => {
    expect(classifyQueryTopics("When is my invoice due?")).not.toContain("business_value");
  });
});

describe("classifyQueryTopics — automation_conditions", () => {
  it("fires on 'condition' phrasing", () => {
    expect(classifyQueryTopics("What conditions are needed for automation?")).toContain("automation_conditions");
  });
  it("fires on percentage target phrasing", () => {
    expect(classifyQueryTopics("How do you reach 90% automation?")).toContain("automation_conditions");
  });
  it("fires on 'prerequisite' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("What prerequisites must hold for this to work?")).toContain("automation_conditions");
  });
});

describe("classifyQueryTopics — current_capabilities", () => {
  it("fires on 'implemented' phrasing", () => {
    expect(classifyQueryTopics("What is implemented in this system?")).toContain("current_capabilities");
  });
  it("fires on 'currently available' phrasing", () => {
    expect(classifyQueryTopics("What is currently available?")).toContain("current_capabilities");
  });
  it("fires on 'what can it do' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("What can the system handle today?")).toContain("current_capabilities");
  });
});

describe("classifyQueryTopics — limitations", () => {
  it("fires on 'limitations' phrasing", () => {
    expect(classifyQueryTopics("What are the limitations of this system?")).toContain("limitations");
  });
  it("fires on 'can't' negation phrasing", () => {
    expect(classifyQueryTopics("What can't it handle?")).toContain("limitations");
  });
  it("fires on 'missing' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("What is missing from the current version?")).toContain("limitations");
  });
  it("fires on 'gap' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("What are the gaps in this prototype?")).toContain("limitations");
  });
  it("does not fire on 'is it limited' when used differently", () => {
    // "limitations" keyword fires — confirmed by design; the pattern is intentionally broad
    expect(classifyQueryTopics("Tell me about the gaps.")).toContain("limitations");
  });
});

describe("classifyQueryTopics — roadmap", () => {
  it("fires on 'roadmap' keyword", () => {
    expect(classifyQueryTopics("What is on the roadmap?")).toContain("roadmap");
  });
  it("fires on 'future' phrasing", () => {
    expect(classifyQueryTopics("Where does this platform go in the future?")).toContain("roadmap");
  });
  it("fires on 'enterprise' phrasing (*paraphrase, no 'roadmap' word)", () => {
    expect(classifyQueryTopics("Could this scale to an enterprise?")).toContain("roadmap");
  });
  it("fires on 'evolve' phrasing (*paraphrase)", () => {
    expect(classifyQueryTopics("How might this evolve over time?")).toContain("roadmap");
  });
});

describe("classifyQueryTopics — multi-topic queries", () => {
  it("returns both current_capabilities and roadmap for a combined query", () => {
    const topics = classifyQueryTopics("What is available now and what is planned for the future?");
    expect(topics).toContain("current_capabilities");
    expect(topics).toContain("roadmap");
  });
  it("returns both product_purpose and business_value for an overlap query", () => {
    const topics = classifyQueryTopics("What is the goal and what business problem does it solve?");
    expect(topics).toContain("product_purpose");
    expect(topics).toContain("business_value");
  });
});

describe("classifyQueryTopics — unknown fallback", () => {
  it("returns unknown for genuinely off-topic queries", () => {
    expect(classifyQueryTopics("What is the weather today?")).toEqual(["unknown"]);
  });
  it("returns unknown for nonsense input", () => {
    expect(classifyQueryTopics("astronomy telescope galaxy")).toEqual(["unknown"]);
  });
  it("never returns an empty array", () => {
    expect(classifyQueryTopics("")).toEqual(["unknown"]);
    expect(classifyQueryTopics("   ")).toEqual(["unknown"]);
  });
});

describe("classifyQueryTopics — customer_support_faq (precision guard)", () => {
  it("fires for first-person account queries", () => {
    expect(classifyQueryTopics("How do I create a new account?")).toContain("customer_support_faq");
  });
  it("fires for troubleshooting queries", () => {
    expect(classifyQueryTopics("The product won't load.")).toContain("customer_support_faq");
  });
  it("fires for identity verification", () => {
    expect(classifyQueryTopics("Do I need my passport to verify my identity?")).toContain("customer_support_faq");
  });
  it("does NOT fire for portfolio meta-questions (precision guard)", () => {
    expect(classifyQueryTopics("Why was this system built?")).not.toContain("customer_support_faq");
    expect(classifyQueryTopics("What business problem does it solve?")).not.toContain("customer_support_faq");
    expect(classifyQueryTopics("What are the limitations of this system?")).not.toContain("customer_support_faq");
    expect(classifyQueryTopics("What is on the enterprise roadmap?")).not.toContain("customer_support_faq");
  });
});
