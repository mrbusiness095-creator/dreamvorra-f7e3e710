import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { PAYMENT_AMOUNT } from "@/lib/kozena.functions";
import { checkDreamVoraPayment, submitDreamVoraPayment } from "@/lib/dreamvora.server";
import { clearPendingChat, getAccount, getPendingChat, getSession, markPaid } from "@/lib/local-storage";

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

  useEffect(() => {
    const account = getAccount();
    if (!account) {
      navigate({ to: "/register" });
      return;
    }

    if (account.paid) {
      const pendingChat = getPendingChat();
      if (pendingChat) {
        clearPendingChat();
        navigate({ to: "/chat/$name", params: { name: pendingChat } });
      } else {
        navigate({ to: "/dashboard" });
      }
      return;
    }

    setPhoneUsed(account.phone);
    setReady(true);

    const token = getSession();
    if (token) {
      void checkDreamVoraPayment({ data: { token } }).then((result) => {
        setRequestStatus(result.status === "APPROVED" ? "approved" : result.status === "REJECTED" ? "rejected" : result.status === "PENDING" ? "pending" : "idle");
        if (result.status === "APPROVED") markPaid();
      }).catch(() => undefined);
    }
  }, [navigate]);

  async function submitPaymentRequest(e: React.FormEvent) {
    e.preventDefault();
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
    if (requestStatus !== "pending") return;
    const token = getSession();
    if (!token) return;
    const timer = window.setInterval(() => {
      void checkDreamVoraPayment({ data: { token } }).then((result) => {
        if (result.status === "APPROVED") {
          markPaid();
          setRequestStatus("approved");
          const pendingChat = getPendingChat();
          if (pendingChat) { clearPendingChat(); navigate({ to: "/chat/$name", params: { name: pendingChat } }); }
          else navigate({ to: "/dashboard" });
        } else if (result.status === "REJECTED") {
          setRequestStatus("rejected");
          setPaymentMessage("Ombi la malipo limekataliwa. Hakikisha malipo yalitumwa kwenye Lipa Namba 354136248 kisha tuma ombi tena.");
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
              Lipia kupitia mfumo huu pekee. Malipo nje ya mfumo huu ni batili na hayatakubaliwa.
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

        <section id="lipa-namba" className="ussd-card" aria-labelledby="ussd-heading">
          <div className="ussd-header">
            <span id="ussd-heading">NJIA ZA MALIPO / USSD MENU</span>
            <div className="ussd-divider" />
          </div>

          <div className="ussd-intro">
            <h2>Chagua mtandao wako</h2>
            <p>Weka Lipa Namba <strong>354136248</strong> kulipia {PAYMENT_AMOUNT.toLocaleString()} TZS.</p>
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
            <h3>Thibitisha kuwa umelipia</h3>
            <p>Baada ya kutuma TZS {PAYMENT_AMOUNT.toLocaleString()} kwenye Lipa Namba <strong>354136248</strong>, weka namba iliyotumika kulipia hapa chini.</p>
            <form onSubmit={submitPaymentRequest} className="payment-verify-form">
              <input value={phoneUsed} onChange={(e) => setPhoneUsed(e.target.value.replace(/[^0-9+]/g, ""))} inputMode="tel" placeholder="06XXXXXXXX" required />
              <button type="submit" disabled={submitting || requestStatus === "pending"}>{submitting ? "Inatuma..." : requestStatus === "pending" ? "INASUBIRI UTHIBITISHO" : "NIMELIPIA"}</button>
            </form>
            {requestStatus === "pending" && <div className="payment-status pending">⏳ Ombi limepokelewa. Admin anakagua malipo yako.</div>}
            {requestStatus === "approved" && <div className="payment-status approved">✓ Malipo yameidhinishwa. Tunaelekeza kwenye Chat...</div>}
            {requestStatus === "rejected" && <div className="payment-status rejected">✕ Ombi limekataliwa. Unaweza kutuma ombi jipya baada ya kuhakikisha malipo.</div>}
            {paymentMessage && requestStatus === "idle" && <div className="payment-status pending">{paymentMessage}</div>}
          </div>
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
          Jina la Biashara: <strong>ASSERT BRIDGE</strong>
        </div>
      </div>
    </div>
  );
}

function CopyNumber() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText("354136248");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard may be unavailable on some browsers.
    }
  }

  return (
    <span className="copy-number-wrap">
      <span className="step-value">354136248</span>
      <button type="button" className="copy-btn" onClick={(event) => { event.stopPropagation(); void copy(); }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
