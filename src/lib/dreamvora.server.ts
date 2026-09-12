import { createServerFn } from "@tanstack/react-start";
import postgres from "postgres";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { PAYMENT_AMOUNT } from "./kozena.functions";
import { usersDatabase } from "../data/users";

const LIPA_NUMBER = "354136248";
const AUTH_SECRET = process.env.DREAMVORA_AUTH_SECRET;

function db() {
  const url = process.env.NETLIFY_DB_URL;
  if (!url) throw new Error("NETLIFY_DB_URL haijawekwa. Tengeneza Netlify Database na ongeza environment variable hiyo.");
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
    CREATE TABLE IF NOT EXISTS dreamvora_chat_earnings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES dreamvora_users(id) ON DELETE CASCADE,
      chat_name TEXT NOT NULL,
      message_block INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, chat_name, message_block)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS dreamvora_chat_earnings_user_idx ON dreamvora_chat_earnings(user_id, created_at DESC)`;
}

function requireSecret() {
  if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
    throw new Error("DREAMVORA_AUTH_SECRET lazima iwe na angalau herufi 32.");
  }
  return AUTH_SECRET;
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
  const payload = `${kind}:${subject}:${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
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
    SELECT id, name, username, phone, email, country, paid, balance
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

/**
 * Credits a completed chat block exactly once.
 *
 * A chat is paid after every 10 messages sent by the registered user.
 * The unique constraint makes the credit idempotent, so refreshing or
 * retrying the request cannot credit the same block twice.
 */
export const recordDreamVoraChatEarning = createServerFn({ method: "POST" })
  .inputValidator((input: {
    token: string;
    chatName: string;
    messageBlock: number;
    amount: number;
  }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);

      const userId = verifyToken(data.token, "user");
      const amount = Math.floor(Number(data.amount));
      const messageBlock = Math.floor(Number(data.messageBlock));
      const chatName = String(data.chatName ?? "").trim();

      if (!chatName) throw new Error("Jina la chat halipo.");

      const foreignUser = usersDatabase.find(
        (item) => item.name.toLowerCase() === chatName.toLowerCase(),
      );

      if (!foreignUser) throw new Error("Mtu wa chat hakupatikana.");

      if (!Number.isFinite(amount) || amount !== foreignUser.money) {
        throw new Error("Kiasi cha malipo si sahihi.");
      }

      if (!Number.isInteger(messageBlock) || messageBlock < 1) {
        throw new Error("Namba ya block ya chat si sahihi.");
      }

      const canonicalChatName = foreignUser.name;

      const result = await sql.begin(async (tx) => {
        const existing = await tx`
          SELECT id, amount
          FROM dreamvora_chat_earnings
          WHERE user_id = ${userId}
            AND chat_name = ${canonicalChatName}
            AND message_block = ${messageBlock}
          LIMIT 1
        `;

        if (existing[0]) {
          const current = await tx`
            SELECT balance FROM dreamvora_users WHERE id = ${userId} LIMIT 1
          `;
          return {
            credited: false,
            balance: Number(current[0]?.balance ?? 0),
          };
        }

        const user = await tx`
          SELECT paid, balance
          FROM dreamvora_users
          WHERE id = ${userId}
          LIMIT 1
        `;

        if (!user[0]) throw new Error("Akaunti haijapatikana.");
        if (!Boolean(user[0].paid)) {
          throw new Error("Kamilisha malipo ya akaunti kwanza.");
        }

        const id = randomUUID();

        await tx`
          INSERT INTO dreamvora_chat_earnings
            (id, user_id, chat_name, message_block, amount)
          VALUES
            (${id}, ${userId}, ${canonicalChatName}, ${messageBlock}, ${amount})
        `;

        const updated = await tx`
          UPDATE dreamvora_users
          SET balance = balance + ${amount}
          WHERE id = ${userId}
          RETURNING balance
        `;

        return {
          credited: true,
          balance: Number(updated[0]?.balance ?? 0),
        };
      });

      return {
        credited: result.credited,
        balance: result.balance,
        amount,
        messageBlock,
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
        await sql.begin(async (tx) => {
          await tx`UPDATE dreamvora_payments SET status = 'APPROVED', approved_at = NOW(), rejected_at = NULL WHERE id = ${data.paymentId}`;
          await tx`UPDATE dreamvora_payments SET status = 'REJECTED', rejected_at = NOW() WHERE user_id = ${payment.user_id} AND id <> ${data.paymentId} AND status = 'PENDING'`;
          await tx`UPDATE dreamvora_users SET paid = TRUE WHERE id = ${payment.user_id}`;
        });
      } else {
        await sql`UPDATE dreamvora_payments SET status = 'REJECTED', rejected_at = NOW() WHERE id = ${data.paymentId}`;
      }
      return { ok: true };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export { LIPA_NUMBER };
