import { createServerFn } from "@tanstack/react-start";
import postgres from "postgres";
import { PAYMENT_AMOUNT } from "./zonmpay.functions";

function env(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) return process.env[name];
  return undefined;
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function hmacBase64Url(value: string) {
  const secret = env("DREAMVORA_AUTH_SECRET");
  if (!secret || secret.length < 32) throw new Error("DREAMVORA_AUTH_SECRET lazima iwe na angalau herufi 32.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function db() {
  const url = env("NETLIFY_DB_URL");
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
      status TEXT NOT NULL DEFAULT 'PUSH_SENT',
      provider_status TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confirmed_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      rejected_at TIMESTAMPTZ,
      transid TEXT
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

async function hashPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256));
  return `${bytesToBase64Url(salt)}:${bytesToBase64Url(bits)}`;
}

async function tokenFor(subject: string, kind: "user" | "admin") {
  const payload = `${kind}:${subject}:${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
  const body = textToBase64Url(payload);
  const sig = await hmacBase64Url(body);
  return `${body}.${sig}`;
}

async function verifyToken(token: string, kind: "user" | "admin") {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Session haipo sahihi.");
  const expected = await hmacBase64Url(body);
  if (!safeEqual(signature, expected)) throw new Error("Session si sahihi.");
  const [tokenKind, subject, expiry] = base64UrlToText(body).split(":");
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

async function ensureLocalUser(sql: ReturnType<typeof postgres>, data: { id: string; name: string; username: string; phone: string; email: string; country: string }) {
  const phone = cleanPhone(data.phone);
  const email = data.email.trim().toLowerCase();
  const existing = await sql`SELECT id FROM dreamvora_users WHERE id = ${data.id} LIMIT 1`;
  if (existing[0]) {
    await sql`UPDATE dreamvora_users SET name=${data.name.trim()}, username=${data.username.trim()}, phone=${phone}, email=${email}, country=${data.country} WHERE id=${data.id}`;
  } else {
    const byUnique = await sql`SELECT id FROM dreamvora_users WHERE LOWER(username)=LOWER(${data.username.trim()}) OR LOWER(email)=LOWER(${email}) LIMIT 1`;
    if (byUnique[0] && String(byUnique[0].id) !== data.id) throw new Error("Username au email tayari imetumika.");
    await sql`INSERT INTO dreamvora_users (id,name,username,phone,email,country,password_hash) VALUES (${data.id},${data.name.trim()},${data.username.trim()},${phone},${email},${data.country},${await hashPassword(randomId())})`;
  }
  return data.id;
}

async function getUserByToken(sql: ReturnType<typeof postgres>, token: string) {
  const userId = await verifyToken(token, "user");
  const rows = await sql`SELECT id,name,username,phone,email,country,paid,balance FROM dreamvora_users WHERE id=${userId} LIMIT 1`;
  if (!rows[0]) throw new Error("Akaunti haijapatikana.");
  return rows[0];
}

/** Sync the working local registration into the persistent database without making /register depend on the database. */
export const syncDreamVoraAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; name: string; username: string; phone: string; email: string; country: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try { await ensureSchema(sql); const id = await ensureLocalUser(sql, data); return { token: await tokenFor(id, "user") }; }
    finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const createDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { account: { id: string; name: string; username: string; phone: string; email: string; country: string }; phoneUsed: string; providerOrderId: string; reference: string; channel: string; providerStatus?: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql);
      const userId = await ensureLocalUser(sql, data.account);
      const userRows = await sql`SELECT paid FROM dreamvora_users WHERE id=${userId} LIMIT 1`;
      if (Boolean(userRows[0]?.paid)) return { status: "APPROVED", paymentId: null, token: await tokenFor(userId,"user"), message: "Akaunti yako tayari imefunguka." };
      const phoneUsed = cleanPhone(data.phoneUsed);
      const existing = await sql`SELECT id,status FROM dreamvora_payments WHERE provider_order_id=${data.providerOrderId} OR reference=${data.reference} ORDER BY submitted_at DESC LIMIT 1`;
      if (existing[0]) return { status: String(existing[0].status), paymentId: String(existing[0].id), token: await tokenFor(userId,"user"), message: "Ombi la malipo limesajiliwa." };
      const paymentId = randomId();
      await sql`INSERT INTO dreamvora_payments (id,user_id,phone_used,amount,currency,provider,provider_order_id,reference,channel,status,provider_status) VALUES (${paymentId},${userId},${phoneUsed},${PAYMENT_AMOUNT},'TZS','ZONMPAY',${data.providerOrderId || null},${data.reference || null},${data.channel || null},'PUSH_SENT',${data.providerStatus || 'PENDING'})`;
      return { status: "PUSH_SENT", paymentId, token: await tokenFor(userId,"user"), message: "USSD Push imetumwa. Ukishalipia, bonyeza NIMELIPIA." };
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const confirmDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; paymentId: string; phoneUsed: string }) => input)
  .handler(async ({ data }) => {
    const sql = db();
    try {
      await ensureSchema(sql); const user = await getUserByToken(sql,data.token); const phoneUsed=cleanPhone(data.phoneUsed);
      const rows=await sql`SELECT id,status FROM dreamvora_payments WHERE id=${data.paymentId} AND user_id=${user.id} LIMIT 1`; const payment=rows[0];
      if(!payment) throw new Error("Ombi la malipo halijapatikana. Anzisha malipo tena.");
      if(Boolean(user.paid) || String(payment.status)==="APPROVED") return {status:"APPROVED",message:"Malipo yameidhinishwa."};
      await sql`UPDATE dreamvora_payments SET phone_used=${phoneUsed},status='PENDING_ADMIN',confirmed_at=NOW() WHERE id=${data.paymentId} AND status IN ('PUSH_SENT','PENDING_ADMIN')`;
      return {status:"PENDING_ADMIN",message:"Tumepokea NIMELIPIA. Admin ataangalia malipo na kufungua akaunti."};
    } finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const checkDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const sql=db();
    try { await ensureSchema(sql); const user=await getUserByToken(sql,data.token); const rows=await sql`SELECT id,status,provider_status,submitted_at,approved_at,rejected_at,transid FROM dreamvora_payments WHERE user_id=${user.id} ORDER BY submitted_at DESC LIMIT 1`; const p=rows[0]; const status=Boolean(user.paid)?"APPROVED":String(p?.status??"NONE"); return {status,paymentId:p?.id??null,providerStatus:p?.provider_status?String(p.provider_status):null,transid:p?.transid?String(p.transid):null,message:Boolean(user.paid)?"Malipo yameidhinishwa.":status==="PENDING_ADMIN"?"Admin anaangalia malipo yako.":status==="PUSH_SENT"?"USSD Push imetumwa. Baada ya kulipa bonyeza NIMELIPIA.":"Tunasubiri hatua ya malipo."}; }
    finally { await sql.end({ timeout: 1 }).catch(() => undefined); }
  });

export const adminLoginDreamVora = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }) => { const password=env("DREAMVORA_ADMIN_PASSWORD"); if(!password||data.password!==password) throw new Error("Password ya admin si sahihi."); return {token:await tokenFor("admin","admin")}; });

export const adminListDreamVoraPayments = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({data}) => { await verifyToken(data.token,"admin"); const sql=db(); try { await ensureSchema(sql); const rows=await sql`SELECT p.id,p.phone_used,p.amount,p.currency,p.provider,p.provider_order_id,p.reference,p.channel,p.status,p.provider_status,p.submitted_at,p.confirmed_at,p.approved_at,p.rejected_at,p.transid,u.id AS user_id,u.name,u.username,u.phone AS account_phone,u.email FROM dreamvora_payments p JOIN dreamvora_users u ON u.id=p.user_id ORDER BY CASE WHEN p.status='PENDING_ADMIN' THEN 0 WHEN p.status='PUSH_SENT' THEN 1 ELSE 2 END,p.submitted_at DESC LIMIT 200`; return {payments:rows.map(r=>({...r,amount:Number(r.amount),submitted_at:String(r.submitted_at),confirmed_at:r.confirmed_at?String(r.confirmed_at):null,approved_at:r.approved_at?String(r.approved_at):null,rejected_at:r.rejected_at?String(r.rejected_at):null}))}; } finally { await sql.end({timeout:1}).catch(()=>undefined); } });

export const adminApproveDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; paymentId: string }) => input)
  .handler(async ({data}) => { await verifyToken(data.token,"admin"); const sql=db(); try { await ensureSchema(sql); const rows=await sql`SELECT id,user_id,status FROM dreamvora_payments WHERE id=${data.paymentId} LIMIT 1`; const p=rows[0]; if(!p) throw new Error("Malipo hayajapatikana."); if(String(p.status)!=="PENDING_ADMIN") throw new Error("Admin anaweza ku-approve baada ya user kubonyeza NIMELIPIA."); await sql.begin(async tx=>{ await tx`UPDATE dreamvora_payments SET status='APPROVED',approved_at=NOW(),rejected_at=NULL WHERE id=${data.paymentId}`; await tx`UPDATE dreamvora_payments SET status='REJECTED',rejected_at=NOW() WHERE user_id=${p.user_id} AND id<>${data.paymentId} AND status IN ('PENDING_ADMIN','PUSH_SENT')`; await tx`UPDATE dreamvora_users SET paid=TRUE WHERE id=${p.user_id}`; }); return {ok:true,status:"APPROVED"}; } finally { await sql.end({timeout:1}).catch(()=>undefined); } });

export const adminRejectDreamVoraPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; paymentId: string }) => input)
  .handler(async ({data}) => { await verifyToken(data.token,"admin"); const sql=db(); try { await ensureSchema(sql); await sql`UPDATE dreamvora_payments SET status='REJECTED',rejected_at=NOW() WHERE id=${data.paymentId}`; return {ok:true,status:"REJECTED"}; } finally { await sql.end({timeout:1}).catch(()=>undefined); } });

function findWebhookValue(value: unknown, keys: string[]): string | null { if(!value||typeof value!=="object") return null; const r=value as Record<string,unknown>; for(const k of keys){const v=r[k]; if(v!==undefined&&v!==null&&String(v)!=="") return String(v);} for(const child of Object.values(r)){const nested=findWebhookValue(child,keys); if(nested)return nested;} return null; }

export async function applyZonmPayWebhook(payload: unknown) {
  const sql=db();
  try { await ensureSchema(sql); const status=(findWebhookValue(payload,["payment_status","status","transaction_status","state"])??"PENDING").toUpperCase(); const orderId=findWebhookValue(payload,["order_id","provider_order_id","payment_id"]); const reference=findWebhookValue(payload,["reference","merchant_reference","order_reference"]); const transid=findWebhookValue(payload,["transid","transaction_id","transaction_reference","txn_id"]); const amountRaw=findWebhookValue(payload,["amount","paid_amount"]); const amount=amountRaw?Number(amountRaw):null; if(amount!==null&&Number.isFinite(amount)&&amount!==PAYMENT_AMOUNT)return {ok:false,status:400,message:"Amount haifanani na DreamVora."}; if(!orderId&&!reference)return {ok:false,status:400,message:"Webhook haina order_id au reference."}; const success=["SUCCESS","SUCCESSFUL","COMPLETED","PAID","COMPLETE","APPROVED"].includes(status); const failed=["FAILED","FAILURE","REJECTED","DECLINED","CANCELLED","CANCELED","INSUFFICIENT_FUNDS","USER_CANCELLED"].includes(status); const rows=await sql`SELECT id,status FROM dreamvora_payments WHERE (${orderId} IS NOT NULL AND provider_order_id=${orderId}) OR (${reference} IS NOT NULL AND reference=${reference}) ORDER BY submitted_at DESC LIMIT 1`; const p=rows[0]; if(!p)return {ok:false,status:404,message:"Payment haijapatikana."}; if(success){await sql`UPDATE dreamvora_payments SET provider_status=${status},transid=COALESCE(${transid},transid) WHERE id=${p.id}`; return {ok:true,status:200,message:"Provider amethibitisha; inasubiri Admin."};} if(failed){await sql`UPDATE dreamvora_payments SET provider_status=${status},status=CASE WHEN status='APPROVED' THEN status ELSE 'FAILED' END,transid=COALESCE(${transid},transid) WHERE id=${p.id}`; return {ok:true,status:200,message:"Provider amerudisha payment failed."};} await sql`UPDATE dreamvora_payments SET provider_status=${status},transid=COALESCE(${transid},transid) WHERE id=${p.id}`; return {ok:true,status:200,message:"Provider status imehifadhiwa."}; }
  finally { await sql.end({timeout:1}).catch(()=>undefined); }
}
