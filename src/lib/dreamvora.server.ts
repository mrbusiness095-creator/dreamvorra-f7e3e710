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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE dreamvora_users ADD COLUMN IF NOT EXISTS earnings INTEGER NOT NULL DEFAULT 0`;
  await sql`
    CREATE TABLE IF NOT EXISTS dreamvora_chat_earnings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES dreamvora_users(id) ON DELETE CASCADE,
      chat_key TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_chat_earnings_user_idx ON dreamvora_chat_earnings(user_id, created_at DESC)`;
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
    SELECT id, name, username, phone, email, country, paid, balance, earnings
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
      return { token: tokenFor(id, "user"), account: { id, name: data.name.trim(), username, phone, email, country: data.country, paid: false, balance: 0, earnings: 0 } };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const loginDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const rows = await sql`SELECT id, name, username, phone, email, country, password_hash, paid, balance, earnings FROM dreamvora_users WHERE LOWER(username) = LOWER(${data.username.trim()}) LIMIT 1`;
      const user = rows[0];
      if (!user || !verifyPassword(data.password, String(user.password_hash))) throw new Error("Username au password si sahihi.");
      return { token: tokenFor(String(user.id), "user"), account: { id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, country: user.country, paid: Boolean(user.paid), balance: Number(user.balance), earnings: Number(user.earnings ?? 0) } };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const getDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try { await ensureSchema(sql); const user = await getUserByToken(sql, data.token); return { token: tokenFor(String(user.id), "user"), account: { ...user, id: String(user.id), balance: Number(user.balance), earnings: Number(user.earnings ?? 0), paid: Boolean(user.paid) } }; }
    finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const recordDreamVoraChatEarning = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; chatKey: string; amount: number }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const user = await getUserByToken(sql, data.token);
      const amount = Math.floor(Number(data.amount));
      const chatKey = data.chatKey.trim();
      if (!Boolean(user.paid)) throw new Error("Akaunti haijaidhinishwa.");
      if (!chatKey || !Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error("Malipo ya chat si sahihi.");
      const result = await sql.begin(async (tx) => {
        const inserted = await tx`
          INSERT INTO dreamvora_chat_earnings (id, user_id, chat_key, amount)
          VALUES (${randomUUID()}, ${user.id}, ${chatKey}, ${amount})
          ON CONFLICT (chat_key) DO NOTHING
          RETURNING id
        `;
        if (inserted[0]) {
          await tx`UPDATE dreamvora_users SET earnings = earnings + ${amount}, balance = balance + ${amount} WHERE id = ${user.id}`;
        }
        const rows = await tx`SELECT balance, earnings FROM dreamvora_users WHERE id = ${user.id} LIMIT 1`;
        return { added: Boolean(inserted[0]), balance: Number(rows[0]?.balance ?? 0), earnings: Number(rows[0]?.earnings ?? 0) };
      });
      return { added: result.added, amount, balance: result.balance, earnings: result.earnings };
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
        SELECT p.id, p.phone_used, p.amount, p.lipa_number, p.status, p.submitted_at, p.approved_at,
               u.id AS user_id, u.name, u.username, u.phone AS account_phone, u.email
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
      const rows = await sql`SELECT user_id, status FROM dreamvora_payments WHERE id = ${data.paymentId} LIMIT 1`;
      const payment = rows[0];
      if (!payment) throw new Error("Malipo hayajapatikana.");
      if (data.status === "APPROVED") {
        const result = await sql.begin(async (tx) => {
          // Approving a payment is the single source of truth for activation.
          // Make the operation idempotent so repeated taps cannot credit balance twice.
          const approved = await tx`
            UPDATE dreamvora_payments
            SET status = 'APPROVED', approved_at = COALESCE(approved_at, NOW()), rejected_at = NULL
            WHERE id = ${data.paymentId}
            RETURNING id, user_id, amount
          `;
          if (!approved[0]) throw new Error("Malipo hayajapatikana.");

          await tx`
            UPDATE dreamvora_payments
            SET status = 'REJECTED', rejected_at = NOW()
            WHERE user_id = ${payment.user_id}
              AND id <> ${data.paymentId}
              AND status = 'PENDING'
          `;

          // Only the first approval adds the paid amount to the user's balance.
          const activated = await tx`
            UPDATE dreamvora_users
            SET paid = TRUE, balance = CASE WHEN paid THEN balance ELSE balance + ${payment.amount} END
            WHERE id = ${payment.user_id}
            RETURNING id, name, username, phone, email, country, paid, balance, earnings
          `;
          if (!activated[0]) throw new Error("Akaunti ya user haijapatikana.");
          return activated[0];
        });
        return {
          ok: true,
          activated: Boolean(result?.paid),
          account: result ? { ...result, id: String(result.id), paid: Boolean(result.paid), balance: Number(result.balance), earnings: Number(result.earnings ?? 0) } : null,
        };
      } else {
        await sql`UPDATE dreamvora_payments SET status = 'REJECTED', rejected_at = NOW() WHERE id = ${data.paymentId}`;
        return { ok: true, activated: false, account: null };
      }
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export { LIPA_NUMBER };
