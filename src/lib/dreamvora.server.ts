import { createServerFn } from "@tanstack/react-start";
import postgres from "postgres";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { PAYMENT_AMOUNT } from "./kozena.functions";

const LIPA_NUMBER = "354136248";
const AUTH_SECRET = process.env.DREAMVORA_AUTH_SECRET;

function db() {
  // Netlify Database exposes NETLIFY_DB_URL. Keep compatibility with older
  // deployments that used NETLIFY_DATABASE_URL or a generic DATABASE_URL.
  const url =
    process.env.NETLIFY_DB_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Database haijaunganishwa. Weka NETLIFY_DB_URL kwenye Netlify Environment Variables kisha redeploy site."
    );
  }
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
      earnings INTEGER NOT NULL DEFAULT 0,
      account_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE dreamvora_users ADD COLUMN IF NOT EXISTS earnings INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE dreamvora_users ADD COLUMN IF NOT EXISTS account_active BOOLEAN NOT NULL DEFAULT TRUE`;
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_chat_earnings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES dreamvora_users(id) ON DELETE CASCADE,
      chat_key TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Older deployments may already have dreamvora_chat_earnings plus a database
  // trigger/function that expects a `name` column. Keep that legacy table
  // compatible even though new rewards are written to dreamvora_chat_rewards.
  // This migration is intentionally additive and does not delete old data.
  await sql`ALTER TABLE dreamvora_chat_earnings ADD COLUMN IF NOT EXISTS name TEXT`;
  await sql`
    UPDATE dreamvora_chat_earnings e
    SET name = u.name
    FROM dreamvora_users u
    WHERE e.user_id = u.id AND (e.name IS NULL OR e.name = '')
  `;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_chat_earnings_user_idx ON dreamvora_chat_earnings(user_id, created_at DESC)`;
  // Use a dedicated reward ledger for completed chats. This intentionally does
  // not depend on the legacy dreamvora_chat_earnings table, which may exist
  // in older deployments with a different schema or database trigger.
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_chat_rewards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES dreamvora_users(id) ON DELETE CASCADE,
      chat_key TEXT NOT NULL UNIQUE,
      person_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 10,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_chat_rewards_user_idx ON dreamvora_chat_rewards(user_id, created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES dreamvora_users(id) ON DELETE CASCADE,
      phone_used TEXT NOT NULL,
      amount INTEGER NOT NULL,
      lipa_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      rejected_at TIMESTAMPTZ,
      transid TEXT
    )
  `;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS balance_credited BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`UPDATE dreamvora_payments p SET balance_credited = TRUE FROM dreamvora_users u WHERE p.user_id = u.id AND p.status = 'APPROVED' AND u.paid = TRUE AND p.balance_credited = FALSE`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_payments_status_idx ON dreamvora_payments(status)`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_payments_user_idx ON dreamvora_payments(user_id, submitted_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_notification_reads (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL REFERENCES dreamvora_notifications(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES dreamvora_users(id) ON DELETE CASCADE,
      dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(notification_id, user_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_notifications_active_idx ON dreamvora_notifications(active, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_notification_reads_user_idx ON dreamvora_notification_reads(user_id, notification_id)`;
  await sql`ALTER TABLE dreamvora_users ADD COLUMN IF NOT EXISTS payment_pending BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE dreamvora_users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TZS'`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'ZONMPAY'`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS provider_order_id TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS reference TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS channel TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS provider_status TEXT`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE dreamvora_payments ADD COLUMN IF NOT EXISTS metadata JSONB`;
  await sql`ALTER TABLE dreamvora_payments ALTER COLUMN lipa_number DROP NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_payments_provider_order_idx ON dreamvora_payments(provider_order_id)`;

}

function requireSecret() {
  if (AUTH_SECRET && AUTH_SECRET.length >= 32) return AUTH_SECRET;
  // Backward-compatible fallback for deployments that already have the admin
  // password configured but lost the separate auth-secret variable.
  const adminPassword = process.env.DREAMVORA_ADMIN_PASSWORD;
  if (adminPassword && adminPassword.length >= 8) {
    return createHmac("sha256", adminPassword).update("dreamvora-auth-v1").digest("hex");
  }
  throw new Error(
    "Authentication configuration haijakamilika. Weka DREAMVORA_AUTH_SECRET (angalau herufi 32) kwenye Netlify Environment Variables."
  );
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function tokenFor(subject: string, kind: "user" | "admin") {
  const secret = requireSecret();
  const payload = `${kind}:${subject}:${Date.now() + 5 * 60 * 1000}`;
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string, kind: "user" | "admin") {
  const secret = requireSecret();
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Session haipo sahihi.");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Session si sahihi.");
  }
  const raw = Buffer.from(body, "base64url").toString("utf8");
  const [tokenKind, subject, expiry] = raw.split(":");
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
  const rows = await sql`
    SELECT id, name, username, phone, email, country, paid, account_active, payment_pending, balance, earnings
    FROM dreamvora_users WHERE id = ${userId} LIMIT 1
  `;
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
      const existing = await sql`SELECT id FROM dreamvora_users WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${email}) LIMIT 1`;
      if (existing[0]) throw new Error("Username au email tayari imetumika.");
      const id = randomUUID();
      await sql`
        INSERT INTO dreamvora_users (id, name, username, phone, email, country, password_hash)
        VALUES (${id}, ${data.name.trim()}, ${username}, ${phone}, ${email}, ${data.country}, ${hashPassword(data.password)})
      `;
      return { token: tokenFor(id, "user"), account: { id, name: data.name.trim(), username, phone, email, country: data.country, paid: false, accountActive: true, paymentPending: false, balance: 0, earnings: 0 } };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const loginDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`SELECT id, name, username, phone, email, country, password_hash, paid, account_active, balance, earnings FROM dreamvora_users WHERE LOWER(username) = LOWER(${data.username.trim()}) LIMIT 1`;
      const user = rows[0];
      if (!user || !verifyPassword(data.password, String(user.password_hash))) throw new Error("Username au password si sahihi.");
      if (!Boolean(user.account_active)) throw new Error("Akaunti yako imezimwa na admin. Wasiliana na support.");
      return { token: tokenFor(String(user.id), "user"), account: { id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, country: user.country, paid: Boolean(user.paid), accountActive: Boolean(user.account_active), paymentPending: Boolean(user.payment_pending), balance: Number(user.balance), earnings: Number(user.earnings ?? 0) } };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const getDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      const pendingRows = await sql`SELECT provider_order_id FROM dreamvora_payments WHERE user_id=${user.id} AND provider='AUTOMATIC' AND status='PUSH_SENT' ORDER BY submitted_at DESC LIMIT 1`;
      return { token: tokenFor(String(user.id), "user"), account: {
        id: String(user.id), name: String(user.name), username: String(user.username), phone: String(user.phone),
        email: String(user.email), country: String(user.country), paid: Boolean(user.paid), accountActive: Boolean(user.account_active),
        paymentPending: Boolean(user.payment_pending),
        paymentPendingOrderId: pendingRows[0]?.provider_order_id ? String(pendingRows[0].provider_order_id) : undefined,
        balance: Number(user.balance), earnings: Number(user.earnings ?? 0)
      } };
    }
    finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const recordDreamVoraChatEarning = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; chatKey: string; amount: number; personName?: string; messageCount?: number }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      const amount = Math.floor(Number(data.amount));
      const chatKey = data.chatKey.trim();
      const personName = String(data.personName ?? "Foreigner").trim().slice(0, 100) || "Foreigner";
      const messageCount = Math.max(1, Math.min(100, Math.floor(Number(data.messageCount ?? 10))));
      if (!Boolean(user.paid) || !Boolean(user.account_active)) throw new Error("Akaunti yako haijawezeshwa.");
      if (!chatKey || !Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error("Malipo ya chat si sahihi.");
      if (messageCount < 10) throw new Error("Chat haijakamilika.");

      const result = await sql.begin(async (tx) => {
        // Insert the completion record first. The unique chat_key makes the
        // operation idempotent even if the browser retries after a timeout.
        const inserted = await tx`
          INSERT INTO dreamvora_chat_rewards (id, user_id, chat_key, person_name, amount, message_count)
          VALUES (${randomUUID()}, ${user.id}, ${chatKey}, ${personName}, ${amount}, ${messageCount})
          ON CONFLICT (chat_key) DO NOTHING
          RETURNING id
        `;

        if (inserted[0]) {
          await tx`
            UPDATE dreamvora_users
            SET earnings = COALESCE(earnings, 0) + ${amount},
                balance = COALESCE(balance, 0) + ${amount}
            WHERE id = ${user.id}
          `;
        }

        const rows = await tx`
          SELECT balance, earnings
          FROM dreamvora_users
          WHERE id = ${user.id}
          LIMIT 1
        `;
        if (!rows[0]) throw new Error("Akaunti haijapatikana baada ya malipo.");
        return {
          added: Boolean(inserted[0]),
          rewardId: inserted[0] ? String(inserted[0].id) : null,
          balance: Number(rows[0].balance ?? 0),
          earnings: Number(rows[0].earnings ?? 0),
        };
      });

      return {
        ok: true,
        added: result.added,
        rewardId: result.rewardId,
        amount,
        balance: result.balance,
        earnings: result.earnings,
      };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const getDreamVoraNotifications = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      const rows = await sql`
        SELECT n.id, n.title, n.message, n.created_at
        FROM dreamvora_notifications n
        LEFT JOIN dreamvora_notification_reads r
          ON r.notification_id = n.id AND r.user_id = ${user.id}
        WHERE n.active = TRUE AND r.id IS NULL
        ORDER BY n.created_at DESC
        LIMIT 10
      `;
      return { notifications: rows.map((r) => ({ id: String(r.id), title: String(r.title), message: String(r.message), createdAt: String(r.created_at) })) };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const dismissDreamVoraNotification = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; notificationId: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      await sql`
        INSERT INTO dreamvora_notification_reads (id, notification_id, user_id)
        VALUES (${randomUUID()}, ${data.notificationId}, ${user.id})
        ON CONFLICT (notification_id, user_id) DO NOTHING
      `;
      return { ok: true };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const submitDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; phoneUsed: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      if (Boolean(user.paid)) return { status: "APPROVED", message: "Akaunti yako tayari imeidhinishwa." };
      const phoneUsed = cleanPhone(data.phoneUsed);
      const pending = await sql`SELECT id FROM dreamvora_payments WHERE user_id = ${user.id} AND status = 'PENDING' ORDER BY submitted_at DESC LIMIT 1`;
      if (pending[0]) return { status: "PENDING", paymentId: pending[0].id, message: "Ombi lako tayari lipo kwenye ukaguzi." };
      const paymentId = randomUUID();
      await sql`INSERT INTO dreamvora_payments (id, user_id, phone_used, amount, lipa_number) VALUES (${paymentId}, ${user.id}, ${phoneUsed}, ${PAYMENT_AMOUNT}, ${LIPA_NUMBER})`;
      return { status: "PENDING", paymentId, message: "Ombi limepokelewa. Subiri uthibitisho wa malipo." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });


export const createAutomaticPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; phone: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      if (Boolean(user.paid)) return { status: "SUCCESS", orderId: null, message: "Akaunti yako tayari iko active." };
      const phone = cleanPhone(data.phone).replace("+", "");
      const apiKey = process.env.FIMIPAY_API_KEY;
      if (!apiKey) throw new Error("Automatic payment haijawekwa kwenye server.");
      const res = await fetch("https://fimipay.com/api/v1/payment/create_order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "DreamVora/1.0",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          buyer_email: user.email,
          buyer_name: user.name,
          buyer_phone: phone,
          amount: PAYMENT_AMOUNT,
          currency: "TZS",
          payment_method: "mobile",
        }),
      });
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const nested = body?.data && typeof body.data === "object" ? body.data as Record<string, unknown> : null;
      if (!res.ok || String(body?.status ?? "").toLowerCase() !== "success") {
        throw new Error(String(body?.message ?? "Automatic payment haikuanza. Jaribu tena."));
      }
      const orderId = String(nested?.order_id ?? body?.order_id ?? "");
      if (!orderId) throw new Error("Order haikupatikana. Jaribu tena.");
      const existing = await sql`SELECT id FROM dreamvora_payments WHERE provider_order_id=${orderId} LIMIT 1`;
      if (!existing[0]) {
        await sql`
          INSERT INTO dreamvora_payments
            (id,user_id,phone_used,amount,currency,provider,provider_order_id,channel,status,provider_status,metadata)
          VALUES
            (${randomUUID()},${user.id},${cleanPhone(data.phone)},${PAYMENT_AMOUNT},'TZS','AUTOMATIC',${orderId},'mobile','PUSH_SENT',
             ${String(nested?.payment_status ?? "PENDING")},${JSON.stringify(body)}::jsonb)
        `;
      }
      await sql`UPDATE dreamvora_users SET payment_pending=TRUE WHERE id=${user.id}`;
      return { status: "PENDING", orderId, message: "Ombi la malipo limetumwa kwenye simu yako." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const checkAutomaticPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; orderId: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      if (Boolean(user.paid)) return { status: "SUCCESS" };
      const rows = await sql`SELECT id,status FROM dreamvora_payments WHERE user_id=${user.id} AND provider='AUTOMATIC' AND provider_order_id=${data.orderId} LIMIT 1`;
      if (!rows[0]) throw new Error("Ombi la malipo halijapatikana.");
      const apiKey = process.env.FIMIPAY_API_KEY;
      if (!apiKey) throw new Error("Automatic payment haijawekwa kwenye server.");
      const res = await fetch("https://fimipay.com/api/v1/payment/order_status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "DreamVora/1.0",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ order_id: data.orderId }),
      });
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) throw new Error(String(body?.message ?? "Status ya malipo haijapatikana."));
      const nested = body?.data && typeof body.data === "object" ? body.data as Record<string, unknown> : null;
      const status = String(nested?.payment_status ?? nested?.status ?? body?.payment_status ?? "PENDING").toUpperCase();
      const transid = nested?.transid ? String(nested.transid) : null;
      const failed = ["CANCELLED","USERCANCELLED","REJECTED","FAILED","DECLINED","INSUFFICIENT_FUNDS"].includes(status);
      if (status === "SUCCESS") {
        await sql`UPDATE dreamvora_payments SET status='APPROVED',provider_status=${status},transid=COALESCE(${transid},transid),confirmed_at=NOW(),approved_at=NOW(),metadata=${JSON.stringify(body)}::jsonb WHERE id=${rows[0].id}`;
        await sql`UPDATE dreamvora_users SET paid=TRUE,payment_pending=FALSE,activated_at=NOW() WHERE id=${user.id}`;
        return { status: "SUCCESS" };
      }
      if (failed) {
        await sql`UPDATE dreamvora_payments SET status='FAILED',provider_status=${status},transid=COALESCE(${transid},transid),metadata=${JSON.stringify(body)}::jsonb WHERE id=${rows[0].id}`;
        await sql`UPDATE dreamvora_users SET payment_pending=FALSE WHERE id=${user.id}`;
        return { status: "FAILED" };
      }
      await sql`UPDATE dreamvora_payments SET provider_status=${status},metadata=${JSON.stringify(body)}::jsonb WHERE id=${rows[0].id}`;
      return { status };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const checkDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      const rows = await sql`SELECT id, status, submitted_at, approved_at, rejected_at FROM dreamvora_payments WHERE user_id = ${user.id} ORDER BY submitted_at DESC LIMIT 1`;
      const payment = rows[0];
      return { status: Boolean(user.paid) ? "APPROVED" : String(payment?.status ?? "NONE"), paymentId: payment?.id ?? null, message: Boolean(user.paid) ? "Malipo yameidhinishwa." : "Bado tunasubiri uthibitisho." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });



export const getPublicDreamVoraPayments = createServerFn({ method: "POST" })
  .inputValidator((input: { limit?: number }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const limit = Math.min(Math.max(Number(data.limit ?? 20), 1), 50);
      const rows = await sql`
        SELECT p.id, p.amount, p.approved_at, u.name, u.country
        FROM dreamvora_payments p
        JOIN dreamvora_users u ON u.id = p.user_id
        WHERE p.status = 'APPROVED' AND p.approved_at IS NOT NULL
        ORDER BY p.approved_at DESC
        LIMIT ${limit}
      `;
      return {
        payments: rows.map((r) => ({
          id: String(r.id),
          name: String(r.name).split(/\s+/)[0],
          country: String(r.country || "TZ").toUpperCase(),
          amount: Number(r.amount),
          approvedAt: String(r.approved_at),
        })),
      };
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  });

export const adminLoginDreamVora = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }) => {
    const adminPassword = process.env.DREAMVORA_ADMIN_PASSWORD;
    if (!adminPassword || data.password !== adminPassword) throw new Error("Password ya admin si sahihi.");
    return { token: tokenFor("admin", "admin") };
  });

export const adminListDreamVoraNotifications = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`
        SELECT id, title, message, active, created_at
        FROM dreamvora_notifications
        ORDER BY created_at DESC
        LIMIT 100
      `;
      return { notifications: rows.map((r) => ({ id: String(r.id), title: String(r.title), message: String(r.message), active: Boolean(r.active), createdAt: String(r.created_at) })) };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminCreateDreamVoraNotification = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; title: string; message: string }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const title = data.title.trim();
    const message = data.message.trim();
    if (!title || !message) throw new Error("Weka kichwa na ujumbe wa notification.");
    if (title.length > 100) throw new Error("Kichwa cha notification ni kirefu sana.");
    if (message.length > 500) throw new Error("Ujumbe wa notification ni mrefu sana.");
    const sql = db();
    try {
      await ensureSchema(sql);
      const id = randomUUID();
      await sql`INSERT INTO dreamvora_notifications (id, title, message) VALUES (${id}, ${title}, ${message})`;
      return { ok: true, id };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminListDreamVoraPayments = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`
        SELECT p.id, p.phone_used, p.amount, p.lipa_number, p.status, p.submitted_at, p.approved_at, p.balance_credited,
               u.id AS user_id, u.name, u.username, u.phone AS account_phone, u.email,
               u.paid AS account_paid, u.account_active AS account_active, u.balance AS account_balance, u.earnings AS account_earnings
        FROM dreamvora_payments p JOIN dreamvora_users u ON u.id = p.user_id
        ORDER BY CASE WHEN p.status = 'PENDING' THEN 0 ELSE 1 END, p.submitted_at DESC LIMIT 200
      `;
      return { payments: rows.map((r) => ({ ...r, amount: Number(r.amount), submitted_at: String(r.submitted_at), approved_at: r.approved_at ? String(r.approved_at) : null })) };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminSetDreamVoraPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; paymentId: string; status: "APPROVED" | "REJECTED" }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);

      if (data.status === "REJECTED") {
        const rejected = await sql.begin(async (tx) => {
          const rows = await tx`
            SELECT id, user_id, status
            FROM dreamvora_payments
            WHERE id = ${data.paymentId}
            FOR UPDATE
          `;
          const payment = rows[0];
          if (!payment) throw new Error("Malipo hayajapatikana.");
          if (String(payment.status) === "APPROVED") {
            throw new Error("Malipo hayawezi ku-reject baada ya ku-approve.");
          }
          await tx`
            UPDATE dreamvora_payments
            SET status = 'REJECTED', rejected_at = NOW()
            WHERE id = ${data.paymentId}
          `;
          return payment;
        });
        return { ok: true, activated: false, status: "REJECTED", paymentId: data.paymentId, userId: String(rejected.user_id) };
      }

      // APPROVE is deliberately handled as a server-side, idempotent activation.
      // The payment row is locked first; the account is then activated and the
      // payment amount is credited exactly once using balance_credited.
      const result = await sql.begin(async (tx) => {
        const rows = await tx`
          SELECT id, user_id, amount, status, balance_credited
          FROM dreamvora_payments
          WHERE id = ${data.paymentId}
          FOR UPDATE
        `;
        const payment = rows[0];
        if (!payment) throw new Error("Malipo hayajapatikana.");
        if (String(payment.status) === "REJECTED") {
          // Allow admin to correct a previous rejection by approving again.
        }

        const amount = Number(payment.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Kiasi cha malipo si sahihi.");

        const userRows = await tx`
          SELECT id, name, username, phone, email, country, paid, balance, earnings
          FROM dreamvora_users
          WHERE id = ${payment.user_id}
          FOR UPDATE
        `;
        const user = userRows[0];
        if (!user) throw new Error("Akaunti ya user haijapatikana.");

        const alreadyCredited = Boolean(payment.balance_credited);
        const nextBalance = Number(user.balance) + (alreadyCredited ? 0 : amount);

        const activated = await tx`
          UPDATE dreamvora_users
          SET paid = TRUE,
              account_active = TRUE,
              payment_pending = FALSE,
              balance = ${nextBalance}
          WHERE id = ${payment.user_id}
          RETURNING id, name, username, phone, email, country, paid, balance, earnings
        `;
        if (!activated[0] || !Boolean(activated[0].paid)) {
          throw new Error("Activation ya account imeshindikana.");
        }

        await tx`
          UPDATE dreamvora_payments
          SET status = 'APPROVED',
              approved_at = COALESCE(approved_at, NOW()),
              rejected_at = NULL,
              balance_credited = TRUE
          WHERE id = ${data.paymentId}
        `;

        // Any other pending payment for the same user is no longer actionable.
        await tx`
          UPDATE dreamvora_payments
          SET status = 'REJECTED', rejected_at = COALESCE(rejected_at, NOW())
          WHERE user_id = ${payment.user_id}
            AND id <> ${data.paymentId}
            AND status = 'PENDING'
        `;

        return activated[0];
      });

      return {
        ok: true,
        activated: true,
        status: "APPROVED",
        paymentId: data.paymentId,
        account: {
          ...result,
          id: String(result.id),
          paid: Boolean(result.paid),
          balance: Number(result.balance),
          earnings: Number(result.earnings ?? 0),
        },
      };
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  });


export const adminListDreamVoraUsers = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`
        SELECT id, name, username, phone, email, country, paid, account_active, balance, earnings, created_at
        FROM dreamvora_users
        ORDER BY created_at DESC LIMIT 300
      `;
      return { users: rows.map((r) => ({
        id: String(r.id), name: String(r.name), username: String(r.username), phone: String(r.phone),
        email: String(r.email), country: String(r.country), paid: Boolean(r.paid), accountActive: Boolean(r.account_active),
        balance: Number(r.balance ?? 0), earnings: Number(r.earnings ?? 0), createdAt: String(r.created_at)
      })) };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminSetDreamVoraAccountActive = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; userId: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    verifyToken(data.token, "admin");
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`
        UPDATE dreamvora_users SET account_active=${data.active}
        WHERE id=${data.userId}
        RETURNING id, paid, account_active
      `;
      if (!rows[0]) throw new Error("User hakupatikana.");
      return { ok: true, userId: String(rows[0].id), paid: Boolean(rows[0].paid), accountActive: Boolean(rows[0].account_active) };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export { LIPA_NUMBER };
