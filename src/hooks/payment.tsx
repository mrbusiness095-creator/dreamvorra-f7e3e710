import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { startZonmPayPayment, PAYMENT_AMOUNT } from "@/lib/zonmpay.functions";
import { checkDreamVoraPayment, confirmDreamVoraPayment, createDreamVoraPayment } from "@/lib/dreamvora.server";
import { clearPendingChat, getAccount, getPendingChat, getSession, markPaid } from "@/lib/local-storage";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [
    { title: "Lipa — DreamVora" },
    { name: "description", content: "Lipia DreamVora kwa USSD Push ya ZonmPay." },
    { property: "og:title", content: "Lipa — DreamVora" },
    { property: "og:description", content: "Lipia DreamVora kwa USSD Push." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PaymentPage,
});

const CHANNELS = [
  { value: "MPESA", label: "Vodacom M-Pesa" },
  { value: "TIGOPESA", label: "Mixx by Yas" },
  { value: "AIRTEL", label: "Airtel Money" },
  { value: "HALOPESA", label: "Halopesa" },
];

type PaymentStatus = "idle" | "sending" | "awaiting_confirmation" | "pending" | "approved" | "rejected";

function PaymentPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("MPESA");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const account = getAccount();
    const token = getSession();
    if (!account || !token) { navigate({ to: "/register" }); return; }
    if (account.paid) { goAfterPayment(navigate); return; }
    setPhone(account.phone);
    setReady(true);
    void checkDreamVoraPayment({ data: { token } }).then((result) => {
      setPaymentId(result.paymentId ? String(result.paymentId) : null);
      if (result.status === "APPROVED") { markPaid(PAYMENT_AMOUNT); goAfterPayment(navigate); return; }
      if (result.status === "PENDING_ADMIN") setStatus("pending");
      else if (result.status === "PUSH_SENT") setStatus("awaiting_confirmation");
      else if (result.status === "FAILED" || result.status === "REJECTED") setStatus("rejected");
    }).catch(() => undefined);
  }, [navigate]);

  useEffect(() => {
    if (status !== "pending" && status !== "awaiting_confirmation") return;
    const token = getSession();
    if (!token) return;
    const timer = window.setInterval(() => {
      void checkDreamVoraPayment({ data: { token } }).then((result) => {
        setPaymentId(result.paymentId ? String(result.paymentId) : null);
        if (result.status === "APPROVED") {
          markPaid(PAYMENT_AMOUNT);
          setStatus("approved");
          goAfterPayment(navigate);
        } else if (result.status === "REJECTED" || result.status === "FAILED") {
          setStatus("rejected");
          setMessage("Malipo hayajakubaliwa. Unaweza kujaribu tena.");
        } else if (result.status === "PENDING_ADMIN") {
          setStatus("pending");
          setMessage("Tumepokea NIMELIPIA. Admin anaangalia malipo yako.");
        }
      }).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [status, navigate]);

  async function payNow(e: React.FormEvent) {
    e.preventDefault();
    const token = getSession();
    const account = getAccount();
    if (!token || !account) { navigate({ to: "/login" }); return; }
    setMessage(null); setStatus("sending");
    try {
      const push = await startZonmPayPayment({ data: { phone, buyerName: account.name, buyerEmail: account.email, channel } });
      const record = await createDreamVoraPayment({ data: { token, phoneUsed: phone, providerOrderId: push.orderId, reference: push.reference, channel, providerStatus: push.status } });
      setPaymentId(record.paymentId ? String(record.paymentId) : null);
      setStatus("awaiting_confirmation");
      setMessage("USSD Push imetumwa kwenye simu yako. Lipa kwa PIN yako, kisha bonyeza NIMELIPIA hapa chini.");
    } catch (err) {
      setStatus("rejected");
      setMessage(err instanceof Error ? err.message : "Imeshindikana kuanzisha malipo.");
    }
  }

  async function confirmPaid() {
    const token = getSession();
    if (!token || !paymentId) { setMessage("Anza malipo kwanza kisha bonyeza NIMELIPIA."); return; }
    setMessage(null); setStatus("pending");
    try {
      const result = await confirmDreamVoraPayment({ data: { token, paymentId, phoneUsed: phone } });
      if (result.status === "APPROVED") { markPaid(PAYMENT_AMOUNT); setStatus("approved"); goAfterPayment(navigate); return; }
      setStatus("pending");
      setMessage("Tumepokea taarifa yako. Admin ataangalia malipo na akithibitisha account itafunguka.");
    } catch (err) {
      setStatus("awaiting_confirmation");
      setMessage(err instanceof Error ? err.message : "Imeshindikana kutuma uthibitisho.");
    }
  }

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-k-slate-50 font-jost text-k-slate-500">Inapakia...</main>;

  return <div className="payment-page min-h-screen bg-k-slate-50 font-jost text-k-slate-800">
    <header className="payment-header-bar"><span className="payment-brand">DREAMVORA <span>SITE</span></span><span className="payment-secure-pill">MALIPO SALAMA</span></header>
    <main className="payment-main">
      <div className="payment-security"><div className="payment-security-icon">🛡</div><div><h2>LINDA PESA YAKO</h2><p>Malipo yanaanzishwa moja kwa moja kupitia ZonmPay. Usishiriki PIN yako na mtu.</p></div></div>
      <div className="payment-country-pill">🇹🇿 Tanzania • USSD Push</div>
      <section className="payment-summary-card">
        <div className="payment-summary-head"><div className="payment-summary-icon">⚡</div><div><h3>DreamVora</h3><p>USSD Push Payment</p></div></div>
        <div className="payment-amount-row"><span>Kiasi cha kulipa</span><strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong></div>
        <form onSubmit={payNow} className="payment-push-form">
          <label>Namba ya simu ya kulipia</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))} inputMode="tel" placeholder="06XXXXXXXX" required disabled={status === "sending" || status === "pending"} />
          <label>Chagua mtandao</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} disabled={status === "sending" || status === "pending"}>{CHANNELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          {status === "awaiting_confirmation" || status === "pending" || status === "approved" ? <button type="button" className="payment-pay-button" onClick={()=>void confirmPaid()} disabled={status !== "awaiting_confirmation"}>{status === "pending" ? "INASUBIRI ADMIN..." : "✓ NIMELIPIA"}</button> : <button type="submit" className="payment-pay-button" disabled={status === "sending"}>{status === "sending" ? "INATUMA PUSH..." : "🔒 LIPA SASA"}</button>}
        </form>
        {status === "sending" && <div className="payment-status-box payment-status-pending"><strong>Inaandaa USSD Push...</strong><span>Tafadhali subiri.</span></div>}
        {status === "awaiting_confirmation" && <div className="payment-status-box payment-status-pending"><strong>USSD PUSH IMETUMWA</strong><span>Ingiza PIN kwenye simu yako kukamilisha TZS {PAYMENT_AMOUNT.toLocaleString()}, kisha bonyeza <b>NIMELIPIA</b>.</span></div>}
        {status === "pending" && <div className="payment-status-box payment-status-pending"><strong>IMETUMWA KWA ADMIN</strong><span>{message || "Tumepokea uthibitisho wako. Admin anaangalia malipo."}</span></div>}
        {status === "approved" && <div className="payment-status-box payment-status-success"><strong>MALIPO YAMEFANIKIWA ✓</strong><span>Akaunti yako imefunguka. Tunaelekeza kwenye Chat...</span></div>}
        {status === "rejected" && <div className="payment-status-box payment-status-error"><strong>MALIPO HAYAKUKAMILIKA</strong><span>{message || "Jaribu tena."}</span></div>}
      </section>
      <section className="payment-info-card"><h2>Jinsi malipo yanavyofanya kazi</h2><div className="push-steps"><div><b>1</b><span>Weka namba ya simu unayotumia kulipia.</span></div><div><b>2</b><span>Chagua mtandao wako kisha bonyeza LIPA SASA.</span></div><div><b>3</b><span>USSD Push itatumwa moja kwa moja kwenye simu. Ingiza PIN yako.</span></div><div><b>4</b><span>Baada ya kulipa, bonyeza NIMELIPIA. Admin atathibitisha malipo na kufungua account.</span></div></div><p className="payment-security-note">🔐 DreamVora haiombi PIN yako. PIN inaingizwa kwenye simu yako pekee.</p></section>
    </main>
  </div>;
}

function goAfterPayment(navigate: ReturnType<typeof useNavigate>) {
  const pendingChat = getPendingChat();
  if (pendingChat) { clearPendingChat(); navigate({ to: "/chat/$name", params: { name: pendingChat } }); }
  else navigate({ to: "/dashboard" });
}
