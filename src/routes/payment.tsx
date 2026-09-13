import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PAYMENT_AMOUNT, startZonmPayPayment } from "@/lib/zonmpay.functions";
import { checkDreamVoraPayment, confirmDreamVoraPayment, createDreamVoraPayment } from "@/lib/dreamvora.server";
import { clearPendingChat, getAccount, getPendingChat, getSession, markPaid, saveSession } from "@/lib/local-storage";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "Lipa — DreamVora" }, { name: "description", content: "Lipia DreamVora kwa USSD Push." }, { name: "robots", content: "noindex, nofollow" }] }),
  component: PaymentPage,
});

const CHANNELS = [
  { value: "MPESA", label: "Vodacom M-Pesa" },
  { value: "TIGOPESA", label: "Mixx by Yas" },
  { value: "AIRTELMONEY", label: "Airtel Money" },
  { value: "HALOPESA", label: "HaloPesa" },
];

type Status = "idle" | "sending" | "awaiting_confirmation" | "pending" | "approved" | "rejected";

function PaymentPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("MPESA");
  const [status, setStatus] = useState<Status>("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const account = getAccount();
    if (!account) { navigate({ to: "/register" }); return; }
    if (account.paid) { goAfterPayment(navigate); return; }
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    if (status !== "pending" && status !== "awaiting_confirmation") return;
    const token = getSession();
    if (!token) return;
    const timer = window.setInterval(() => {
      void checkDreamVoraPayment({ data: { token } }).then((r) => {
        if (r.paymentId) setPaymentId(String(r.paymentId));
        if (r.status === "APPROVED") { markPaid(); setStatus("approved"); goAfterPayment(navigate); }
        else if (r.status === "PENDING_ADMIN") { setStatus("pending"); setMessage("NIMELIPIA imepokelewa. Admin anaangalia malipo yako."); }
        else if (r.status === "FAILED" || r.status === "REJECTED") { setStatus("rejected"); setMessage("Malipo hayajakamilika. Jaribu tena."); }
      }).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [status, navigate]);

  async function payNow(e: React.FormEvent) {
    e.preventDefault();
    const account = getAccount();
    if (!account) { navigate({ to: "/register" }); return; }
    setStatus("sending"); setMessage(null);
    try {
      const push = await startZonmPayPayment({ data: { phone, buyerName: account.name, buyerEmail: account.email, channel } });
      const record = await createDreamVoraPayment({ data: { account: { id: account.id, name: account.name, username: account.username, phone: account.phone, email: account.email, country: account.country }, phoneUsed: phone, providerOrderId: push.orderId, reference: push.reference, channel, providerStatus: push.status } });
      if (record.token) saveSession(record.token);
      setPaymentId(record.paymentId ? String(record.paymentId) : null);
      if (record.status === "APPROVED") { markPaid(); setStatus("approved"); goAfterPayment(navigate); return; }
      setStatus("awaiting_confirmation");
      setMessage("USSD Push imetumwa kwenye simu yako. Ingiza PIN yako, kisha bonyeza NIMELIPIA.");
    } catch (err) { setStatus("rejected"); setMessage(err instanceof Error ? err.message : "Imeshindikana kuanzisha malipo."); }
  }

  async function confirmPaid() {
    const token = getSession();
    if (!token || !paymentId) { setMessage("Anza LIPA SASA kwanza."); return; }
    setStatus("pending"); setMessage(null);
    try { const r = await confirmDreamVoraPayment({ data: { token, paymentId, phoneUsed: phone } }); if (r.status === "APPROVED") { markPaid(); setStatus("approved"); goAfterPayment(navigate); } else { setMessage("Tumepokea NIMELIPIA. Admin atathibitisha malipo kabla ya account kufunguka."); } }
    catch (err) { setStatus("awaiting_confirmation"); setMessage(err instanceof Error ? err.message : "Imeshindikana kutuma uthibitisho."); }
  }

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-k-slate-50 font-jost text-k-slate-500">Inapakia...</main>;

  return <div className="payment-page min-h-screen bg-k-slate-50 font-jost text-k-slate-800">
    <header className="payment-header-bar"><span className="payment-brand">DREAMVORA <span>SITE</span></span><span className="payment-secure-pill">MALIPO SALAMA</span></header>
    <main className="payment-main">
      <div className="payment-security"><div className="payment-security-icon">🛡</div><div><h2>LINDA PESA YAKO</h2><p>USSD Push inatumwa moja kwa moja kwenye simu yako. DreamVora haiombi PIN yako.</p></div></div>
      <div className="payment-country-pill">🇹🇿 Tanzania • USSD Push</div>
      <section className="payment-summary-card">
        <div className="payment-summary-head"><div className="payment-summary-icon">⚡</div><div><h3>DreamVora</h3><p>USSD Push Payment</p></div></div>
        <div className="payment-amount-row"><span>Kiasi cha kulipa</span><strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong></div>
        <form onSubmit={payNow} className="payment-push-form">
          <label>Namba ya simu ya kulipia</label>
          <input value={phone} onChange={(e)=>setPhone(e.target.value.replace(/[^0-9+]/g,""))} inputMode="tel" placeholder="06XXXXXXXX" required disabled={status === "sending" || status === "pending"} />
          <label>Chagua mtandao</label>
          <select value={channel} onChange={(e)=>setChannel(e.target.value)} disabled={status === "sending" || status === "pending"}>{CHANNELS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select>
          {status === "awaiting_confirmation" || status === "pending" ? <button type="button" className="payment-pay-button" onClick={()=>void confirmPaid()} disabled={status === "pending"}>{status === "pending" ? "INASUBIRI ADMIN..." : "✓ NIMELIPIA"}</button> : <button type="submit" className="payment-pay-button" disabled={status === "sending"}>{status === "sending" ? "INATUMA PUSH..." : "🔒 LIPA SASA"}</button>}
        </form>
        {status === "sending" && <div className="payment-status-box payment-status-pending"><strong>Inaandaa USSD Push...</strong><span>Tafadhali subiri.</span></div>}
        {status === "awaiting_confirmation" && <div className="payment-status-box payment-status-pending"><strong>USSD PUSH IMETUMWA</strong><span>Ingiza PIN kwenye simu yako kukamilisha TZS {PAYMENT_AMOUNT.toLocaleString()}, kisha bonyeza <b>NIMELIPIA</b>.</span></div>}
        {status === "pending" && <div className="payment-status-box payment-status-pending"><strong>INASUBIRI UTHIBITISHO WA ADMIN</strong><span>{message}</span></div>}
        {status === "approved" && <div className="payment-status-box payment-status-success"><strong>MALIPO YAMEFANIKIWA ✓</strong><span>Akaunti yako imefunguka.</span></div>}
        {status === "rejected" && <div className="payment-status-box payment-status-error"><strong>MALIPO HAYAKUKAMILIKA</strong><span>{message || "Jaribu tena."}</span></div>}
      </section>
      <section className="payment-info-card"><h2>Jinsi malipo yanavyofanya kazi</h2><div className="push-steps"><div><b>1</b><span>Weka namba ya simu utakayotumia kulipia.</span></div><div><b>2</b><span>Chagua mtandao kisha bonyeza LIPA SASA.</span></div><div><b>3</b><span>USSD Push itatumwa kwenye simu. Ingiza PIN yako.</span></div><div><b>4</b><span>Baada ya kulipa, bonyeza NIMELIPIA. Admin atathibitisha malipo na kufungua account.</span></div></div><p className="payment-security-note">🔐 PIN inaingizwa kwenye simu yako pekee.</p></section>
    </main>
  </div>;
}

function goAfterPayment(navigate: ReturnType<typeof useNavigate>) { const pendingChat=getPendingChat(); if(pendingChat){clearPendingChat();navigate({to:"/chat/$name",params:{name:pendingChat}});}else navigate({to:"/dashboard"}); }
