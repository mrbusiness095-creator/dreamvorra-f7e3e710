import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getDreamVoraAccount } from "../lib/dreamvora.server";
import { clearHiddenAt, clearReturnTo, clearSession, getHiddenAt, getSession, setHiddenAt, setReturnTo, saveSession, saveServerAccount } from "../lib/local-storage";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DreamVora Site | Official DreamVora Website in Tanzania" },
      {
        name: "description",
        content:
          "DreamVora Site is the official DreamVora website in Tanzania. Connect with foreigners, chat, share culture, learn languages, and explore online earning opportunities.",
      },
      { name: "author", content: "DreamVora" },
      {
        name: "keywords",
        content:
          "DreamVora, Dream Vora, DreamVora site, DreamVora website, DreamVora Tanzania, DreamVora official site, DreamVora official website, get paid to chat with foreigners, chat with foreigners, earn money online, Tanzania",
      },
      { name: "theme-color", content: "#0d1b3e" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "DreamVora" },
      { property: "og:title", content: "DreamVora Site | Official DreamVora Website in Tanzania" },
      { property: "og:description", content: "Visit the official DreamVora Site in Tanzania to connect with foreigners, chat, share culture, learn languages, and explore online earning opportunities." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dreamvorra.site/" },
      { property: "og:site_name", content: "DreamVora" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DreamVora Site | Official DreamVora Website in Tanzania" },
      { name: "twitter:description", content: "Visit the official DreamVora Site in Tanzania to connect, learn, and explore online earning opportunities." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}


function PaidToastLoop() {
  const names = ["John", "Lameck", "Asha", "Neema", "Baraka", "Grace", "Daniel", "Rehema", "Kelvin", "Zawadi", "Brian", "Amina"];
  const amounts = [50000, 68000, 75000, 85000, 100000, 120000];
  const [toast, setToast] = useState<{ name: string; amount: number } | null>(null);
  useEffect(() => {
    let active = true; let hideTimer: number | undefined; let showTimer: number | undefined;
    const showNext = () => {
      if (!active) return;
      setToast({ name: names[Math.floor(Math.random() * names.length)], amount: amounts[Math.floor(Math.random() * amounts.length)] });
      hideTimer = window.setTimeout(() => { if (!active) return; setToast(null); showTimer = window.setTimeout(showNext, 10000); }, 3000);
    };
    showTimer = window.setTimeout(showNext, 2500);
    return () => { active = false; if (hideTimer) window.clearTimeout(hideTimer); if (showTimer) window.clearTimeout(showTimer); };
  }, []);
  if (!toast) return null;
  return <div className="fixed left-1/2 top-3 z-[200] w-[min(92vw,390px)] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl" role="status" aria-live="polite"><div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-xl">✓</div><div className="min-w-0"><div className="text-xs font-extrabold text-emerald-700">MALIPO YAMEPOKELEWA ✓</div><div className="truncate text-sm font-bold text-slate-900">{toast.name} (TZ) amelipwa TZS {toast.amount.toLocaleString()}</div><div className="text-[10px] text-slate-500">DreamVora • malipo yaliyothibitishwa</div></div></div></div>;
}

function SessionGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const protectedPath = () => {
      const path = window.location.pathname;
      return path === "/dashboard" || path === "/payment" || path.startsWith("/chat/");
    };

    const expire = () => {
      if (!getSession()) return;
      if (protectedPath()) setReturnTo(window.location.pathname + window.location.search);
      clearSession();
      clearHiddenAt();
      navigate({ to: "/login" });
    };

    const checkHiddenTime = () => {
      const hiddenAt = getHiddenAt();
      if (hiddenAt && Date.now() - hiddenAt >= 5 * 60 * 1000) expire();
      else clearHiddenAt();
    };

    checkHiddenTime();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setHiddenAt(Date.now());
      } else {
        checkHiddenTime();
      }
    };
    const onPageHide = () => setHiddenAt(Date.now());
    const onPageShow = () => checkHiddenTime();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    const refresh = window.setInterval(() => {
      if (document.visibilityState === "hidden" || !getSession()) return;
      const path = window.location.pathname;
      if (!protectedPath() || path === "/login" || path === "/register") return;
      const token = getSession();
      if (!token) return;
      void getDreamVoraAccount({ data: { token } }).then((result) => {
        saveSession(result.token);
        saveServerAccount(result.account);
      }).catch(() => expire());
    }, 2 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(refresh);
    };
  }, [navigate]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <SessionGuard />
      <PaidToastLoop />
      <Outlet />
    </QueryClientProvider>
  );
}
