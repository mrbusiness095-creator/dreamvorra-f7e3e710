import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flag } from "@/components/dv";
import { usersDatabase } from "@/data/users";
import {
  getAccount,
  getSession,
  logout,
  saveServerAccount,
  withdrawBalance,
  type DreamVoraAccount,
} from "@/lib/local-storage";
import { getDreamVoraAccount } from "@/lib/dreamvora.server";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DreamVora" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<DreamVoraAccount | null>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  useEffect(() => {
    const token = getSession();
    if (!token) {
      navigate({ to: "/register" });
      return;
    }

    void getDreamVoraAccount({ data: { token } })
      .then((result) => {
        const local = getAccount();
        saveServerAccount(result.account);

        if (!result.account.paid) {
          navigate({ to: "/payment" });
          return;
        }

        setAccount({
          ...result.account,
          withdrawals: local?.withdrawals ?? [],
        });
        setPhone(result.account.phone);
      })
      .catch(() => {
        navigate({ to: "/login" });
      });
  }, [navigate]);

  const pageUsers = useMemo(() => usersDatabase.slice(0, 9), []);

  const balance = account?.balance ?? 0;
  const netIncome = balance;

  const withdrawn = useMemo(() => {
    if (!account?.withdrawals) return 0;
    return account.withdrawals.reduce(
      (total, item) => total + Number(item.amount || 0),
      0,
    );
  }, [account]);

  function doWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const result = withdrawBalance(
      Number(amount.replace(/,/g, "")),
      phone,
    );

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#9dd5eb] font-jost text-slate-600">
        Inapakia...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#9dd5eb] font-jost text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-[74px] items-center justify-between bg-white px-4 shadow-sm">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-indigo-700"
          aria-label="Menu"
        >
          ☰
        </button>

        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <div className="flex h-11 w-10 items-center justify-center text-4xl font-black text-[#c98932]">
            K
          </div>
          <div className="leading-tight">
            <div className="text-[19px] font-bold text-indigo-800">
              DREAMVORA
            </div>
            <div className="text-[10px] font-semibold tracking-wide text-slate-400">
              SITE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-bold text-indigo-800">
              {account.name}
            </div>
            <div className="text-[10px] text-slate-400">DREAMVORA SITE</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow">
            <Flag code="TZ" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-7">
        {/* Welcome */}
        <div className="mb-5">
          <p className="text-[20px] text-slate-700">
            Welcome, <span className="font-extrabold">{account.name}</span>
          </p>
        </div>

        {/* Net income */}
        <section className="overflow-hidden rounded-[28px] bg-[#25344b] px-7 py-7 text-white shadow-xl">
          <p className="text-[12px] font-bold tracking-[2px] text-white/70">
            NET INCOME
          </p>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[40px] font-extrabold tracking-tight sm:text-[48px]">
              {netIncome.toLocaleString()}
            </span>
            <span className="text-lg text-white/60">TZS</span>
          </div>

          <div className="my-6 h-px bg-white/10" />

          <div className="flex flex-wrap gap-x-16 gap-y-5">
            <div>
              <p className="text-[12px] font-bold text-white/60">EXPENSES</p>
              <p className="mt-1 text-[20px] font-bold text-yellow-400">
                0 TZS
              </p>
            </div>

            <div>
              <p className="text-[12px] font-bold text-white/60">BONUS</p>
              <p className="mt-1 text-[20px] font-bold text-emerald-400">
                0 TZS
              </p>
            </div>
          </div>
        </section>

        {/* Action buttons */}
        <section className="mt-7 grid grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-8">
          <DashboardAction icon="↗" label="Share" className="bg-blue-600" />
          <DashboardAction icon="👤" label="Pay Client" className="bg-emerald-600" />

          <DashboardAction
            icon="▣"
            label="Cash Out"
            className="bg-orange-500"
            onClick={() => setShowWithdrawal((value) => !value)}
          />

          <DashboardAction icon="◈" label="Bundles" className="bg-purple-600" />
          <DashboardAction icon="▶" label="YouTube" className="bg-red-500" />
          <DashboardAction icon="?" label="Quiz" className="bg-emerald-600" />
          <DashboardAction icon="f" label="Facebook" className="bg-blue-600" />
          <DashboardAction icon="♪" label="TikTok" className="bg-black" />
        </section>

        {/* Balance / Withdrawal cards */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded bg-white px-2 py-1 text-[9px] font-bold text-slate-700">
                  DREAMVORA SITE
                </span>
                <h2 className="mt-4 text-[22px] font-bold">Balance</h2>
              </div>
              <strong className="text-xl">{balance.toLocaleString()}</strong>
            </div>

            <div className="mt-6">
              <div className="mb-1 flex justify-between text-[10px] text-white/70">
                <span>Growth</span>
                <span>{balance > 0 ? "100%" : "0%"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: balance > 0 ? "100%" : "0%" }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWithdrawal((value) => !value)}
            className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-400 p-5 text-left text-white shadow-lg transition active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded bg-white px-2 py-1 text-[9px] font-bold text-slate-700">
                  DREAMVORA SITE
                </span>
                <h2 className="mt-4 text-[22px] font-bold">Withdrawal</h2>
              </div>
              <strong className="text-xl">{withdrawn.toLocaleString()}</strong>
            </div>

            <div className="mt-6">
              <div className="mb-1 flex justify-between text-[10px] text-white/70">
                <span>Growth</span>
                <span>{withdrawn > 0 ? "100%" : "0%"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: withdrawn > 0 ? "100%" : "0%" }}
                />
              </div>
            </div>

            <div className="mt-4 text-center text-xs font-bold text-white/90">
              {showWithdrawal ? "▲ Close Withdrawal" : "Tap to Withdraw"}
            </div>
          </button>
        </section>

        {/* Hidden until Withdrawal is clicked */}
        {showWithdrawal && (
          <section
            id="withdraw-section"
            className="mt-5 rounded-2xl bg-white p-5 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Withdraw</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Minimum 50,000 TZS
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWithdrawal(false)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                Funga
              </button>
            </div>

            <form onSubmit={doWithdraw} className="mt-4">
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className="k-field"
                  inputMode="numeric"
                  placeholder="50000"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/\D/g, ""))
                  }
                />

                <input
                  className="k-field"
                  inputMode="tel"
                  placeholder="06XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <button type="submit" className="k-btn-green">
                  Withdraw
                </button>
              </div>

              {error && (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  {error}
                </p>
              )}

              {notice && (
                <p className="mt-3 text-xs font-semibold text-green-700">
                  {notice}
                </p>
              )}
            </form>
          </section>
        )}

        {/* Existing chat section stays below */}
        <div className="mt-10">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chagua mtu wa kuanza kuchat.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageUsers.map((user) => (
            <article
              key={user.name}
              className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                ✓
              </span>

              <div className="flex items-center gap-3">
                <img
                  src={user.img}
                  alt={user.name}
                  className="size-14 rounded-full object-cover ring-2 ring-indigo-200"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Flag code={user.country} /> {user.name}
                  </span>
                  <div className="text-[11px] font-semibold text-green-700">
                    ● online
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span className="text-yellow-500">★</span> {user.rating}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-800">
                <div>
                  <strong>CHAT TIME :</strong> {user.duration} minutes
                </div>
                <div>
                  <strong>WANTS :</strong> {user.wants}
                </div>
              </div>

              <button
                onClick={() =>
                  navigate({
                    to: "/chat/$name",
                    params: { name: user.name },
                  })
                }
                className="mt-3 w-full rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white"
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

type DashboardActionProps = {
  icon: string;
  label: string;
  className: string;
  onClick?: () => void;
};

function DashboardAction({
  icon,
  label,
  className,
  onClick,
}: DashboardActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <span
        className={`flex h-[66px] w-[66px] items-center justify-center rounded-[20px] text-2xl font-bold text-white shadow-md transition-transform active:scale-95 sm:h-[78px] sm:w-[78px] ${className}`}
      >
        {icon}
      </span>
      <span className="text-[11px] font-semibold text-white sm:text-[13px]">
        {label}
      </span>
    </button>
  );
}
