export type WithdrawalRecord = { amount: number; phone: string; createdAt: string };
export type DreamVoraAccount = { id: string; name: string; username: string; phone: string; email: string; country: string; paid: boolean; accountActive: boolean; paymentPending: boolean; paymentPendingOrderId?: string; balance: number; earnings: number; withdrawals: WithdrawalRecord[] };

const ACCOUNT_KEY = "dreamvora_account";
const TOKEN_KEY = "dreamvora_session";
export const PENDING_CHAT_KEY = "dreamvora_pending_chat";
export const RETURN_TO_KEY = "dreamvora_return_to";
export const HIDDEN_AT_KEY = "dreamvora_hidden_at";

export function getAccount(): DreamVoraAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY); if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DreamVoraAccount>;
    const storedEarnings = Number(parsed.earnings ?? 0);
    const legacySessionEarnings = Object.keys(sessionStorage)
      .filter((key) => key.startsWith("dreamvora_chat_") && key.endsWith("_earned"))
      .reduce((sum, key) => sum + Number(sessionStorage.getItem(key) || 0), 0);
    return { id: String(parsed.id ?? ""), name: String(parsed.name ?? ""), username: String(parsed.username ?? ""), phone: String(parsed.phone ?? ""), email: String(parsed.email ?? ""), country: String(parsed.country ?? "tz"), paid: Boolean(parsed.paid), accountActive: Boolean(parsed.accountActive ?? true), paymentPending: Boolean(parsed.paymentPending), paymentPendingOrderId: parsed.paymentPendingOrderId ? String(parsed.paymentPendingOrderId) : undefined, balance: Number(parsed.balance ?? 0), earnings: Math.max(storedEarnings, legacySessionEarnings), withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals as WithdrawalRecord[] : [] };
  } catch { return null; }
}
export function saveAccount(account: DreamVoraAccount) { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); }
export function saveSession(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function getSession() { if (typeof window === "undefined") return null; return localStorage.getItem(TOKEN_KEY); }
export function clearSession() { localStorage.removeItem(TOKEN_KEY); }
export function saveServerAccount(account: Omit<DreamVoraAccount, "withdrawals">) { const local = getAccount(); saveAccount({ ...account, paymentPendingOrderId: account.paymentPendingOrderId ?? local?.paymentPendingOrderId, earnings: Number(account.earnings ?? 0), withdrawals: local?.withdrawals ?? [] }); }
export function isRegistered() { return !!getAccount() && !!getSession(); }
export function markPaid(amount = 12000) { const account = getAccount(); if (!account) return null; const updated = { ...account, paid: true, paymentPending: false, balance: account.paid ? account.balance : Math.max(account.balance, amount) }; saveAccount(updated); return updated; }
export function markPaymentPending(orderId?: string) { const account = getAccount(); if (!account) return null; const updated = { ...account, paymentPending: true, paymentPendingOrderId: orderId }; saveAccount(updated); return updated; }
export function clearPaymentPending() { const account = getAccount(); if (!account) return null; const updated = { ...account, paymentPending: false, paymentPendingOrderId: undefined }; saveAccount(updated); return updated; }
export function addEarnings(amount: number) { const account = getAccount(); if (!account || !Number.isFinite(amount) || amount <= 0) return null; const updated = { ...account, earnings: Math.max(0, account.earnings + amount), balance: Math.max(0, account.balance + amount) }; saveAccount(updated); return updated; }
export function withdrawBalance(amount: number, phone: string) {
  const account = getAccount(); if (!account) return { ok: false as const, error: "Akaunti haijapatikana." };
  if (!account.paid) return { ok: false as const, error: "Kamilisha malipo kwanza." };
  if (!/^\+?255\d{9}$/.test(phone.replace(/\s+/g, "")) && !/^0\d{9}$/.test(phone.replace(/\s+/g, ""))) return { ok: false as const, error: "Weka namba ya simu ya Tanzania iliyo sahihi." };
  if (amount < 50000) return { ok: false as const, error: "Kiasi cha chini cha withdrawal ni TZS 50,000." };
  if (amount > account.balance) return { ok: false as const, error: "Balance haitoshi." };
  const updated = { ...account, balance: account.balance - amount, withdrawals: [...account.withdrawals, { amount, phone, createdAt: new Date().toISOString() }] };
  saveAccount(updated); return { ok: true as const, account: updated };
}
export function setPendingChat(name: string) { localStorage.setItem(PENDING_CHAT_KEY, name); }
export function getPendingChat() { if (typeof window === "undefined") return null; return localStorage.getItem(PENDING_CHAT_KEY); }
export function clearPendingChat() { localStorage.removeItem(PENDING_CHAT_KEY); }
export function logout() { localStorage.removeItem(ACCOUNT_KEY); clearSession(); localStorage.removeItem(PENDING_CHAT_KEY); }


export function setReturnTo(path: string) { if (typeof window !== "undefined") localStorage.setItem(RETURN_TO_KEY, path); }
export function getReturnTo() { if (typeof window === "undefined") return null; return localStorage.getItem(RETURN_TO_KEY); }
export function clearReturnTo() { if (typeof window !== "undefined") localStorage.removeItem(RETURN_TO_KEY); }
export function setHiddenAt(value: number) { if (typeof window !== "undefined") localStorage.setItem(HIDDEN_AT_KEY, String(value)); }
export function getHiddenAt() { if (typeof window === "undefined") return null; const value = Number(localStorage.getItem(HIDDEN_AT_KEY)); return Number.isFinite(value) && value > 0 ? value : null; }
export function clearHiddenAt() { if (typeof window !== "undefined") localStorage.removeItem(HIDDEN_AT_KEY); }
