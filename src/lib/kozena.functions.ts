import { createServerFn } from "@tanstack/react-start";

export const PAYMENT_AMOUNT = 14500;
export const PAYMENT_CURRENCY = "TZS";

const MOBILIPA_BASE = "https://api.mobilipa.store";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return `255${digits}`;
}

/** Create a Mobilipa order and trigger the USSD push to the customer's phone. */
export const startPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; buyerName: string; buyerEmail: string }) => {
    const digits = (input?.phone ?? "").replace(/\D/g, "");
    if (digits.length < 9) throw new Error("Namba ya simu si sahihi.");
    if (!input?.buyerName?.trim() || !input?.buyerEmail?.trim()) {
      throw new Error("Taarifa za akaunti hazijakamilika.");
    }
    return {
      phone: digits,
      buyerName: input.buyerName.trim(),
      buyerEmail: input.buyerEmail.trim(),
    };
  })
  .handler(async ({ data }) => {
    const msisdn = normalizePhone(data.phone);
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) throw new Error("MOBILIPA_API_KEY haijawekwa kwenye mazingira ya server.");

    const res = await fetch(`${MOBILIPA_BASE}/v1/payment/create_order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        buyer_email: data.buyerEmail,
        buyer_name: data.buyerName,
        buyer_phone: msisdn,
        amount: PAYMENT_AMOUNT,
        currency: PAYMENT_CURRENCY,
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | { status?: string; message?: string; data?: Record<string, unknown> }
      | null;

    if (!res.ok || json?.status !== "success" || !json?.data) {
      throw new Error(json?.message ?? "Imeshindikana kutuma ombi la malipo. Jaribu tena.");
    }

    return {
      order_id: String(json.data["order_id"] ?? ""),
      reference: json.data["reference"] ? String(json.data["reference"]) : null,
      message: json.message ?? "Push USSD imetumwa kwenye simu yako.",
    };
  });

/** Poll Mobilipa for the order status and unlock the dashboard when it completes. */
export const checkPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("Order id inahitajika.");
    return { orderId: input.orderId };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["MOBILIPA_API_KEY"];
    if (!apiKey) throw new Error("MOBILIPA_API_KEY haijawekwa kwenye mazingira ya server.");

    const res = await fetch(`${MOBILIPA_BASE}/v1/payment/check_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ order_id: data.orderId }),
    });

    const json = (await res.json().catch(() => null)) as
      | { status?: string; message?: string; data?: Record<string, unknown> }
      | null;

    return {
      payment_status: String(json?.data?.["payment_status"] ?? "PENDING").toUpperCase(),
      transid: json?.data?.["transid"] ? String(json.data["transid"]) : null,
      message: json?.message ?? null,
    };
  });
