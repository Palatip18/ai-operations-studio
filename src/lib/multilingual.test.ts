import { describe, expect, it } from "vitest";
import { detectLanguage, localizedEscalation, normalizeLocally } from "./multilingual";

describe("multilingual support", () => {
  it("detects English, Thai, and Chinese", () => {
    expect(detectLanguage("How do I create an account?")).toBe("en");
    expect(detectLanguage("ฉันสมัครบัญชีอย่างไร")).toBe("th");
    expect(detectLanguage("如何创建账户？")).toBe("zh");
  });

  it("normalizes common Thai support intents and risks", () => {
    expect(normalizeLocally("ฉันสมัครบัญชีอย่างไร", "th")).toContain("create a new account");
    expect(normalizeLocally("ฉันต้องการโต้แย้งรายการที่ไม่ได้ทำ", "th")).toContain("dispute unauthorized charge");
    expect(normalizeLocally("บัญชีอาจถูกบุกรุก", "th")).toContain("compromised security breach");
  });

  it("normalizes common Chinese support intents and risks", () => {
    expect(normalizeLocally("如何创建账户？", "zh")).toContain("create a new account");
    expect(normalizeLocally("这是未经授权的交易，我要争议", "zh")).toContain("dispute unauthorized charge");
    expect(normalizeLocally("我的账户可能被入侵", "zh")).toContain("compromised security breach");
  });

  it("provides localized deterministic escalation messages", () => {
    expect(localizedEscalation("th", "review")).toContain("ส่งต่อ");
    expect(localizedEscalation("zh", "review")).toContain("人工客服");
  });
});
