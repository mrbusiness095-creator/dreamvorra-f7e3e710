import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { PAYMENT_AMOUNT } from "@/lib/kozena.functions";
import { checkAutomaticPayment, checkDreamVoraPayment, createAutomaticPayment, submitDreamVoraPayment } from "@/lib/dreamvora.server";
import { clearPendingChat, getAccount, getPendingChat, getSession, markPaid, markPaymentPending } from "@/lib/local-storage";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "Lipa — DreamVora" },
      {
        name: "description",
        content:
          "Kamilisha malipo ya DreamVora kwa Lipa Namba kupitia mitandao ya simu Tanzania.",
      },
      { property: "og:title", content: "Lipa — DreamVora" },
      {
        property: "og:description",
        content: "Lipia DreamVora kwa Lipa Namba kupitia Vodacom, Mixx by Yas, Airtel au Halopesa.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pushUnavailable, setPushUnavailable] = useState(false);
  const [phoneUsed, setPhoneUsed] = useState("");
  const [requestStatus, setRequestStatus] = useState<"idle" | "pending" | "approved" | "rejected">("idle");
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [autoPhone, setAutoPhone] = useState("");
  const [autoOrderId, setAutoOrderId] = useState<string | null>(null);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [verifyStep, setVerifyStep] = useState<"intro" | "form">("intro");
  const [paymentReminderOpen, setPaymentReminderOpen] = useState(false);

  useEffect(() => {
    const account = getAccount();
    if (!account) {
      navigate({ to: "/register" });
      return;
    }

    if (account.paid && account.accountActive !== false) {
      const pendingChat = getPendingChat();
      if (pendingChat) { clearPendingChat(); navigate({ to: "/chat/$name", params: { name: pendingChat } }); }
      else navigate({ to: "/dashboard" });
      return;
    }

    setPhoneUsed(account.phone);
    setAutoPhone(account.phone);
    if (account.paymentPendingOrderId) setAutoOrderId(account.paymentPendingOrderId);
    setReady(true);

    const token = getSession();
    if (token) {
      void checkDreamVoraPayment({ data: { token } }).then((result) => {
        setRequestStatus(result.status === "APPROVED" ? "approved" : result.status === "REJECTED" ? "rejected" : result.status === "PENDING" ? "pending" : "idle");
        if (result.status === "APPROVED") markPaid(PAYMENT_AMOUNT);
        if (result.status === "REJECTED") { setPaymentMessage("FANYA MALIPO NA JARIBU TENA"); setPaymentReminderOpen(true); }
      }).catch(() => undefined);
    }
  }, [navigate]);

  async function submitPaymentRequest(e: React.FormEvent) {
    e.preventDefault();
    if (verifyStep === "intro") {
      setPaymentReminderOpen(true);
      return;
    }
    setPaymentMessage(null);
    const token = getSession();
    if (!token) { navigate({ to: "/login" }); return; }
    setSubmitting(true);
    try {
      const result = await submitDreamVoraPayment({ data: { token, phoneUsed } });
      setRequestStatus(result.status === "APPROVED" ? "approved" : "pending");
      setPaymentMessage(result.message);
    } catch (err) {
      setPaymentMessage(err instanceof Error ? err.message : "Ombi la malipo limeshindikana.");
    } finally { setSubmitting(false); }
  }

  async function startAutomaticPayment(e: React.FormEvent) {
    e.preventDefault();
    setAutoMessage(null);
    const token = getSession();
    if (!token) { navigate({ to: "/login" }); return; }
    setAutoSubmitting(true);
    try {
      const result = await createAutomaticPayment({ data: { token, phone: autoPhone } });
      if (result.status === "SUCCESS") {
        markPaid(PAYMENT_AMOUNT);
        navigate({ to: "/dashboard" });
        return;
      }
      if (result.orderId) {
        setAutoOrderId(result.orderId);
        markPaymentPending(result.orderId ?? undefined);
        setAutoMessage("Malipo yanasubiri uthibitisho. Tafadhali subiri hapa hadi malipo yakamilike.");
      }
    } catch (err) {
      setAutoMessage(err instanceof Error ? err.message : "Malipo hayajaanzishwa. Jaribu tena.");
    } finally { setAutoSubmitting(false); }
  }

  function handlePayNow() {
    setPushUnavailable(true);

    window.setTimeout(() => {
      setPushUnavailable(false);
      document.getElementById("lipa-namba")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 1700);
  }

  useEffect(() => {
    if (!autoOrderId) return;
    const token = getSession();
    if (!token) return;
    let stopped = false;
    const poll = () => void checkAutomaticPayment({ data: { token, orderId: autoOrderId } }).then((result) => {
      if (stopped) return;
      if (result.status === "SUCCESS") {
        markPaid(PAYMENT_AMOUNT);
        setAutoMessage("Malipo yamefanikiwa. Unaelekezwa Dashboard...");
        setTimeout(() => navigate({ to: "/dashboard" }), 500);
      } else if (["FAILED","CANCELLED","USERCANCELLED","REJECTED"].includes(result.status)) {
        clearPendingChat();
        markPaymentPending(undefined);
        setAutoOrderId(null);
        setAutoMessage("Malipo hayajakamilika. Fanya malipo na ujaribu tena.");
      }
    }).catch(() => undefined);
    poll();
    const timer = window.setInterval(poll, 5000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [autoOrderId, navigate]);

  useEffect(() => {
    if (requestStatus !== "pending") return;
    const token = getSession();
    if (!token) return;
    const timer = window.setInterval(() => {
      void checkDreamVoraPayment({ data: { token } }).then((result) => {
        if (result.status === "APPROVED") {
          markPaid(PAYMENT_AMOUNT);
          setRequestStatus("approved");
          const pendingChat = getPendingChat();
          if (pendingChat) { clearPendingChat(); navigate({ to: "/chat/$name", params: { name: pendingChat } }); }
          else navigate({ to: "/dashboard" });
        } else if (result.status === "REJECTED") {
          setRequestStatus("rejected");
          setPaymentMessage("Malipo hayajaidhinishwa. Fanya malipo na ujaribu tena.");
          setPaymentReminderOpen(true);
        }
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [requestStatus, navigate]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-k-slate-50 font-jost text-k-slate-500">
        Inapakia...
      </main>
    );
  }

  return (
    <div className="payment-page min-h-screen bg-k-slate-50 font-jost text-k-slate-800">
      {pushUnavailable && (
        <div className="payment-modal-backdrop" role="alertdialog" aria-modal="true" aria-label="USSD Push haipatikani">
          <div className="payment-modal">
            <div className="payment-modal-icon">!</div>
            <h2>NJIA YA USSD PUSH HAIPATIKANI KWA SASA</h2>
            <p>TUMIA LIPA NAMBA</p>
            <div className="payment-modal-loader" aria-hidden="true" />
          </div>
        </div>
      )}

      <header className="payment-header-bar">
        <span className="payment-brand">
          DREAMVORA <span>SITE</span>
        </span>
        <span className="payment-secure-pill">MALIPO SALAMA</span>
      </header>

      <main className="payment-main">
        <div className="payment-security">
          <div className="payment-security-icon">🛡</div>
          <div>
            <h2>LINDA PESA YAKO</h2>
            <p>
              Lipia kupitia mfumo huu pekee. Malipo nje ya mfumo huu ni batili na hayatakubaliwa
              OFA YA LEO LIPIA ELF 12,000TZS.
            </p>
          </div>
        </div>

        <div className="payment-country-pill">🇹🇿 Tanzania</div>

        <section className="payment-summary-card">
          <div className="payment-summary-head">
            <div className="payment-summary-icon">⚡</div>
            <div>
              <h3>Tanzania</h3>
              <p>Lipa kwa Lipa Namba</p>
            </div>
          </div>

          <div className="payment-amount-row">
            <span>Kiasi cha kulipa</span>
            <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong>
          </div>

          <button type="button" onClick={handlePayNow} className="payment-pay-button">
            🔒 LIPA SASA
          </button>
        </section>

        <section className="payment-summary-card" aria-labelledby="automatic-payment-heading">
          <div className="payment-summary-head">
            <div className="payment-summary-icon">⚡</div>
            <div>
              <h3 id="automatic-payment-heading">Malipo ya moja kwa moja</h3>
              <p>Thibitisha kwenye simu yako</p>
            </div>
          </div>
          <p className="px-4 pb-3 text-sm text-slate-600">Weka namba ya simu utakayotumia. Utatumiwa ombi la malipo kwenye simu yako.</p>
          <form onSubmit={startAutomaticPayment} className="px-4 pb-4">
            <input value={autoPhone} onChange={(e) => setAutoPhone(e.target.value.replace(/[^0-9+]/g, ""))} inputMode="tel" placeholder="06XXXXXXXX" required className="k-field w-full rounded-xl border border-slate-200 px-4 py-3" />
            <button type="submit" disabled={autoSubmitting} className="payment-pay-button mt-3">
              {autoSubmitting ? "INATUMA..." : "LIPA KWA SIMU"}
            </button>
          </form>
          {autoMessage && <div className="payment-status pending mx-4 mb-4">{autoMessage}</div>}
        </section>

        <section id="lipa-namba" className="ussd-card" aria-labelledby="ussd-heading">
          <div className="ussd-header">
            <span id="ussd-heading">NJIA ZA MALIPO / USSD MENU</span>
            <div className="ussd-divider" />
          </div>

          <div className="ussd-intro">
            <h2>Chagua mtandao wako</h2>
            <p>Weka Lipa Namba <strong>251226427</strong> kulipia {PAYMENT_AMOUNT.toLocaleString()} TZS.</p>
          </div>

          <Operator
            id="op-voda"
            logo="https://brandlogos.net/wp-content/uploads/2025/04/vodacom-logo_brandlogos.net_4uzfe.png"
            alt="Vodacom"
            name="Vodacom M-Pesa"
            ussd="*150*00#"
            highlightIndex={3}
            steps={[
              <>Bonyeza <strong>*150*00#</strong></>,
              <>Chagua <strong>Lipa kwa M-PESA</strong></>,
              <>Chagua <strong>LIPA KWA SIMU HALOPESA</strong></>,
              <>Weka LIPA NAMBA: <CopyNumber /></>,
              <>Weka kiasi <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong></>,
              <>Weka namba ya siri</>,
            ]}
          />

          <Operator
            id="op-tigo"
            logo="https://www.uminolan.co.tz/assets/images/supa-agent/mixx-by-yas-seeklogo2.png"
            alt="Mixx by Yas"
            name="Mixx by Yas"
            ussd="*150*01#"
            highlightIndex={4}
            steps={[
              <>Bonyeza <strong>*150*01#</strong></>,
              <>Chagua <strong>Lipa kwa simu</strong></>,
              <>Chagua <strong>Kwenda mitandao mingine</strong></>,
              <>Chagua <strong>HALOPESA</strong></>,
              <>Weka LIPA NAMBA: <CopyNumber /></>,
              <>Weka kiasi <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong></>,
              <>Weka namba ya siri</>,
            ]}
          />

          <Operator
            id="op-airtel"
            logo="https://nikulipe.com/wp-content/uploads/2022/09/Airtel_logo_PNG1.png"
            alt="Airtel"
            name="Airtel Money"
            ussd="*150*60#"
            highlightIndex={5}
            steps={[
              <>Bonyeza <strong>*150*60#</strong></>,
              <>Chagua <strong>Lipia Bili</strong></>,
              <>Chagua <strong>LIPA KWA SIMU (MITANDAO YOTE)</strong></>,
              <>Chagua <strong>LIPA KWA HALOPESA</strong></>,
              <>Weka kiasi <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong></>,
              <>Ingiza kumbukumbu ya malipo: <CopyNumber /></>,
              <>Ingiza namba ya siri kuruhusu muamala</>,
            ]}
          />

          <Operator
            id="op-halo"
            logo="https://halopesa.co.tz/images/applications-system.png"
            alt="Halopesa"
            name="Halopesa"
            ussd="*150*88#"
            highlightIndex={3}
            steps={[
              <>Bonyeza <strong>*150*88#</strong></>,
              <>Chagua namba <strong>(5) Lipia Bidhaa</strong></>,
              <>Chagua <strong>HALOPESA</strong></>,
              <>Weka namba ya malipo: <CopyNumber /></>,
              <>Weka kiasi <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong></>,
              <>Ingiza namba ya siri</>,
              <>Bonyeza <strong>1</strong> kuruhusu muamala</>,
            ]}
          />

          <div className="payment-verify-box">
            {verifyStep === "intro" ? (
              <div className="payment-verify-intro">
                <div className="payment-verify-icon" aria-hidden="true">✓</div>
                <h3>Umeshafanya malipo?</h3>
                <p>Ukishamaliza malipo, gusa <strong>NIMELIPIA</strong> tena ili kuweka namba ya simu uliyotumia kulipia.</p>
                <form onSubmit={submitPaymentRequest} className="payment-verify-form payment-verify-single">
                  <button type="submit" className="payment-verify-start">NIMELIPIA</button>
                </form>
              </div>
            ) : (
              <>
                <h3>Thibitisha kuwa umelipia</h3>
                <p>Baada ya kufanya malipo ya TZS {PAYMENT_AMOUNT.toLocaleString()}, weka namba iliyotumika kulipia hapa chini kisha gusa <strong>NIMELIPIA</strong>.</p>
                <form onSubmit={submitPaymentRequest} className="payment-verify-form">
                  <input value={phoneUsed} onChange={(e) => setPhoneUsed(e.target.value.replace(/[^0-9+]/g, ""))} inputMode="tel" placeholder="06XXXXXXXX" required />
                  <button type="submit" disabled={submitting || requestStatus === "pending"}>{submitting ? "Inatuma..." : requestStatus === "pending" ? "INASUBIRI UTHIBITISHO" : "NIMELIPIA"}</button>
                </form>
                {requestStatus === "pending" && <div className="payment-status pending">⏳ Ombi limepokelewa. Admin anakagua malipo yako.</div>}
                {requestStatus === "approved" && <div className="payment-status approved">✓ Malipo yameidhinishwa. Tunaelekeza kwenye Chat...</div>}
                {requestStatus === "rejected" && <div className="payment-status rejected">✕ Ombi limekataliwa. Fanya MALIPO kisha ujaribu tena.</div>}
                {paymentMessage && requestStatus === "idle" && <div className="payment-status pending">{paymentMessage}</div>}
              </>
            )}
          </div>

          {paymentReminderOpen && (
            <div className="payment-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="payment-reminder-title">
              <div className="payment-confirm-modal">
                <button type="button" className="payment-confirm-close" aria-label="Funga" onClick={() => setPaymentReminderOpen(false)}>×</button>
                <div className="payment-confirm-icon" aria-hidden="true">▰</div>
                <h2 id="payment-reminder-title">FANYA MALIPO KISHA<br />JARIBU TENA</h2>
                <p>Kamilisha malipo ya TZS {PAYMENT_AMOUNT.toLocaleString()} kwa kutumia njia ya malipo iliyo hapo juu.</p>
                <button type="button" className="payment-confirm-button" onClick={() => { setPaymentReminderOpen(false); setVerifyStep("form"); }}>Sawa</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

type OperatorProps = {
  id: string;
  logo: string;
  alt: string;
  name: string;
  ussd: string;
  steps: ReactNode[];
  highlightIndex: number;
};

function Operator({ id, logo, alt, name, ussd, steps, highlightIndex }: OperatorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`operator-item ${open ? "is-open" : ""}`} id={id}>
      <button type="button" className="operator-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div className="operator-logo-wrap">
          <img src={logo} alt={alt} loading="lazy" />
        </div>
        <div className="operator-copy">
          <div className="operator-name">{name}</div>
          <div className="operator-ussd">{ussd}</div>
        </div>
        <svg className="chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="operator-steps" hidden={!open}>
        <ul className="steps-list">
          {steps.map((step, index) => (
            <li className={`step-row ${index === highlightIndex ? "highlight" : ""}`} key={`${id}-${index}`}>
              <span className="step-num">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
        <div className="biz-tag">
          Jina la Biashara: <strong>INOCENT EDWARD</strong>
        </div>
      </div>
    </div>
  );
}

function CopyNumber() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText("251226427");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard may be unavailable on some browsers.
    }
  }

  return (
    <span className="copy-number-wrap">
      <span className="step-value">251226427</span>
      <button type="button" className="copy-btn" onClick={(event) => { event.stopPropagation(); void copy(); }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
