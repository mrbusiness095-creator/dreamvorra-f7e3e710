import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flag } from "@/components/dv";
import { usersDatabase } from "@/data/users";
import { getAccount, logout, withdrawBalance, type DreamVoraAccount } from "@/lib/local-storage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KOZENA SITE" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<DreamVoraAccount | null>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = getAccount();
    if (!saved) {
      navigate({ to: "/register" });
      return;
    }
    if (!saved.paid) {
      navigate({ to: "/payment" });
      return;
    }
    setAccount(saved);
    setPhone(saved.phone);
  }, [navigate]);

  const pageUsers = useMemo(() => usersDatabase.slice(0, 9), []);

  function doWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const result = withdrawBalance(Number(amount.replace(/,/g, "")), phone);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAccount(result.account);
    setAmount("");
    setNotice("Withdrawal imefanikiwa.");
  }

  function signOut() {
    logout();
    navigate({ to: "/" });
  }

  if (!account) {
    return <main className="flex min-h-screen items-center justify-center bg-k-slate-50 font-jost text-k-slate-500">Inapakia...</main>;
  }

  return (
    <div className="min-h-screen bg-k-slate-50 font-jost text-k-slate-800">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-k-green-900 px-4 py-4 text-white shadow-lg">
        <div>
          <div className="text-lg font-extrabold tracking-tight">KOZENA <span className="text-k-amber-400">SITE</span></div>
          <div className="text-xs text-k-green-100">Karibu, {account.name}</div>
        </div>
        <button onClick={signOut} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold">Toka</button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <section className="grid gap-4 md:grid-cols-[1.4fr_.8fr]">
          <div className="rounded-3xl bg-[image:var(--k-brand-gradient)] p-6 text-white shadow-[var(--k-shadow-card)]">
            <p className="text-xs uppercase tracking-wider text-white/70">CURRENT BALANCE</p>
            <p className="mt-2 text-4xl font-extrabold">TZS {account.balance.toLocaleString()}</p>
            <p className="mt-2 text-sm text-white/75">Endelea kuchat na wageni na kupata fedha.</p>
          </div>
          <form onSubmit={doWithdraw} className="rounded-3xl border-[1.5px] border-k-slate-200 bg-white p-5">
            <h2 className="font-bold text-k-slate-900">Withdraw</h2>
            <p className="mt-1 text-xs text-k-slate-500">Minimum 50,000 TZS</p>
            <input
              className="k-field mt-4"
              inputMode="numeric"
              placeholder="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />
            <input
              className="k-field mt-3"
              inputMode="tel"
              placeholder="06XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <p className="mt-2 text-xs font-semibold text-k-red-600">{error}</p>}
            {notice && <p className="mt-2 text-xs font-semibold text-k-green-700">{notice}</p>}
            <button type="submit" className="k-btn-green mt-3">Withdraw</button>
          </form>
        </section>

        <div className="mt-8">
          <h1 className="text-2xl font-bold text-k-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-k-slate-500">Chagua mtu wa kuanza kuchat.</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageUsers.map((user) => (
            <article key={user.name} className="relative rounded-2xl border border-k-slate-200 bg-white p-3 shadow-[var(--k-shadow-card)]">
              <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-k-green-600 text-[10px] text-white">✓</span>
              <div className="flex items-center gap-3">
                <img src={user.img} alt={user.name} className="size-14 rounded-full object-cover ring-2 ring-k-indigo/40" />
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-k-slate-900"><Flag code={user.country} /> {user.name}</span>
                  <div className="text-[11px] font-semibold text-k-green-700">● online</div>
                  <div className="text-[11px] text-k-slate-500"><span className="text-k-amber-500">★</span> {user.rating}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 rounded-xl bg-k-slate-50 p-2.5 text-[11px] text-k-slate-800">
                <div><strong>CHAT TIME :</strong> {user.duration} minutes</div>
                <div><strong>WANTS :</strong> {user.wants}</div>
              </div>
              <button
                onClick={() => navigate({ to: "/chat/$name", params: { name: user.name } })}
                className="mt-3 w-full rounded-xl bg-k-indigo px-3 py-2 text-[11px] font-bold text-white"
              >
                💬 START CHAT
              </button>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
