import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/dreamvora-logo.png.asset.json";


export function redirectToRegister() {
  window.location.href = "/register";
}

export function Flag({ code, size = 22 }: { code: string; size?: number }) {
  const c = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/48x36/${c}.png`}
      srcSet={`https://flagcdn.com/96x72/${c}.png 2x`}
      width={size}
      alt={code}
      loading="lazy"
      className="inline-block rounded-[2px] align-[-2px]"
    />
  );
}

export function Header({ onWithdraw, onBalance, currentBalance }: { onWithdraw: () => void; onBalance: () => void; currentBalance?: number | null }) {
  const [online, setOnline] = useState(2535);

  useEffect(() => {
    const t = setInterval(() => {
      const change = Math.floor(Math.random() * 6) + 4;
      setOnline((v) => (Math.random() > 0.5 ? v + change : v - change));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 shadow-[var(--shadow-header)]">
      <Link to="/" className="shrink-0">
        <img src={logo.url} alt="DreamVora" className="h-9 w-auto" />
      </Link>

      <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
        <span className="size-2 animate-pulse rounded-full bg-success" />
        <span>{online.toLocaleString()} live</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onWithdraw}
          className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground transition hover:opacity-90"
        >
          💰 Withdraw
        </button>
        <button
          onClick={onBalance}
          className="flex flex-col items-start rounded-lg bg-secondary px-2.5 py-1 text-left"
        >
          <span className="text-[8px] font-semibold tracking-wide text-muted-foreground">
            CURRENT BALANCE
          </span>
          <span className="text-xs font-bold text-foreground">{typeof currentBalance === "number" ? `TZS ${currentBalance.toLocaleString()}` : "👁 •••••"}</span>
        </button>
      </div>
    </header>
  );
}

export function Slogan() {
  return (
    <div className="bg-[image:var(--gradient-brand)] px-4 py-3 text-center text-primary-foreground">
      <p className="text-[13px] leading-snug font-medium">
        🌍 Foreigners are ready to pay for your time
        <br />
        <span className="font-extrabold text-highlight">
          make atleast TZS 50,000 up to TZS 100,000 per day
        </span>
      </p>
    </div>
  );
}

export function Footer({ onWithdraw }: { onWithdraw: () => void }) {
  return (
    <footer className="mt-8 bg-[image:var(--gradient-brand)] px-5 py-8 text-primary-foreground">
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
        <div>
          <img src={logo.url} alt="DreamVora" className="mb-3 h-10 w-auto rounded-md bg-background p-1" />
          <p className="text-xs leading-relaxed opacity-80">
            Connect, Learn, Earn.
            <br />
            Get paid to chat with foreigners.
            <br />
            Share your culture and earn money.
          </p>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-bold">Quick Links</h4>
          <ul className="space-y-1.5 text-xs opacity-80">
            <li>
              <Link to="/">🏠 Home</Link>
            </li>
            <li>
              <button onClick={onWithdraw}>💰 Withdraw</button>
            </li>
            <li>
              <Link to="/register">📝 Jisajili</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-6 border-t border-primary-foreground/15 pt-4 text-center text-[11px] opacity-70">
        <p>© 2026 DreamVora · Connect, Learn, Earn.</p>
      </div>
    </footer>
  );
}

export function Modal({
  open,
  onClose,
  icon,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon: string;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-[var(--shadow-modal)]">
        <button
          onClick={onClose}
          aria-label="Funga"
          className="absolute top-2 right-3 text-xl text-muted-foreground"
        >
          ×
        </button>
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-2xl">
          {icon}
        </div>
        <h2 className="mb-2 text-lg font-bold text-foreground">{title}</h2>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function RegisterButton({ label = "Jisajili" }: { label?: string }) {
  return (
    <button
      onClick={redirectToRegister}
      className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:opacity-90"
    >
      {label}
    </button>
  );
}

export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
    >
      {label}
    </button>
  );
}

export function DownloadAppPopup() {
  return <DownloadAppPopupInner />;
}

function DownloadAppPopupInner() {
  const [hidden, setHidden] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setHidden(true));
    if (window.matchMedia("(display-mode: standalone)").matches) setHidden(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden) return null;

  const install = () => {
    if (prompt) {
      prompt.prompt();
      prompt.userChoice?.finally?.(() => setPrompt(null));
      return;
    }
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    setToast(
      isIOS
        ? 'Bonyeza Share kisha "Add to Home Screen"'
        : 'Tumia menu (⋮) ya kivinjari chako kisha "Install app"',
    );
    setTimeout(() => setToast(""), 3800);
  };

  return (
    <>
      <div className="fixed bottom-4 left-3 z-40 flex items-center gap-1">
        <button
          onClick={install}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2.5 text-[11px] font-bold text-primary-foreground shadow-[var(--shadow-modal)]"
        >
          ⬇ <span>Download DreamVora App</span>
        </button>
        <button
          onClick={() => setHidden(true)}
          aria-label="Funga"
          className="size-5 rounded-full bg-secondary text-[10px] text-secondary-foreground"
        >
          ×
        </button>
      </div>
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-xs text-background">
          {toast}
        </div>
      )}
    </>
  );
}