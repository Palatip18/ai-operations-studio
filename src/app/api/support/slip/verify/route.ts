import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { readCustomerContext } from "@/lib/support-customer";
import { reconcileVerifiedSlip, verifySimulatedSlip } from "@/lib/support-slip";

const MAX_SLIP_BYTES = 3 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const customer = readCustomerContext(request);
  if (!customer) return NextResponse.json({ error: "Customer verification required." }, { status: 403 });
  const rate = checkRateLimit(request, "support-slip", 8, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo slip limit reached." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const form = await request.formData();
  const slip = form.get("slip");
  if (!(slip instanceof File)) return NextResponse.json({ error: "A slip image is required." }, { status: 400 });
  if (!new Set(["image/png", "image/jpeg"]).has(slip.type)) return NextResponse.json({ error: "Only PNG and JPEG slip images are supported." }, { status: 415 });
  if (slip.size === 0 || slip.size > MAX_SLIP_BYTES) return NextResponse.json({ error: "Slip image must be between 1 byte and 3 MB." }, { status: 413 });

  const bytes = new Uint8Array(await slip.arrayBuffer());
  const verification = verifySimulatedSlip({ fileName: slip.name, mimeType: slip.type, bytes });
  const reconciliation = reconcileVerifiedSlip(verification, customer.userId);
  return NextResponse.json({
    customer: { userId: customer.userId },
    verification,
    reconciliation,
    trace: [
      { tool: "scan_deposit_slip", status: verification.status },
      { tool: "verify_slip_fields", status: verification.status === "VERIFIED" ? "PASSED" : "STOPPED" },
      { tool: "reconcile_deposit_backoffice", status: reconciliation.status },
    ],
    note: "Simulated OCR and reconciliation. The uploaded bytes are processed in memory and are not persisted by this prototype.",
  });
}

