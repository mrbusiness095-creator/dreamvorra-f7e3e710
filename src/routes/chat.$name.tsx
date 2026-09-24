import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BackButton, Flag, Header, Modal } from "@/components/dv";
import { findUser, firstMessageBroken, generateForeignerReply } from "@/data/users";
import { addEarnings, getAccount, getSession, saveServerAccount, setPendingChat, withdrawBalance, type DreamVoraAccount } from "@/lib/local-storage";
import { getDreamVoraAccount, recordDreamVoraChatEarning } from "@/lib/dreamvora.server";

export const Route = createFileRoute("/chat/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `Chat na ${params.name} | DreamVora Tanzania` },
      { name: "description", content: `Chat with ${params.name} on DreamVora Tanzania.` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ChatPage,
});

type Message = { id: string; from: "foreigner" | "me"; text: string; time: string };

function nowTime() {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Dar_es_Salaam" }).format(new Date());
}
function normalizePhone(value: string) {
  const clean = value.replace(/\s+/g, "");
  if (clean.startsWith("+255")) return clean;
  if (clean.startsWith("255")) return `+${clean}`;
  if (clean.startsWith("0")) return `+255${clean.slice(1)}`;
  return clean;
}

function ChatPage() {
  const { name } = useParams({ from: "/chat/$name" });
  const navigate = useNavigate();
  const user = findUser(name);
  const storageKey = `dreamvora_chat_${name.toLowerCase()}`;
  const [account, setAccount] = useState<DreamVoraAccount | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [locked, setLocked] = useState(false);
  const [paymentNeeded, setPaymentNeeded] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);
  const [chatClosed, setChatClosed] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const myMessageCount = useMemo(() => messages.filter((m) => m.from === "me").length, [messages]);

  useEffect(() => {
    const token = getSession();
    if (token) {
      void getDreamVoraAccount({ data: { token } }).then((result) => {
        saveServerAccount(result.account);
        setAccount({ ...result.account, withdrawals: getAccount()?.withdrawals ?? [] });
        setWithdrawPhone(result.account.phone);
      }).catch(() => setAccount(null));
    } else {
      setAccount(null);
    }
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const restored = JSON.parse(raw) as Message[];
        setMessages(restored);
        const completedAmount = Number(sessionStorage.getItem(`${storageKey}_earned`) || 0);
        if (restored.filter((m) => m.from === "me").length >= 10) {
          setChatClosed(true);
          setEarnedAmount(completedAmount || user?.money || 0);
        }
        return;
      }
    } catch { /* fresh state */ }
    if (user) setMessages([{ id: "foreigner-1", from: "foreigner", text: firstMessageBroken(user.name, user.wants), time: nowTime() }]);
  }, [storageKey, user]);

  useEffect(() => { if (messages.length) sessionStorage.setItem(storageKey, JSON.stringify(messages)); }, [messages, storageKey]);

  if (!user) return <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center"><div><p className="text-sm text-muted-foreground">Mtumiaji hakupatikana.</p><button onClick={() => navigate({ to: "/" })} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Rudi Nyumbani</button></div></div>;

  async function send() {
    if (!text.trim() || chatClosed) return;
    const current = getAccount();
    const nextMessage: Message = { id: `me-${Date.now()}`, from: "me", text: text.trim(), time: nowTime() };

    if (!current) {
      const guestMessages = messages.filter((m) => m.from === "me").length;
      if (guestMessages >= 1) { setPendingChat(user.name); setLocked(true); return; }
      setMessages((prev) => [...prev, nextMessage]);
      setText("");
      window.setTimeout(() => setMessages((prev) => [...prev, { id: `reply-${Date.now()}`, from: "foreigner", text: generateForeignerReply(nextMessage.text, user.name, user.wants), time: nowTime() }]), 500);
      setPendingChat(user.name);
      window.setTimeout(() => setLocked(true), 250);
      return;
    }

    if (!current.paid) { setPendingChat(user.name); setPaymentNeeded(true); return; }
    const nextCount = messages.filter((m) => m.from === "me").length + 1;
    setMessages((prev) => [...prev, nextMessage]);
    setText("");

    window.setTimeout(() => setMessages((prev) => [...prev, { id: `reply-${Date.now()}`, from: "foreigner", text: generateForeignerReply(nextMessage.text, user.name, user.wants), time: nowTime() }]), 500);

    if (nextCount === 10) {
      const chatKey = `${storageKey}:completed`;
      try {
        const token = getSession();
        if (token) {
          const result = await recordDreamVoraChatEarning({ data: { token, chatKey, amount: user.money } });
          if (result.added) {
            const local = getAccount();
            if (local) {
              const updated = { ...local, earnings: result.earnings, balance: result.balance };
              localStorage.setItem("dreamvora_account", JSON.stringify(updated));
              setAccount(updated);
            }
          }
          setEarnedAmount(result.amount);
        } else {
          const updated = addEarnings(user.money);
          if (updated) setAccount(updated);
          setEarnedAmount(user.money);
        }
      } catch {
        const updated = addEarnings(user.money);
        if (updated) setAccount(updated);
        setEarnedAmount(user.money);
      }
      sessionStorage.setItem(`${storageKey}_earned`, String(user.money));
      setChatClosed(true);
    }
  }

  function doWithdraw(e: React.FormEvent) {
    e.preventDefault(); setWithdrawError(null); setWithdrawNotice(null);
    const result = withdrawBalance(Number(amount.replace(/,/g, "")), normalizePhone(withdrawPhone));
    if (!result.ok) { setWithdrawError(result.error); return; }
    setAccount(result.account); setAmount(""); setWithdrawNotice("Withdrawal imefanikiwa.");
  }
  const goRegister = () => { setPendingChat(user.name); navigate({ to: "/register" }); };

  return <div className="flex min-h-screen flex-col bg-background">
    <Header currentBalance={account?.paid ? account.balance : null} onWithdraw={() => setWithdraw(true)} onBalance={() => setWithdraw(true)} />
    <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2">
      <button onClick={() => navigate({ to: account?.paid ? "/dashboard" : "/" })} aria-label="Rudi" className="text-lg">←</button>
      <img src={user.img} alt={user.name} className="size-9 rounded-full object-cover" />
      <div className="min-w-0"><div className="flex items-center gap-1.5 text-sm font-bold text-foreground">{user.name} <Flag code={user.country} size={18} /></div><div className="text-[11px] font-semibold text-success">● online</div></div>
      {account?.paid && <div className="ml-auto text-right"><div className="text-[8px] font-semibold text-muted-foreground">BALANCE</div><div className="text-xs font-extrabold text-primary">TZS {account.balance.toLocaleString()}</div></div>}
    </div>
    <main className="flex-1 space-y-3 overflow-y-auto px-3 py-4 pb-24">
      <div className="mx-auto max-w-md rounded-xl bg-secondary px-3 py-2 text-center text-[11px] text-secondary-foreground">💬 Unachati na {user.name} kwa muda wa {user.duration} dakika. Malipo kwa ujumbe 10: <strong>TZS {user.money.toLocaleString()}</strong>.</div>
      {messages.map((m) => <div key={m.id} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}><div className="max-w-[82%]"><div className={m.from === "me" ? "rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-[var(--shadow-card)]" : "rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-sm text-card-foreground shadow-[var(--shadow-card)]"}>{m.text}</div><div className={`mt-1 text-[10px] text-muted-foreground ${m.from === "me" ? "text-right" : ""}`}>{m.time}</div></div></div>)}
      {account?.paid && myMessageCount > 0 && <div className="mx-auto max-w-md text-center text-[10px] text-muted-foreground">Ujumbe wako: {myMessageCount} / 10 • Kila ujumbe 10 unalipa TZS {user.money.toLocaleString()}</div>}
    </main>
    <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card px-3 py-2.5"><input disabled={chatClosed} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={chatClosed ? "Chat imefungwa — ujumbe 10 umekamilika" : "Andika ujumbe..."} className="flex-1 rounded-full border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60" /><button disabled={chatClosed} onClick={() => void send()} className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">Tuma</button></div>

    <Modal open={chatClosed} onClose={() => undefined} icon="🎉" title="Umefanikiwa kulipwa!">
      <div className="rounded-2xl bg-emerald-50 p-4">
        <div className="text-xs font-semibold text-emerald-700">MALIPO YA CHAT</div>
        <div className="mt-1 text-3xl font-black text-emerald-700">TZS {earnedAmount.toLocaleString()}</div>
        <p className="mt-1 text-xs text-emerald-700">Ujumbe 10 umekamilika. Chat hii imefungwa.</p>
      </div>
      <button onClick={() => navigate({ to: "/dashboard" })} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Rudi Dashboard</button>
    </Modal>
    <Modal open={locked} onClose={() => setLocked(false)} icon="🔒" title="Jisajili au Login ili Kuendelea"><p>Umetuma ujumbe mmoja wa kuanzia. Ili kutuma ujumbe mwingine, unatakiwa <strong>kujisajili au kuingia kwenye akaunti</strong>.</p><div className="space-y-2 pt-3"><button onClick={goRegister} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Jisajili SASA</button><button onClick={() => navigate({ to: "/login" })} className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground">Login</button><BackButton onClick={() => setLocked(false)} label="Rudi kwenye Chat" /></div></Modal>
    <Modal open={paymentNeeded} onClose={() => setPaymentNeeded(false)} icon="💳" title="Kamilisha Malipo"><p>Akaunti yako imesajiliwa. Kamilisha malipo ili uendelee kutuma meseji na kupata malipo.</p><div className="space-y-2 pt-3"><button onClick={() => navigate({ to: "/payment" })} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Lipa SASA</button><BackButton onClick={() => setPaymentNeeded(false)} label="Rudi Kwenye Chat" /></div></Modal>
    <Modal open={withdraw} onClose={() => setWithdraw(false)} icon="👛" title="Withdrawal">
      {!account ? <><p>Unatakiwa <strong>ujisajili</strong> kwanza ili uweze kupata fedha.</p><div className="space-y-2 pt-3"><button onClick={goRegister} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Jisajili SASA</button><BackButton onClick={() => setWithdraw(false)} label="Rudi Kwenye Chat" /></div></> : <form onSubmit={doWithdraw} className="space-y-3 text-left"><div className="rounded-xl bg-secondary p-3 text-center"><div className="text-[10px] font-semibold text-muted-foreground">CURRENT BALANCE</div><div className="text-xl font-extrabold text-primary">TZS {account.balance.toLocaleString()}</div></div><div><label className="mb-1 block text-xs font-bold">Amount</label><input required inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="50000" className="k-field" /></div><div><label className="mb-1 block text-xs font-bold">Namba ya simu</label><input required inputMode="tel" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value)} placeholder="06XXXXXXXX" className="k-field" /></div>{account.balance < 50000 && <p className="rounded-xl bg-k-red-50 p-3 text-xs font-semibold text-k-red-900">Minimum ya withdrawal ni TZS 50,000. Balance yako bado haijafikisha kiwango hicho.</p>}{withdrawError && <p className="text-xs font-semibold text-k-red-600">{withdrawError}</p>}{withdrawNotice && <p className="text-xs font-semibold text-k-green-700">{withdrawNotice}</p>}<button type="submit" disabled={account.balance < 50000} className="k-btn-green disabled:cursor-not-allowed disabled:opacity-50">Withdraw</button></form>}
    </Modal>
  </div>;
}
