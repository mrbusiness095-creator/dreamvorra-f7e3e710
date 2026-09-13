import { createServerFn } from "@tanstack/react-start";

export const PAYMENT_AMOUNT = 14500;
export const PAYMENT_CURRENCY = "TZS";
export const ZONMPAY_WEBHOOK_PATH = "/api/zonmpay/webhook";

const ZONMPAY_BASE = "https://zonmpay.com/api";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return `255${digits}`;
}

function requireApiKey() {
  const key = process.env.ZONMPAY_API_KEY;
  if (!key) throw new Error("ZONMPAY_API_KEY haijawekwa kwenye Netlify Environment Variables.");
  return key;
}

function providerUrl() {
  return process.env.ZONMPAY_BASE_URL || ZONMPAY_BASE;
}

function callbackUrl() {
  return process.env.ZONMPAY_WEBHOOK_URL || "https://dreamvorra.site/api/zonmpay/webhook";
}

export const startZonmPayPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; buyerName: string; buyerEmail: string; channel?: string }) => {
    const digits = (input?.phone ?? "").replace(/\D/g, "");
    if (digits.length < 9) throw new Error("Namba ya simu si sahihi.");
    if (!input?.buyerName?.trim() || !input?.buyerEmail?.trim()) {
      throw new Error("Taarifa za akaunti hazijakamilika.");
    }
    return {
      phone: digits,
      buyerName: input.buyerName.trim(),
      buyerEmail: input.buyerEmail.trim(),
      channel: (input.channel || "MPESA").toUpperCase(),
    };
  })
  .handler(async ({ data }) => {
    const apiKey = requireApiKey();
    const msisdn = normalizePhone(data.phone);
    const reference = `DV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    };
    if (process.env.ZONMPAY_API_SECRET) headers["X-API-SECRET"] = process.env.ZONMPAY_API_SECRET;
    if (process.env.ZONMPAY_MERCHANT_ID) headers["X-MERCHANT-ID"] = process.env.ZONMPAY_MERCHANT_ID;

    const response = await fetch(`${providerUrl()}/v1/collections/ussd-push`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        msisdn,
        amount: PAYMENT_AMOUNT,
        currency: PAYMENT_CURRENCY,
        channel: data.channel,
        reference,
        callback_url: callbackUrl(),
      }),
    });

    const json = (await response.json().catch(() => null)) as
      | { status?: string; message?: string; data?: Record<string, unknown>; order_id?: string; reference?: string }
      | null;

    if (!response.ok) {
      throw new Error(json?.message || `ZonmPay imerudisha HTTP ${response.status}.`);
    }

    const providerStatus = String(json?.status ?? json?.data?.status ?? "PENDING").toUpperCase();
    const dataRecord = json?.data ?? {};
    const orderId = String(dataRecord.order_id ?? json?.order_id ?? "");
    const providerReference = String(dataRecord.reference ?? json?.reference ?? reference);

    if (["FAILED", "ERROR", "REJECTED", "DECLINED"].includes(providerStatus)) {
      throw new Error(json?.message || "Ombi la USSD Push limekataliwa na ZonmPay.");
    }

    return {
      orderId,
      reference: providerReference,
      status: providerStatus,
      message: json?.message || "USSD Push imetumwa kwenye simu yako. Thibitisha kwa PIN yako.",
    };
  });
