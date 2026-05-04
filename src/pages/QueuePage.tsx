import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Sparkles, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { queueMessages } from "@/lib/presence-content";

const loadingDurationSeconds = 20;

type QueuePhase = "loading" | "waiting";

const QueuePage = () => {
  const navigate = useNavigate();
  const { authenticated, queue, room, cancelQueue, copy, language, online } = usePresence();
  const [phase, setPhase] = useState<QueuePhase>("loading");
  const [secondsLeft, setSecondsLeft] = useState(loadingDurationSeconds);

  useEffect(() => {
    if (!authenticated) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!queue.active && !room) {
      navigate("/dashboard", { replace: true });
    }
  }, [authenticated, navigate, queue.active, room]);

  useEffect(() => {
    if (!queue.active) {
      setPhase("loading");
      setSecondsLeft(loadingDurationSeconds);
      return;
    }

    setPhase("loading");
    setSecondsLeft(loadingDurationSeconds);

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setPhase("waiting");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [queue.active]);

  useEffect(() => {
    if (room) {
      navigate("/session", { replace: true });
    }
  }, [navigate, room]);

  const loadingProgress = useMemo(
    () => ((loadingDurationSeconds - secondsLeft) / loadingDurationSeconds) * 100,
    [secondsLeft],
  );

  if (!authenticated || (!queue.active && !room)) {
    return null;
  }

  return (
    <PageShell className="flex items-center">
      <Surface className="mx-auto w-full max-w-xl space-y-6 p-6 text-center sm:p-8">
        {!online && (
          <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-center justify-center gap-2">
              <WifiOff className="h-4 w-4" />
              {copy.queue.offline}
            </div>
          </div>
        )}

        <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#0b0f1a] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/20">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Echoo live queue</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{copy.queue.title}</h1>
            </div>
          </div>

          <p className="text-sm leading-6 text-white/60">{copy.queue.body}</p>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{language === "en" ? "Matching now" : "Γίνεται match τώρα"}</p>
                <p className="mt-1 text-sm text-white/50">
                  {queue.softRelaxed ? copy.queue.relaxed : queueMessages[language][queue.messageIndex]}
                </p>
              </div>
              <Badge className="rounded-full bg-violet-500/15 text-violet-100 hover:bg-violet-500/15">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {phase === "loading" ? `${secondsLeft}s` : "..."}
              </Badge>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400 transition-[width] duration-1000 ease-linear"
                style={{ width: phase === "loading" ? `${loadingProgress}%` : "100%" }}
              />
            </div>

            <p className="mt-3 text-xs text-white/45">
              {phase === "loading"
                ? language === "en"
                  ? "Preparing your room"
                  : "Προετοιμάζουμε το room σου"
                : language === "en"
                  ? "It may take a little longer... please wait!"
                  : "Μπορεί να πάρει λίγο περισσότερο... περίμενε λίγο παρακαλώ!"}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={async () => {
                await cancelQueue();
                navigate("/dashboard", { replace: true });
              }}
            >
              {copy.queue.cancel}
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-violet-400/20 bg-violet-400/10 text-violet-50 hover:bg-violet-400/15"
              onClick={() => navigate("/settings")}
            >
              {copy.queue.changeFilters}
            </Button>
          </div>
        </div>
      </Surface>
    </PageShell>
  );
};

export default QueuePage;