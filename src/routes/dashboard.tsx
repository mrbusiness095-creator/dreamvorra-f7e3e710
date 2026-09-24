import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flag, Modal } from "@/components/dv";
import { usersDatabase, type ForeignUser } from "@/data/users";
import { getAccount, getSession, logout, saveServerAccount, withdrawBalance, type DreamVoraAccount } from "@/lib/local-storage";
import { dismissDreamVoraNotification, getDreamVoraAccount, getDreamVoraNotifications } from "@/lib/dreamvora.server";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DreamVora" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DashboardPage,
});

type Notification = { id: string; title: string; message: string; createdAt: string };

function shuffleUsers(list: ForeignUser[]) {
  return [...list].sort(() => Math.random() - 0.5);
}

function DashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<DreamVoraAccount | null>(null);
  const [users, setUsers] = useState<ForeignUser[]>(() => shuffleUsers(usersDatabase));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const token = getSession();
    if (!token) { navigate({ to: "/register" }); return; }
    void getDreamVoraAccount({ data: { token } }).then((result) => {
      saveServerAccount(result.account);
      if (!result.account.paid) { navigate({ to: "/payment" }); return; }
      setAccount({ ...result.account, withdrawals: getAccount()?.withdrawals ?? [] });
      setPhone(result.account.phone);
    }).catch(() => navigate({ to: "/login" }));
    void getDreamVoraNotifications({ data: { token } }).then((result) => setNotifications(result.notifications)).catch(() => setNotifications([]));

    const rotate = window.setInterval(() => setUsers(shuffleUsers(usersDatabase)), 45000);
    const refreshNotifications = window.setInterval(() => {
      const currentToken = getSession();
      if (currentToken) void getDreamVoraNotifications({ data: { token: currentToken } }).then((result) => setNotifications(result.notifications)).catch(() => undefined);
    }, 30000);
    return () => { window.clearInterval(rotate); window.clearInterval(refreshNotifications); };
  }, [navigate]);

  const pageUsers = useMemo(() => users.slice(0, 9), [users]);
  const withdrawn = account?.withdrawals.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const netIncome = account?.balance ?? 0;

  function doWithdraw(e: React.FormEvent) {
    e.preventDefault(); setError(null); setNotice(null);
    const result = withdrawBalance(Number(amount.replace(/,/g, "")), phone);
    if (!result.ok) { setError(result.error); return; }
    setAccount(result.account); setAmount(""); setNotice("Withdrawal imefanikiwa.");
  }

  async function dismiss(id: string) {
    const token = getSession();
    setNotifications((items) => items.filter((item) => item.id !== id));
    if (token) await dismissDreamVoraNotification({ data: { token, notificationId: id } }).catch(() => undefined);
  }

  function signOut() { logout(); navigate({ to: "/" }); }

  if (!account) return <main className="flex min-h-screen items-center justify-center bg-[#f4f7fa] font-jost text-slate-500">Inapakia...</main>;

  return (
    <div className="min-h-screen bg-[#f3f7f9] font-jost text-slate-800">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 shadow-sm md:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-lg font-black text-white">D</div>
          <div><div className="text-base font-extrabold tracking-tight text-slate-900">DREAMVORA</div><div className="text-[11px] text-slate-400">Creator Dashboard</div></div>
        </div>
        <button onClick={signOut} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Toka</button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 md:px-6">
        <section className="overflow-hidden rounded-[28px] bg-[#30394d] px-6 py-8 text-white shadow-lg md:px-9">
          <div className="text-center text-base font-extrabold tracking-wide md:text-xl">DREAMVORA AGENCIES TO THE MOON! 🚀🌙</div>
          <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-cyan-400/80" />
        </section>

        {notifications.length > 0 && (
          <section className="mt-4 space-y-2" aria-label="Notifications">
            {notifications.map((item) => (
              <article key={item.id} className="relative rounded-2xl border border-emerald-100 bg-white p-4 pr-12 shadow-sm">
                <button onClick={() => void dismiss(item.id)} aria-label="Dismiss notification" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">✓</button>
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">🔔 Admin Notification</div>
                <h2 className="mt-1 text-sm font-extrabold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.message}</p>
              </article>
            ))}
          </section>
        )}

        <section className="mt-5 flex items-center gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 text-xl font-black text-white">{account.name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><h1 className="text-2xl font-extrabold text-slate-900">Welcome back, {account.name}</h1><p className="text-sm text-slate-400">@{account.username} · Here's how your earnings are looking today.</p></div>
          <button onClick={() => setWithdrawOpen(true)} className="hidden size-11 place-items-center rounded-full bg-white text-lg shadow-sm md:grid">🌙</button>
        </section>

        <section className="mt-5 rounded-[28px] bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 p-5 text-white shadow-lg md:p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">↗ NET INCOME</div>
          <div className="mt-2 text-4xl font-black md:text-5xl">{netIncome.toLocaleString()} <span className="text-lg font-bold text-white/75">TZS</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur"><div className="text-[11px] font-semibold text-white/70">WITHDRAWN</div><div className="mt-1 text-lg font-extrabold">{withdrawn.toLocaleString()} TZS</div></div>
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur"><div className="text-[11px] font-semibold text-white/70">BONUS</div><div className="mt-1 text-lg font-extrabold">0.00 TZS</div></div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2 md:gap-3">
          <button onClick={() => navigator.share ? navigator.share({ title: "DreamVora", text: "Join me on DreamVora" }).catch(() => undefined) : undefined} className="rounded-2xl bg-white px-3 py-4 text-sm font-bold shadow-sm">↗ <span className="ml-1">Share</span></button>
          <button onClick={() => document.getElementById("dashboard-chats")?.scrollIntoView({ behavior: "smooth" })} className="rounded-2xl bg-white px-3 py-4 text-sm font-bold shadow-sm">👤 <span className="ml-1">Pay Client</span></button>
          <button onClick={() => setWithdrawOpen(true)} className="rounded-2xl bg-white px-3 py-4 text-sm font-bold shadow-sm">▣ <span className="ml-1">Cash Out</span></button>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <BalanceCard title="DREAMVORA AGENCIES" label="Balance" value={account.balance} percent={Math.min(100, Math.max(0, Math.round((account.balance / 100000) * 100)))} tone="green" />
          <BalanceCard title="DREAMVORA AGENCIES" label="Withdrawal" value={withdrawn} percent={Math.min(100, Math.max(0, Math.round((withdrawn / Math.max(1, account.balance + withdrawn)) * 100)))} tone="red" />
        </section>

        <section className="mt-5 rounded-[24px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">Other Balances</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniBalance label="Available" value={account.balance} />
            <MiniBalance label="Pending" value={0} />
            <MiniBalance label="Bonus" value={0} />
            <MiniBalance label="Total Withdrawn" value={withdrawn} />
          </div>
        </section>

        <section id="dashboard-chats" className="mt-7">
          <h2 className="text-2xl font-extrabold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Chagua mtu wa kuanza kuchat.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {pageUsers.map((user) => (
              <article key={user.name} className="relative rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
                <span className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-emerald-500 text-sm font-black text-white">✓</span>
                <div className="flex items-center gap-3">
                  <img src={user.img} alt={user.name} className="size-16 rounded-full object-cover ring-2 ring-amber-300" />
                  <div><div className="flex items-center gap-1.5 text-base font-extrabold text-slate-900"><Flag code={user.country} size={20} /> {user.name}</div><div className="text-xs font-bold text-emerald-600">● online</div><div className="text-xs text-slate-500"><span className="text-amber-500">★</span> {user.rating}</div></div>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600"><div><strong className="text-slate-900">CHAT TIME :</strong> {user.duration} minutes</div><div className="mt-2"><strong className="text-slate-900">WANTS :</strong> {user.wants}</div></div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button onClick={() => navigate({ to: "/chat/$name", params: { name: user.name } })} className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-extrabold text-white shadow-sm">💬 START CHAT</button>
                  <div className="text-right"><div className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white">TZS {user.money.toLocaleString()}</div><div className="mt-1 text-[10px] text-slate-400">Earn USD {(user.money / 2500).toFixed(2)}</div></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} icon="👛" title="Cash Out">
        <form onSubmit={doWithdraw} className="space-y-3 text-left">
          <div className="rounded-xl bg-secondary p-3 text-center"><div className="text-[10px] font-semibold text-muted-foreground">CURRENT BALANCE</div><div className="text-xl font-extrabold text-primary">TZS {account.balance.toLocaleString()}</div></div>
          <div><label className="mb-1 block text-xs font-bold">Amount</label><input required inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="50000" className="k-field" /></div>
          <div><label className="mb-1 block text-xs font-bold">Namba ya simu</label><input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="k-field" /></div>
          {account.balance < 50000 && <p className="rounded-xl bg-k-red-50 p-3 text-xs font-semibold text-k-red-900">Minimum ya withdrawal ni TZS 50,000.</p>}
          {error && <p className="text-xs font-semibold text-k-red-600">{error}</p>}{notice && <p className="text-xs font-semibold text-k-green-700">{notice}</p>}
          <button type="submit" disabled={account.balance < 50000} className="k-btn-green disabled:cursor-not-allowed disabled:opacity-50">Withdraw</button>
        </form>
      </Modal>
    </div>
  );
}

function BalanceCard({ title, label, value, percent, tone }: { title: string; label: string; value: number; percent: number; tone: "green" | "red" }) {
  return <article className={`rounded-[24px] border-l-4 bg-white p-5 shadow-sm ${tone === "green" ? "border-emerald-500" : "border-rose-500"}`}><div className="flex items-center justify-between"><span className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-extrabold tracking-wide text-slate-600">{title}</span><strong className="text-2xl font-black text-slate-900">{value.toLocaleString()}.00</strong></div><div className="mt-4 text-lg text-slate-700">{label}</div><div className="mt-5 flex justify-between text-xs text-slate-400"><span>Growth</span><span>{percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone === "green" ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${percent}%` }} /></div></article>;
}

function MiniBalance({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-base font-extrabold text-slate-900">TZS {value.toLocaleString()}</div></div>;
}
