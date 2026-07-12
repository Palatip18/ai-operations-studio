import { beforeEach, describe, expect, it } from "vitest";
import { reconcileVerifiedSlip, resetSlipReconciliationForTests, verifySimulatedSlip } from "./support-slip";

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe("simulated deposit-slip verification", () => {
  beforeEach(() => resetSlipReconciliationForTests());

  it("extracts fictional structured fields from a supported image", () => {
    const result = verifySimulatedSlip({ fileName: "deposit-amount-1500.png", mimeType: "image/png", bytes: pngBytes });
    expect(result).toMatchObject({ status: "VERIFIED", simulated: true, extracted: { amount: 1500, currency: "THB" } });
  });

  it("rejects content whose bytes do not match the declared image type", () => {
    const result = verifySimulatedSlip({ fileName: "slip.png", mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]) });
    expect(result.status).toBe("REJECTED");
  });

  it("does not send rejected or duplicate slips to reconciliation", () => {
    const rejected = verifySimulatedSlip({ fileName: "invalid.png", mimeType: "image/png", bytes: pngBytes });
    expect(reconcileVerifiedSlip(rejected, "USER-RAY01").status).toBe("NOT_SENT");
  });

  it("sends a verified slip once and returns an idempotent result on retry", () => {
    const verified = verifySimulatedSlip({ fileName: "slip.png", mimeType: "image/png", bytes: pngBytes });
    const first = reconcileVerifiedSlip(verified, "USER-RAY01");
    const second = reconcileVerifiedSlip(verified, "USER-RAY01");
    expect(first).toMatchObject({ accepted: true, status: "MATCHED_PENDING_CREDIT", idempotent: false });
    expect(second.backofficeReference).toBe(first.backofficeReference);
    expect(second.idempotent).toBe(true);
  });
});
