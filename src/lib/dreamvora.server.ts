import { createServerFn } from "@tanstack/react-start";
import postgres from "postgres";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { PAYMENT_AMOUNT } from "./zonmpay.functions";

const AUTH_SECRET = process.env.DREAMVORA_AUTH_SECRET;

function db() {
  const url = process.env.NETLIFY_DB_URL;
  if (!url) throw new Error("NETLIFY_DB_URL haijawekwa. Provision Netlify Database kwanza.");
  return postgres(url, { max: 1, prepare: false });
}

async function ensureSchema(sql: ReturnType<typeof postgres>) {
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      country TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      paid BOOLEAN NOT NULL DEFAULT FALSE,
      balance INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES dreamvora_users(id) ON DELETE CASCADE,
      phone_used TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TZS',
      provider TEXT NOT NULL DEFAULT 'ZONMPAY',
      provider_order_id TEXT,
      reference TEXT,
      channel TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      provider_status TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      rejected_at TIMESTAMPTZ,
      transid TEXT,
      confirmed_at TIMESTAMPTZ
    )
  `;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TZS'`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'ZONMPAY'`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS provider_order_id TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS reference TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS channel TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS provider_status TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_payments_status_idx ON dreamvora_payments(status)`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_payments_user_idx ON dreamvora_payments(user_id, submitted_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_payments_provider_order_idx ON dreamvora_payments(provider_order_id)`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_payments_reference_idx ON dreamvora_payments(reference)`;
}

function requireSecret() {
  if (!AUTH_SECRET || AUTH_SECRET.length < 32) throw new Error("DREAMVORA_AUTH_SECRET lazima iwe na angalau herufi 32.");
  return AUTH_SECRET;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function tokenFor(subject: string, kind: "user" | "admin") {
  const payload = `${kind}:${subject}:${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", requireSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string, kind: "user" | "admin") {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Session haipo sahihi.");
  const expected = createHmac("sha256", requireSecret()).update(body).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Session si sahihi.");
  const [tokenKind, subject, expiry] = Buffer.from(body, "base64url").toString("utf8").split(":");
  if (tokenKind !== kind || !subject || Number(expiry) < Date.now()) throw new Error("Session imekwisha.");
  return subject;
}

function cleanPhone(value: string) {
  const clean = value.replace(/\s+/g, "");
  if (/^\+255\d{9}$/.test(clean)) return clean;
  if (/^255\d{9}$/.test(clean)) return `+${clean}`;
  if (/^0\d{9}$/.test(clean)) return `+255${clean.slice(1)}`;
  throw new Error("Weka namba ya simu ya Tanzania iliyo sahihi.");
}

async function getUserByToken(sql: ReturnType<typeof postgres>, token: string) {
  const userId = verifyToken(token, "user");
  const rows = await sql`SELECT id, name, username, phone, email, country, paid, balance FROM dreamvora_users WHERE id = ${userId} LIMIT 1`;
  if (!rows[0]) throw new Error("Akaunti haijapatikana.");
  return rows[0];
}

export const registerDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; username: string; phone: string; email: string; country: string; password: string }) => input)
  .handler(async ({ data }) => {
    if (!data.name?.trim() || !data.username?.trim() || !data.email?.trim() || !data.country?.trim()) throw new Error("Jaza taarifa zote zinazohitajika.");
    if (data.password.length < 6) throw new Error("Password iwe na angalau herufi 6.");
    const phone = cleanPhone(data.phone);
    const username = data.username.trim();
    const email = data.email.trim().toLowerCase();
    const sql = db();
    try {
      await ensureSchema(sql);
      const existing = await sql`SELECT id, username, email FROM dreamvora_users WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${email}) LIMIT 1`;
      if (existing[0]) {
        const sameUsername = String(existing[0].username ?? "").toLowerCase() === username.toLowerCase();
        const sameEmail = String(existing[0].email ?? "").toLowerCase() === email.toLowerCase();
        if (sameUsername && sameEmail) throw new Error("Username na email tayari zimetumika.");
        if (sameUsername) throw new Error("Username tayari imetumika. Chagua username nyingine.");
        throw new Error("Email tayari imetumika. Tumia email nyingine.");
      }
      const id = randomUUID();
      try {
        await sql`INSERT INTO dreamvora_users (id, name, username, phone, email, country, password_hash) VALUES (${id}, ${data.name.trim()}, ${username}, ${phone}, ${email}, ${data.country}, ${hashPassword(data.password)})`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/unique|duplicate/i.test(message)) throw new Error("Username au email tayari imetumika.");
        throw new Error(`Usajili umeshindikana kuhifadhi taarifa kwenye database: ${message}`);
      }
      return { token: tokenFor(id, "user"), account: { id, name: data.name.trim(), username, phone, email, country: data.country, paid: false, balance: 0 } };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const loginDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`SELECT id, name, username, phone, email, country, password_hash, paid, balance FROM dreamvora_users WHERE LOWER(username) = LOWER(${data.username.trim()}) LIMIT 1`;
      const user = rows[0];
      if (!user || !verifyPassword(data.password, String(user.password_hash))) throw new Error("Username au password si sahihi.");
      return { token: tokenFor(String(user.id), "user"), account: { id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, country: user.country, paid: Boolean(user.paid), balance: Number(user.balance) } };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const getDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try { await ensureSchema(sql); const user = await getUserByToken(sql, data.token); return { account: { ...user, id: String(user.id), balance: Number(user.balance), paid: Boolean(user.paid) } }; }
    finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const createDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; phoneUsed: string; providerOrderId: string; reference: string; channel: string; providerStatus?: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      if (Boolean(user.paid)) return { status: "APPROVED", paymentId: null, message: "Akaunti yako tayari imefunguka." };
      const phoneUsed = cleanPhone(data.phoneUsed);
      const existing = await sql`SELECT id, status FROM dreamvora_payments WHERE provider_order_id = ${data.providerOrderId} OR reference = ${data.reference} ORDER BY submitted_at DESC LIMIT 1`;
      if (existing[0]) return { status: String(existing[0].status), paymentId: String(existing[0].id), message: "Ombi la malipo limesajiliwa." };
      const paymentId = randomUUID();
      await sql`INSERT INTO dreamvora_payments (id, user_id, phone_used, amount, currency, provider, provider_order_id, reference, channel, status, provider_status) VALUES (${paymentId}, ${user.id}, ${phoneUsed}, ${PAYMENT_AMOUNT}, 'TZS', 'ZONMPAY', ${data.providerOrderId || null}, ${data.reference || null}, ${data.channel || null}, 'PUSH_SENT', ${data.providerStatus || 'PENDING'})`;
      return { status: "PUSH_SENT", paymentId, message: "USSD Push imetumwa. Ukishalipia, thibitisha kwa kubonyeza NIMELIPIA." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const confirmDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; paymentId: string; phoneUsed: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      const phoneUsed = cleanPhone(data.phoneUsed);
      const rows = await sql`SELECT id, status, provider_status FROM dreamvora_payments WHERE id = ${data.paymentId} AND user_id = ${user.id} LIMIT 1`;
      const payment = rows[0];
      if (!payment) throw new Error("Ombi la malipo halijapatikana. Anzisha malipo tena.");
      if (Boolean(user.paid)) return { status: "APPROVED", message: "Akaunti yako tayari imefunguka." };
      if (String(payment.status) === "APPROVED") return { status: "APPROVED", message: "Malipo yameidhinishwa." };
      await sql`UPDATE dreamvora_payments SET phone_used = ${phoneUsed}, status = 'PENDING_ADMIN', confirmed_at = NOW() WHERE id = ${data.paymentId}`;
      return { status: "PENDING_ADMIN", message: "Tumepokea uthibitisho wako. Admin ataangalia malipo na kufungua akaunti." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const checkDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      const rows = await sql`SELECT id, status, provider_status, submitted_at, approved_at, rejected_at, transid FROM dreamvora_payments WHERE user_id = ${user.id} ORDER BY submitted_at DESC LIMIT 1`;
      const payment = rows[0];
      const status = Boolean(user.paid) ? "APPROVED" : String(payment?.status ?? "NONE");
      return {
        status,
        paymentId: payment?.id ?? null,
        transid: payment?.transid ? String(payment.transid) : null,
        providerStatus: payment?.provider_status ? String(payment.provider_status) : null,
        message: Boolean(user.paid)
          ? "Malipo yamehakikiwa. Akaunti imefunguka."
          : status === "PENDING_ADMIN"
            ? "Uthibitisho wako umepokelewa. Tunasubiri Admin athibitishe malipo."
            : status === "PUSH_SENT"
              ? "USSD Push imetumwa. Ukishalipia, bonyeza NIMELIPIA."
              : status === "REJECTED" || status === "FAILED"
                ? "Malipo hayajakubaliwa. Unaweza kujaribu tena."
                : "Tunasubiri hatua ya malipo.",
      };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminLoginDreamVora = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }) => {
    const adminPassword = process.env.DREAMVORA_ADMIN_PASSWORD;
    if (!adminPassword || data.password !== adminPassword) throw new Error("Password ya admin si sahihi.");
    return { token: tokenFor("admin", "admin") };
  });

export const adminListDreamVoraPayments = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`SELECT p.id, p.phone_used, p.amount, p.currency, p.provider, p.provider_order_id, p.reference, p.channel, p.status, p.provider_status, p.submitted_at, p.confirmed_at, p.approved_at, p.rejected_at, p.transid, u.id AS user_id, u.name, u.username, u.phone AS account_phone, u.email FROM dreamvora_payments p JOIN dreamvora_users u ON u.id = p.user_id ORDER BY p.submitted_at DESC LIMIT 200`;
      return { payments: rows.map((r) => ({ ...r, amount: Number(r.amount), submitted_at: String(r.submitted_at), confirmed_at: r.confirmed_at ? String(r.confirmed_at) : null, approved_at: r.approved_at ? String(r.approved_at) : null, rejected_at: r.rejected_at ? String(r.rejected_at) : null })) };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminApproveDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; paymentId: string }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`SELECT id, user_id, status FROM dreamvora_payments WHERE id = ${data.paymentId} LIMIT 1`;
      const payment = rows[0];
      if (!payment) throw new Error("Malipo hayajapatikana.");
      if (String(payment.status) !== "PENDING_ADMIN") throw new Error("Admin anaweza ku-approve baada ya user kubonyeza NIMELIPIA.");
      await sql.begin(async (tx) => {
        await tx`UPDATE dreamvora_payments SET status = 'APPROVED', approved_at = NOW(), rejected_at = NULL WHERE id = ${data.paymentId}`;
        await tx`UPDATE dreamvora_payments SET status = 'REJECTED', rejected_at = NOW(), provider_status = COALESCE(provider_status, 'SUPERSEDED') WHERE user_id = ${payment.user_id} AND id <> ${data.paymentId} AND status IN ('PENDING_ADMIN','PUSH_SENT')`;
        await tx`UPDATE dreamvora_users SET paid = TRUE WHERE id = ${payment.user_id}`;
      });
      return { ok: true, status: "APPROVED", message: "Malipo yameidhinishwa. Akaunti imefunguliwa." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminRejectDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; paymentId: string }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`SELECT id FROM dreamvora_payments WHERE id = ${data.paymentId} LIMIT 1`;
      if (!rows[0]) throw new Error("Malipo hayajapatikana.");
      await sql`UPDATE dreamvora_payments SET status = 'REJECTED', rejected_at = NOW() WHERE id = ${data.paymentId}`;
      return { ok: true, status: "REJECTED", message: "Malipo yamekataliwa." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

function findWebhookValue(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const found = record[key];
    if (found !== undefined && found !== null && String(found) !== "") return String(found);
  }
  for (const child of Object.values(record)) {
    const nested = findWebhookValue(child, keys);
    if (nested) return nested;
  }
  return null;
}

export async function applyZonmPayWebhook(payload: unknown) {
  const sql = db();
  try {
    await ensureSchema(sql);
    const status = (findWebhookValue(payload, ["payment_status", "status", "transaction_status", "state"]) ?? "PENDING").toUpperCase();
    const orderId = findWebhookValue(payload, ["order_id", "provider_order_id", "payment_id"]);
    const reference = findWebhookValue(payload, ["reference", "merchant_reference", "order_reference"]);
    const transid = findWebhookValue(payload, ["transid", "transaction_id", "transaction_reference", "txn_id"]);
    const amountRaw = findWebhookValue(payload, ["amount", "paid_amount"]);
    const amount = amountRaw ? Number(amountRaw) : null;
    if (amount !== null && Number.isFinite(amount) && amount !== PAYMENT_AMOUNT) return { ok: false, status: 400, message: "Amount haifanani na DreamVora." };
    if (!orderId && !reference) return { ok: false, status: 400, message: "Webhook haina order_id au reference." };

    const success = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "COMPLETE", "APPROVED"].includes(status);
    const failed = ["FAILED", "FAILURE", "REJECTED", "DECLINED", "CANCELLED", "CANCELED", "INSUFFICIENT_FUNDS", "USER_CANCELLED"].includes(status);
    const rows = await sql`SELECT id, status FROM dreamvora_payments WHERE (${orderId} IS NOT NULL AND provider_order_id = ${orderId}) OR (${reference} IS NOT NULL AND reference = ${reference}) ORDER BY submitted_at DESC LIMIT 1`;
    const payment = rows[0];
    if (!payment) return { ok: false, status: 404, message: "Payment haijapatikana." };

    if (success) {
      // ZonmPay confirmation is recorded, but the account stays locked until Admin approves the user's confirmation.
      await sql`UPDATE dreamvora_payments SET provider_status = ${status}, transid = COALESCE(${transid}, transid) WHERE id = ${payment.id}`;
      return { ok: true, status: 200, message: "Payment provider amethibitisha. Inasubiri approval ya Admin." };
    }
    if (failed) {
      await sql`UPDATE dreamvora_payments SET provider_status = ${status}, status = CASE WHEN status = 'APPROVED' THEN status ELSE 'FAILED' END, transid = COALESCE(${transid}, transid) WHERE id = ${payment.id}`;
      return { ok: true, status: 200, message: "Provider amerudisha payment failed." };
    }
    await sql`UPDATE dreamvora_payments SET provider_status = ${status}, transid = COALESCE(${transid}, transid) WHERE id = ${payment.id}`;
    return { ok: true, status: 200, message: "Provider status imehifadhiwa." };
  } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
}

