import { createHash } from "node:crypto";

export type SlipVerificationStatus = "VERIFIED" | "REJECTED" | "DUPLICATE";

export type SlipVerificationResult = {
  simulated: true;
  status: SlipVerificationStatus;
  slipReference: string;
  extracted: {
    amount: number | null;
    currency: "THB";
    transferReference: string | null;
    destinationAccount: string | null;
  };
  confidence: number;
  checks: { imageFormat: boolean; amountPresent: boolean; referencePresent: boolean; duplicate: boolean };
  reason: string;
};

export type DepositReconciliationResult = {
  simulated: true;
  accepted: boolean;
  status: "MATCHED_PENDING_CREDIT" | "NOT_SENT";
  backofficeReference?: string;
  customerUserId: string;
  idempotent: boolean;
};

const reconciliationCache = new Map<string, DepositReconciliationResult>();

function isSupportedImage(bytes: Uint8Array, mimeType: string) {
  const png = mimeType === "image/png" && bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = mimeType === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return png || jpeg;
}

/**
 * Portfolio-only deterministic slip scanner. It validates the actual image
 * signature, hashes the bytes, and produces fictional extracted fields. It
 * does not claim to be bank OCR or validate a real transfer.
 */
export function verifySimulatedSlip(input: { fileName: string; mimeType: string; bytes: Uint8Array }): SlipVerificationResult {
  const digest = createHash("sha256").update(input.bytes).digest("hex").toUpperCase();
  const imageFormat = isSupportedImage(input.bytes, input.mimeType);
  const duplicate = /duplicate/i.test(input.fileName);
  const forcedInvalid = /invalid|rejected/i.test(input.fileName);
  const amountMatch = input.fileName.match(/amount[-_ ]?(\d{2,6})/i);
  const amount = imageFormat ? Number(amountMatch?.[1] ?? 1000) : null;
  const transferReference = imageFormat ? `SIM-TXN-${digest.slice(0, 10)}` : null;
  const status: SlipVerificationStatus = duplicate ? "DUPLICATE" : !imageFormat || forcedInvalid ? "REJECTED" : "VERIFIED";
  return {
    simulated: true,
    status,
    slipReference: `SLIP-${digest.slice(0, 10)}`,
    extracted: { amount, currency: "THB", transferReference, destinationAccount: imageFormat ? "XXX-X-X4321-X" : null },
    confidence: status === "VERIFIED" ? 0.94 : status === "DUPLICATE" ? 0.99 : 0.18,
    checks: { imageFormat, amountPresent: amount !== null, referencePresent: transferReference !== null, duplicate },
    reason: status === "VERIFIED" ? "Simulated image and required fields passed validation." : status === "DUPLICATE" ? "This demo slip hash was marked as already submitted." : "The file could not be validated as a supported deposit-slip image.",
  };
}

export function reconcileVerifiedSlip(verification: SlipVerificationResult, customerUserId: string): DepositReconciliationResult {
  if (verification.status !== "VERIFIED") return { simulated: true, accepted: false, status: "NOT_SENT", customerUserId, idempotent: false };
  const key = `${customerUserId}:${verification.slipReference}`;
  const cached = reconciliationCache.get(key);
  if (cached) return { ...cached, idempotent: true };
  const result: DepositReconciliationResult = {
    simulated: true,
    accepted: true,
    status: "MATCHED_PENDING_CREDIT",
    backofficeReference: `DEP-SLIP-${verification.slipReference.slice(-8)}`,
    customerUserId,
    idempotent: false,
  };
  reconciliationCache.set(key, result);
  return { ...result };
}

export function resetSlipReconciliationForTests() {
  reconciliationCache.clear();
}

