import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flag, Modal, RegisterButton, BackButton } from "@/components/dv";
import { usersDatabase } from "@/data/users";

const USERS_PER_PAGE = 9;
const SITE_URL = "https://dreamvorra.site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DreamVora site|Official site" },
      {
        name: "description",
        content:
          "DreamVora is a Tanzania online platform where users can connect with foreigners, chat, learn languages, share culture, and discover earning opportunities online.",
      },
      {
        name: "keywords",
        content:
          "DreamVora, DreamVora Tanzania, dream vora site, dream vora, dreamvorra, get paid to chat, chat with foreigners, online earning Tanzania, Swahili chat platform, Tanzania online jobs",
      },
      { name: "author", content: "DreamVora" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "DreamVora Tanzania | Get Paid to Chat with Foreigners" },
      {
        property: "og:description",
        content: "Connect, Learn, Earn with DreamVora Tanzania.",
      },
      { property: "og:image", content: `${SITE_URL}/assets/images/dreamvora-logo.png` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DreamVora Tanzania" },
      {
        name: "twitter:description",
        content: "Get paid to chat with foreigners, learn languages, and earn money.",
      },
      { name: "twitter:image", content: `${SITE_URL}/assets/images/dreamvora-logo.png` },
      { name: "theme-color", content: "#0d1b3e" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: Index,
});

function HomeHeader({
  onWithdraw,
  onBalance,
}: {
  onWithdraw: () => void;
  onBalance: () => void;
}) {
  const [online, setOnline] = useState(2535);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const change = Math.floor(Math.random() * 6) + 4;
      setOnline((value) => (Math.random() > 0.5 ? value + change : value - change));
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="dv-home-header">
      <a href="/" className="dv-home-logo-link" aria-label="DreamVora Home">
        <img src="/assets/images/dreamvora-logo.png" alt="DreamVora Logo" className="dv-home-logo" />
      </a>

      <div className="dv-home-online">
        <span className="dv-home-online-dot" />
        <span>{online.toLocaleString()} live</span>
      </div>

      <div className="dv-home-header-right">
        <button className="dv-home-withdraw" onClick={onWithdraw}>
          💰 Withdraw
        </button>
        <button className="dv-home-wallet" onClick={onBalance}>
          <span className="dv-home-wallet-title">CURRENT BALANCE</span>
          <span className="dv-home-wallet-amount">👁 •••••</span>
        </button>
      </div>
    </header>
  );
}

function HomeFooter({
  onWithdraw,
  onContact,
}: {
  onWithdraw: () => void;
  onContact: () => void;
}) {
  return (
    <footer className="dv-home-footer">
      <div className="dv-home-footer-content">
        <div>
          <img
            src="/assets/images/dreamvora-logo-white.png"
            alt="DreamVora"
            className="dv-home-footer-logo"
          />
          <p>
            Connect, Learn, Earn.
            <br />
            Get paid to chat with foreigners.
            <br />
            Share your culture and earn money.
          </p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/">🏠 Home</a></li>
            <li><button onClick={onWithdraw}>💰 Withdraw</button></li>
            <li><button onClick={onContact}>💬 Contact Us</button></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <p>📱 <button onClick={onContact}>Contact Options</button></p>
        </div>
      </div>
      <div className="dv-home-footer-bottom">© 2026 DreamVora · Connect, Learn, Earn.</div>
    </footer>
  );
}

function Index() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [withdraw, setWithdraw] = useState(false);
  const [balance, setBalance] = useState(false);
  const [contact, setContact] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice?.finally?.(() => setInstallPrompt(null));
      return;
    }
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    window.alert(
      isIOS
        ? 'Bonyeza Share kisha "Add to Home Screen"'
        : 'Tumia menu (⋮) ya kivinjari chako kisha "Install app"',
    );
  };

  const shuffled = useMemo(
    () => [...usersDatabase].sort(() => Math.random() - 0.5),
    [],
  );
  const totalPages = Math.ceil(shuffled.length / USERS_PER_PAGE);
  const pageUsers = shuffled.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="dv-home">
      <HomeHeader onWithdraw={() => setWithdraw(true)} onBalance={() => setBalance(true)} />

      <section className="dv-home-slogan">
        <p>
          🌍 Foreigners are ready to pay for your time
          <br />
          <span>make atleast TZS 50,000 up to TZS 100,000 per day</span>
        </p>
      </section>

      <main className="dv-home-main">
        <h1 className="sr-only">DreamVora Tanzania — Get paid to chat with foreigners</h1>
        <div className="dv-home-grid">
          {pageUsers.map((user) => (
            <article key={user.name} className="dv-home-card">
              <span className="dv-home-verified">✓</span>
              <div className="dv-home-card-top">
                <img src={user.img} alt={user.name} loading="lazy" className="dv-home-profile" />
                <div className="dv-home-user-info">
                  <span className="dv-home-user-name">
                    <Flag code={user.country} size={22} /> {user.name}
                  </span>
                  <div className="dv-home-status">● online</div>
                  <div className="dv-home-rating">★ <span>{user.rating}</span></div>
                </div>
              </div>

              <div className="dv-home-details">
                <div><strong>CHAT TIME :</strong> {user.duration} minutes</div>
                <div><strong>WANTS :</strong> {user.wants}</div>
              </div>

              <div className="dv-home-action">
                <button
                  className="dv-home-chat"
                  onClick={() =>
                    navigate({ to: "/chat/$name", params: { name: user.name } })
                  }
                >
                  💬 START CHAT
                </button>
                <div className="dv-home-price">
                  <div>TZS {user.money.toLocaleString()}</div>
                  <small>Earn USD {(user.money / 2500).toFixed(2)}</small>
                </div>
              </div>
            </article>
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="dv-home-pagination" aria-label="Pagination">
            <button
              className="dv-home-step-arrow"
              onClick={() => changePage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            >
              ‹
            </button>
            <div className="dv-home-steps">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <span key={number} className="dv-home-step-wrap">
                  <button
                    className={`dv-home-step-circle ${
                      number <= page ? "filled" : "outline"
                    } ${number === page ? "current" : ""}`}
                    onClick={() => changePage(number)}
                    aria-label={`Page ${number}`}
                    aria-current={number === page ? "page" : undefined}
                  >
                    {number}
                  </button>
                  {number < totalPages && (
                    <span
                      className={`dv-home-connector ${
                        number < page ? "filled" : "outline"
                      }`}
                    />
                  )}
                </span>
              ))}
            </div>
            <button
              className="dv-home-step-arrow"
              onClick={() => changePage(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              ›
            </button>
          </nav>
        )}
      </main>

      <HomeFooter
        onWithdraw={() => setWithdraw(true)}
        onContact={() => setContact(true)}
      />


      <Modal
        open={withdraw}
        onClose={() => setWithdraw(false)}
        icon="👛"
        title="Withdrawal Unavailable"
      >
        <p>⚠️ Unatakiwa <strong>ujisajili</strong> na ukamilishe chat ili uweze kupata fedha.</p>
        <p className="text-xs">📌 Kamilisha chat angalau moja na uweze kulipwa</p>
        <div className="space-y-2 pt-3">
          <RegisterButton label="Jisajili ili Kuendelea" />
          <BackButton onClick={() => setWithdraw(false)} label="Rudi Nyumbani" />
        </div>
      </Modal>

      <Modal
        open={balance}
        onClose={() => setBalance(false)}
        icon="👁"
        title="Ona Current Balance"
      >
        <p>
          Ili uweze kuona balance yako halisi, unahitajika <strong>kujisajili</strong> kwenye akaunti yako.
        </p>
        <div className="space-y-2 pt-3">
          <RegisterButton />
          <BackButton onClick={() => setBalance(false)} label="Cancel" />
        </div>
      </Modal>

      <Modal
        open={contact}
        onClose={() => setContact(false)}
        icon="☎"
        title="Contact Customer Support"
      >
        <p className="text-sm">Choose how you want to reach us</p>
        <div className="dv-home-contact-options">
          <a
            href="https://whatsapp.com/channel/0029VbCV06a4Y9luvN14gz10"
            target="_blank"
            rel="noreferrer"
          >
            💬 <span><strong>Follow WhatsApp Channel</strong><small>Connect with our community and get support</small></span> →
          </a>
          <a href="sms:+255747741813?body=Habari,%20nina%20swali%20kuhusu%20dreamvora">
            💬 <span><strong>Send SMS</strong><small>Send us a text message (Tuma Ujumbe)</small></span> →
          </a>
        </div>
        <BackButton onClick={() => setContact(false)} label="Close" />
      </Modal>

      <div className="dv-home-download">
        <button onClick={installApp}>
          ⬇ <span>Download DreamVora App</span>
        </button>
      </div>
    </div>
  );
}
