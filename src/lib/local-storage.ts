export type WithdrawalRecord = { amount: number; phone: string; createdAt: string };
export type DreamVoraAccount = { id: string; name: string; username: string; phone: string; email: string; country: string; paid: boolean; balance: number; withdrawals: WithdrawalRecord[] };

const ACCOUNT_KEY = "dreamvora_account";
const TOKEN_KEY = "dreamvora_session";
export const PENDING_CHAT_KEY = "dreamvora_pending_chat";

export function getAccount(): DreamVoraAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY); if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DreamVoraAccount>;
    return { id: String(parsed.id ?? ""), name: String(parsed.name ?? ""), username: String(parsed.username ?? ""), phone: String(parsed.phone ?? ""), email: String(parsed.email ?? ""), country: String(parsed.country ?? "tz"), paid: Boolean(parsed.paid), balance: Number(parsed.balance ?? 0), withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals as WithdrawalRecord[] : [] };
  } catch { return null; }
}
export function saveAccount(account: DreamVoraAccount) { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); }
export function saveSession(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function getSession() { if (typeof window === "undefined") return null; return localStorage.getItem(TOKEN_KEY); }
export function clearSession() { localStorage.removeItem(TOKEN_KEY); }
export function saveServerAccount(account: Omit<DreamVoraAccount, "withdrawals">) { saveAccount({ ...account, withdrawals: getAccount()?.withdrawals ?? [] }); }
export function isRegistered() { return !!getAccount() && !!getSession(); }
export function markPaid() { const account = getAccount(); if (!account) return null; const updated = { ...account, paid: true }; saveAccount(updated); return updated; }
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
