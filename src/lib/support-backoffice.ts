export type TransactionKind = "DEPOSIT" | "WITHDRAWAL";
export type TransactionStatus = "PENDING" | "PROCESSING" | "CREDITED" | "COMPLETED" | "REJECTED" | "NOT_FOUND" | "NEEDS_REFERENCE";

export type BackofficeTransactionResult = {
  simulated: true;
  found: boolean;
  reference: string | null;
  kind: TransactionKind | null;
  status: TransactionStatus;
  amount?: number;
  currency?: "THB";
  updatedAt?: string;
  safeReason?: string;
  reviewRequired: boolean;
};

type TransactionRecord = Omit<BackofficeTransactionResult, "simulated" | "found" | "reviewRequired">;

const transactions = new Map<string, TransactionRecord>([
  ["DEP-1001", { reference: "DEP-1001", kind: "DEPOSIT", status: "PENDING", amount: 500, currency: "THB", updatedAt: "2026-07-13T01:05:00.000Z", safeReason: "Payment gateway verification is still in progress." }],
  ["DEP-1002", { reference: "DEP-1002", kind: "DEPOSIT", status: "CREDITED", amount: 1_000, currency: "THB", updatedAt: "2026-07-13T01:12:00.000Z", safeReason: "The back-office ledger shows the deposit as credited." }],
  ["WDL-2001", { reference: "WDL-2001", kind: "WITHDRAWAL", status: "PROCESSING", amount: 800, currency: "THB", updatedAt: "2026-07-13T01:18:00.000Z", safeReason: "The withdrawal is still within the simulated processing queue." }],
  ["WDL-2002", { reference: "WDL-2002", kind: "WITHDRAWAL", status: "COMPLETED", amount: 1_200, currency: "THB", updatedAt: "2026-07-13T01:22:00.000Z", safeReason: "The back-office ledger shows the withdrawal as completed." }],
  ["WDL-2003", { reference: "WDL-2003", kind: "WITHDRAWAL", status: "REJECTED", amount: 600, currency: "THB", updatedAt: "2026-07-13T01:25:00.000Z", safeReason: "The fictional promotion turnover requirement is not complete." }],
]);

const MISSING_FUNDS = /not (?:arrived|received|credited)|missing|ไม่เข้า|ยังไม่เข้า|未到账|没有到账/i;

export function lookupSimulatedTransaction(message: string): BackofficeTransactionResult {
  const reference = message.toUpperCase().match(/\b(?:DEP|WDL)-\d{4}\b/)?.[0] ?? null;
  if (!reference) {
    return { simulated: true, found: false, reference: null, kind: null, status: "NEEDS_REFERENCE", reviewRequired: false };
  }

  const record = transactions.get(reference);
  if (!record) {
    return { simulated: true, found: false, reference, kind: reference.startsWith("DEP") ? "DEPOSIT" : "WITHDRAWAL", status: "NOT_FOUND", safeReason: "No matching transaction was found in the simulated back-office dataset.", reviewRequired: true };
  }

  const ledgerSaysComplete = record.status === "CREDITED" || record.status === "COMPLETED";
  return { simulated: true, found: true, ...record, reviewRequired: ledgerSaysComplete && MISSING_FUNDS.test(message) };
}

export function composeTransactionStatusReply(result: BackofficeTransactionResult, locale: string): string {
  if (result.status === "NEEDS_REFERENCE") {
    if (locale === "th") return "ขอหมายเลขอ้างอิงรายการก่อนนะครับ เช่น DEP-1001 สำหรับฝากเงิน หรือ WDL-2001 สำหรับถอนเงิน โดยไม่ต้องส่งเลขบัญชีเต็ม รหัสผ่าน หรือ OTP";
    if (locale === "zh") return "请先提供交易编号，例如存款 DEP-1001 或提款 WDL-2001。请勿发送完整银行账号、密码或 OTP。";
    return "Please provide the transaction reference first, such as DEP-1001 for a deposit or WDL-2001 for a withdrawal. Do not send a full bank-account number, password, or OTP.";
  }
  if (result.status === "NOT_FOUND") {
    if (locale === "th") return `ไม่พบรายการ ${result.reference} ในระบบหลังบ้านจำลอง ระบบจึงสร้างเคสจำลองเพื่อตรวจสอบเลขอ้างอิงนี้เพิ่มเติมครับ`;
    if (locale === "zh") return `模拟后台未找到交易 ${result.reference}，系统已创建模拟审核工单以进一步核实该编号。`;
    return `Transaction ${result.reference} was not found in the simulated back office, so a demo review case has been created to verify the reference.`;
  }
  const status = `${result.reference} · ${result.status}`;
  if (result.reviewRequired) {
    if (locale === "th") return `ตรวจพบรายการ ${status} แต่สถานะหลังบ้านไม่ตรงกับข้อมูลที่แจ้ง ระบบจึงสร้างเคสจำลองสำหรับตรวจสอบธุรกรรมเพิ่มเติมครับ`;
    if (locale === "zh") return `已找到交易 ${status}，但后台状态与您报告的情况不一致，因此系统已创建模拟交易审核工单。`;
    return `Transaction ${status} was found, but the back-office status conflicts with the reported outcome, so a simulated transaction-review case has been created.`;
  }
  if (locale === "th") return `ตรวจพบรายการ ${status} ในระบบหลังบ้านจำลองครับ ${result.safeReason ?? "รายการกำลังดำเนินการตามสถานะที่แสดง"}`;
  if (locale === "zh") return `已在模拟后台找到交易 ${status}。${result.safeReason ?? "交易正按所示状态处理。"}`;
  return `Transaction ${status} was found in the simulated back office. ${result.safeReason ?? "It is progressing according to the displayed status."}`;
}

