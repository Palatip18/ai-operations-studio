import { describe, expect, it } from "vitest";
import { detectLanguage, normalizeLocally } from "./multilingual";

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
    expect(normalizeLocally("ฝากเงินแล้วเครดิตไม่เข้า", "th")).toContain("deposit not credited");
    expect(normalizeLocally("ถอนสำเร็จแต่เงินไม่เข้า", "th")).toContain("withdrawal completed money not received");
    expect(normalizeLocally("โปรโมชั่นสมาชิกใหม่มีเทิร์นโอเวอร์เท่าไร", "th")).toContain("promotion bonus");
    expect(normalizeLocally("เกมค้างและยอดเงินไม่อัปเดต", "th")).toContain("game round provider");
  });

  it("normalizes common Chinese support intents and risks", () => {
    expect(normalizeLocally("如何创建账户？", "zh")).toContain("create a new account");
    expect(normalizeLocally("这是未经授权的交易，我要争议", "zh")).toContain("dispute unauthorized charge");
    expect(normalizeLocally("我的账户可能被入侵", "zh")).toContain("compromised security breach");
    expect(normalizeLocally("存款未到账", "zh")).toContain("deposit not credited");
    expect(normalizeLocally("提款完成但未到账", "zh")).toContain("withdrawal completed money not received");
    expect(normalizeLocally("新会员促销的流水要求是什么", "zh")).toContain("promotion bonus");
    expect(normalizeLocally("游戏卡住且余额未更新", "zh")).toContain("game round provider");
  });

  it("keeps canonical product-purpose hints in Thai and Chinese local normalization", () => {
    expect(normalizeLocally("ระบบนี้สร้างมาทำไม", "th")).toContain("product purpose");
    expect(normalizeLocally("为什么要创建这个系统？", "zh")).toContain("product purpose");
  });
});
