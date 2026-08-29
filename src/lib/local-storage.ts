export type DreamVoraAccount = {
  name: string;
  username: string;
  phone: string;
  email: string;
  country: string;
  password: string;
  paid: boolean;
  balance: number;
  withdrawals: number[];
};

const ACCOUNT_KEY = "dreamvora_account";

export function getAccount(): DreamVoraAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as DreamVoraAccount) : null;
  } catch {
    return null;
  }
}

export function saveAccount(account: DreamVoraAccount) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function createAccount(input: Omit<DreamVoraAccount, "paid" | "balance" | "withdrawals">) {
  const account: DreamVoraAccount = {
    ...input,
    paid: false,
    balance: 0,
    withdrawals: [],
  };
  saveAccount(account);
  return account;
}

export function isRegistered() {
  return !!getAccount();
}

export function markPaid() {
  const account = getAccount();
  if (!account) return null;
  const updated = { ...account, paid: true };
  saveAccount(updated);
  return updated;
}

export function addEarnings(amount: number) {
  const account = getAccount();
  if (!account) return null;
  const updated = { ...account, balance: Math.max(0, account.balance + amount) };
  saveAccount(updated);
  return updated;
}

export function withdrawBalance(amount: number) {
  const account = getAccount();
  if (!account) return { ok: false as const, error: "Akaunti haijapatikana." };
  if (amount < 50000) return { ok: false as const, error: "Kiasi cha chini cha withdrawal ni TZS 50,000." };
  if (amount > account.balance) return { ok: false as const, error: "Balance haitoshi." };
  const updated = {
    ...account,
    balance: account.balance - amount,
    withdrawals: [...account.withdrawals, amount],
  };
  saveAccount(updated);
  return { ok: true as const, account: updated };
}

export function logout() {
  localStorage.removeItem(ACCOUNT_KEY);
}
