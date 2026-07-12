import { describe, expect, it } from "vitest";
import { uiCopy } from "./ui-i18n";

describe("trilingual UI catalog", () => {
  it("keeps identical keys across English, Thai, and Chinese", () => {
    const keys = Object.keys(uiCopy.en).sort();
    expect(Object.keys(uiCopy.th).sort()).toEqual(keys);
    expect(Object.keys(uiCopy.zh).sort()).toEqual(keys);
  });

  it("has four focused modules, three metrics, and eight scenarios per language", () => {
    for (const locale of ["en", "th", "zh"] as const) {
      expect(uiCopy[locale].modules).toHaveLength(4);
      expect(uiCopy[locale].stats).toHaveLength(3);
      expect(uiCopy[locale].scenarios).toHaveLength(8);
    }
  });

  it("contains native script in Thai and Chinese primary copy", () => {
    expect(uiCopy.th.hero).toMatch(/\p{Script=Thai}/u);
    expect(uiCopy.th.chatIntro).toMatch(/\p{Script=Thai}/u);
    expect(uiCopy.zh.hero).toMatch(/\p{Script=Han}/u);
    expect(uiCopy.zh.chatIntro).toMatch(/\p{Script=Han}/u);
  });
});
