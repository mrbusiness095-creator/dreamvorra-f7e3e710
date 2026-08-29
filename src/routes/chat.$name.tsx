import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackButton, Flag, Header, Modal, RegisterButton } from "@/components/dv";
import { findUser, firstMessageBroken } from "@/data/users";
import { addEarnings, getAccount } from "@/lib/local-storage";

export const Route = createFileRoute("/chat/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `Chat na ${params.name} | DreamVora Tanzania` },
      {
        name: "description",
        content: `Anza mazungumzo na ${params.name} kwenye DreamVora na upate malipo kwa kuchati na wageni.`,
      },
      { property: "og:title", content: `Chat na ${params.name} | DreamVora` },
      {
        property: "og:description",
        content: "Get paid to chat with foreigners on DreamVora Tanzania.",
      },
    ],
  }),
  component: ChatPage,
});

function formatNowTime() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date());
}

function ChatPage() {
  const { name } = useParams({ from: "/chat/$name" });
  const navigate = useNavigate();
  const user = findUser(name);

  const [time, setTime] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [balance, setBalance] = useState(false);
  const [text, setText] = useState("");
  const [paid, setPaid] = useState(false);
  const [earned, setEarned] = useState(false);

  useEffect(() => {
    const account = getAccount();
    if (!account) {
      navigate({ to: "/register" });
      return;
    }
    if (!account.paid) {
      navigate({ to: "/payment" });
      return;
    }
    setPaid(true);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const key = `dreamvora_chat_state_${user.name}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      setTime(saved);
      return;
    }
    const t = setTimeout(() => {
      const now = formatNowTime();
      sessionStorage.setItem(key, now);
      setTime(now);
    }, 10000);
    return () => clearTimeout(t);
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Mtumiaji hakupatikana.</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
        >
          Rudi Nyumbani
        </button>
      </div>
    );
  }

  const send = () => {
    if (!text.trim()) return;
    if (!earned) {
      addEarnings(user.money);
      setEarned(true);
    }
    setLocked(false);
    setText("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onWithdraw={() => setWithdraw(true)} onBalance={() => setBalance(true)} />

      <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2">
        <button onClick={() => navigate({ to: "/" })} aria-label="Rudi" className="text-lg">
          ←
        </button>
        <img src={user.img} alt={user.name} className="size-9 rounded-full object-cover" />
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            {user.name} <Flag code={user.country} size={18} />
          </div>
          <div className="text-[11px] font-semibold text-success">● online</div>
        </div>
      </div>

      <main className="flex-1 space-y-3 px-3 py-4">
        <div className="mx-auto max-w-md rounded-xl bg-secondary px-3 py-2 text-center text-[11px] text-secondary-foreground">
          💬 Unachati na {user.name} kwa muda wa {user.duration} dakika na malipo yake ni TZS{" "}
          {user.money.toLocaleString()}.
        </div>

        {time ? (
          <div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-sm text-card-foreground shadow-[var(--shadow-card)]">
              {firstMessageBroken(user.name, user.wants)}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">{time}</div>
          </div>
        ) : (
          <div>
            <div className="inline-flex gap-1 rounded-2xl rounded-tl-sm bg-card px-4 py-3 shadow-[var(--shadow-card)]">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">{user.name} anaandika...</div>
          </div>
        )}
      </main>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card px-3 py-2.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Andika ujumbe..."
          className="flex-1 rounded-full border border-border bg-secondary px-4 py-2.5 text-sm text-foreground outline-none"
        />
        <button
          onClick={send}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"
        >
          Tuma
        </button>
      </div>

      <Modal open={locked} onClose={() => setLocked(false)} icon="🔒" title="Huwezi Kutuma Ujumbe">
        <p>
          Huwezi kutuma ujumbe au kupata huduma hii kwa sasa <strong>mpaka ujisajili</strong> kwenye
          DreamVora.
        </p>
        <p className="text-xs">
          📌 Jisajili sasa ili uweze kuendelea na mazungumzo na kuanza kupata fedha.
        </p>
        <div className="space-y-2 pt-3">
          <RegisterButton label="Jisajili Sasa" />
          <BackButton onClick={() => setLocked(false)} label="Rudi Kwenye Chat" />
        </div>
      </Modal>

      <Modal
        open={withdraw}
        onClose={() => setWithdraw(false)}
        icon="👛"
        title="Withdrawal Unavailable"
      >
        <p>
          ⚠️ Unatakiwa <strong>ujisajili</strong> na ukamilishe chat ili uweze kupata fedha.
        </p>
        <div className="space-y-2 pt-3">
          <RegisterButton label="Jisajili ili Kuendelea" />
          <BackButton onClick={() => setWithdraw(false)} label="Rudi Kwenye Chat" />
        </div>
      </Modal>

      <Modal open={balance} onClose={() => setBalance(false)} icon="👁" title="Ona Current Balance">
        <p>
          Ili uweze kuona balance yako halisi, unahitajika <strong>kujisajili</strong>.
        </p>
        <div className="space-y-2 pt-3">
          <RegisterButton />
          <BackButton onClick={() => setBalance(false)} label="Cancel" />
        </div>
      </Modal>
    </div>
  );
}