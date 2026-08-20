import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BackButton,
  DownloadAppPopup,
  Flag,
  Footer,
  Header,
  Modal,
  RegisterButton,
  Slogan,
  SupportWidget,
} from "@/components/dv";
import { usersDatabase } from "@/data/users";

const USERS_PER_PAGE = 9;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DreamVora Tanzania | Get Paid to Chat with Foreigners" },
      {
        name: "description",
        content:
          "DreamVora ni jukwaa la Tanzania ambapo unaunganishwa na wageni, unachati, unafundisha Kiswahili na unapata fedha mtandaoni.",
      },
      {
        property: "og:title",
        content: "DreamVora Tanzania | Get Paid to Chat with Foreigners",
      },
      {
        property: "og:description",
        content: "Connect, Learn, Earn with DreamVora Tanzania.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [withdraw, setWithdraw] = useState(false);
  const [balance, setBalance] = useState(false);

  const shuffled = useMemo(() => [...usersDatabase].sort(() => Math.random() - 0.5), []);
  const totalPages = Math.ceil(shuffled.length / USERS_PER_PAGE);
  const pageUsers = shuffled.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  const changePage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onWithdraw={() => setWithdraw(true)} onBalance={() => setBalance(true)} />
      <Slogan />

      <main className="mx-auto max-w-5xl px-3 py-4">
        <h1 className="sr-only">DreamVora Tanzania — Get paid to chat with foreigners</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageUsers.map((user) => (
            <article
              key={user.name}
              className="relative rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
            >
              <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-success text-[10px] text-primary-foreground">
                ✓
              </span>
              <div className="flex items-center gap-3">
                <img
                  src={user.img}
                  alt={user.name}
                  loading="lazy"
                  className="size-14 rounded-full object-cover ring-2 ring-accent/40"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <Flag code={user.country} /> {user.name}
                  </span>
                  <div className="text-[11px] font-semibold text-success">● online</div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="text-highlight">★</span> {user.rating}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1 rounded-xl bg-secondary p-2.5 text-[11px] text-secondary-foreground">
                <div>
                  <strong>CHAT TIME :</strong> {user.duration} minutes
                </div>
                <div>
                  <strong>WANTS :</strong> {user.wants}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate({ to: "/chat/$name", params: { name: user.name } })}
                  className="rounded-xl bg-accent px-3 py-2 text-[11px] font-bold text-accent-foreground transition hover:opacity-90"
                >
                  💬 START CHAT
                </button>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-primary">
                    TZS {user.money.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Earn USD {(user.money / 2500).toFixed(2)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={() => changePage(page - 1)}
            disabled={page === 1}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => changePage(page + 1)}
            disabled={page === totalPages}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </main>

      <Footer onWithdraw={() => setWithdraw(true)} />
      <DownloadAppPopup />
      <SupportWidget />

      <Modal
        open={withdraw}
        onClose={() => setWithdraw(false)}
        icon="👛"
        title="Withdrawal Unavailable"
      >
        <p>
          ⚠️ Unatakiwa <strong>ujisajili</strong> na ukamilishe chat ili uweze kupata fedha.
        </p>
        <p className="text-xs">📌 Kamilisha chat angalau moja na uweze kulipwa</p>
        <div className="space-y-2 pt-3">
          <RegisterButton label="Jisajili ili Kuendelea" />
          <BackButton onClick={() => setWithdraw(false)} label="Rudi Nyumbani" />
        </div>
      </Modal>

      <Modal open={balance} onClose={() => setBalance(false)} icon="👁" title="Ona Current Balance">
        <p>
          Ili uweze kuona balance yako halisi, unahitajika <strong>kujisajili</strong> kwenye akaunti
          yako.
        </p>
        <div className="space-y-2 pt-3">
          <RegisterButton />
          <BackButton onClick={() => setBalance(false)} label="Cancel" />
        </div>
      </Modal>
    </div>
  );
}
