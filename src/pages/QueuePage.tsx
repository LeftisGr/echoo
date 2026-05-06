import { useEffect, useMemo, useState } from "react";
import { Clock3, LoaderCircle, Sparkles, SlidersHorizontal, WifiOff, X } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { queueMessages } from "@/lib/presence-content";

const loadingWindowSeconds = 20;
const searchingWindowSeconds = 20;
const totalQueueSeconds = loadingWindowSeconds + searchingWindowSeconds;

const QueuePage = () => {
  const navigate = useNavigate();
  const {
    authenticated,
    queue,
    room,
    matchTransition,
    cancelQueue,
    copy,
    language,
    online,
    adminMetrics,
  } = usePresence();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageFading, setMessageFading] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    if (!queue.active && !room && !matchTransition) {
      setElapsedSeconds(0);
      setMessageIndex(0);
      setMessageFading(false);
    }
  }, [authenticated, queue.active, room, matchTransition]);

  useEffect(() => {
    if (!queue.active || room || matchTransition) {
      return;
    }

    setElapsedSeconds(0);
    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => Math.min(current + 1, totalQueueSeconds));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [queue.active, room, matchTransition]);

  useEffect(() => {
    if (!queue.active || room || matchTransition) {
      return;
    }

    const interval = window.setInterval(() => {
      setMessageFading(true);
      window.setTimeout(() => {
        setMessageIndex((current) => (current + 1) % queueMessages[language].length);
        setMessageFading(false);
      }, 180);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [language, queue.active, room, matchTransition]);

  const phase = matchTransition
    ? "match-found"
    : room
      ? "opening"
      : elapsedSeconds < loadingWindowSeconds
        ? "loading"
        : "searching";

  const progress = useMemo(() => {
    if (phase === "match-found") {
      return Math.min(((4 - matchTransition!.secondsLeft) / 3) * 100, 100);

    }

    return Math.min((elapsedSeconds / totalQueueSeconds) * 100, 100);
  }, [elapsedSeconds, matchTransition, phase]);

  const secondsLeft =
    phase === "match-found"
      ? matchTransition!.secondsLeft
      : phase === "loading"
        ? loadingWindowSeconds - elapsedSeconds
        : phase === "searching"
          ? totalQueueSeconds - elapsedSeconds
          : 0;

  const estimatedWait = Math.max(queue.estimatedWaitSeconds, phase === "searching" ? secondsLeft : queue.estimatedWaitSeconds);
  const liveUsers = Math.max(adminMetrics.usersOnlineNow, 12);
  const currentMessage =
    phase === "loading"
      ? language === "en"
        ? "Preparing your room..."
        : "Προετοιμάζουμε το room σου..."
      : phase === "searching"
        ? queue.softRelaxed
          ? copy.queue.relaxed
          : queueMessages[language][messageIndex]
        : language === "en"
          ? "Connection found"
          : "Βρέθηκε σύνδεση";

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (room && !matchTransition) {
    return <Navigate to="/session" replace />;
  }

  if (!queue.active && !room && !matchTransition) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageShell className="flex items-center">
      <Surface className="relative mx-auto w-full max-w-2xl overflow-hidden p-0 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[#0b1020]" />
        <div className="absolute -left-24 top-8 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl animate-pulse" />
        <div className="absolute -right-24 bottom-12 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl animate-pulse [animation-delay:700ms]" />

        <div className="relative space-y-6 p-5 sm:p-8">
          {!online && (
            <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              <div className="flex items-center justify-center gap-2">
                <WifiOff className="h-4 w-4" />
                {copy.queue.offline}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-left">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-violet-100 shadow-lg shadow-violet-500/10">
              <div className="absolute inset-1 rounded-[20px] bg-violet-500/15 animate-pulse" />
              <LoaderCircle className="relative h-7 w-7 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40">Echoo live queue</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{copy.queue.title}</h1>
            </div>
            <Badge className="rounded-full border border-violet-400/15 bg-violet-400/10 px-3 py-1 text-violet-50 hover:bg-violet-400/10">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Live
            </Badge>
          </div>

          <p className="max-w-xl text-sm leading-6 text-white/60">{copy.queue.body}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Estimated wait" : "Εκτίμηση αναμονής"}</p>
              <div className="mt-2 flex items-end gap-2 text-white">
                <Clock3 className="mb-1 h-5 w-5 text-violet-200" />
                <span className="text-3xl font-semibold tracking-tight">~{estimatedWait}s</span>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Live now" : "Σε σύνδεση τώρα"}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{liveUsers}</p>
              <p className="mt-1 text-sm text-white/50">{language === "en" ? "people online now" : "άτομα online τώρα"}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Status" : "Κατάσταση"}</p>
              <p className="mt-2 text-sm font-medium text-violet-100">
                {phase === "loading"
                  ? language === "en"
                    ? "Searching"
                    : "Αναζήτηση"
                  : phase === "searching"
                    ? language === "en"
                      ? "Searching"
                      : "Γίνεται αναζήτηση"
                    : language === "en"
                      ? "Connection found"
                      : "Βρέθηκε σύνδεση"}
              </p>
              <p className="mt-1 text-sm text-white/50">{secondsLeft}s</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white transition-opacity duration-300 ease-out" style={{ opacity: messageFading ? 0.4 : 1 }}>
                  {currentMessage}
                </p>
                <p className="mt-2 text-sm text-white/50">
                  {phase === "searching"
                    ? language === "en"
                      ? "It updates every few seconds so the queue feels alive."
                      : "Η κατάσταση αλλάζει κάθε λίγα δευτερόλεπτα για να νιώθεις τη ροή."
                    : language === "en"
                      ? "A connection is ready to open."
                      : "Η σύνδεση είναι έτοιμη να ανοίξει."}
                </p>
              </div>
              <Badge className="rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/5">
                {phase === "match-found" ? `${matchTransition?.secondsLeft ?? 0}...` : `${secondsLeft}s`}
              </Badge>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400 transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={async () => {
                await cancelQueue();
                navigate("/dashboard", { replace: true });
              }}
            >
              <X className="mr-2 h-4 w-4" />
              {copy.queue.cancel}
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-violet-400/20 bg-violet-400/10 text-violet-50 hover:bg-violet-400/15 hover:text-violet-50"
              onClick={() => navigate("/settings")}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {copy.queue.changeFilters}
            </Button>
          </div>
        </div>

        {matchTransition && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050814]/90 backdrop-blur-xl transition-opacity duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.24),transparent_55%)] opacity-90" />
            <div className="relative mx-auto w-full max-w-md px-6 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(168,85,247,0.25)]">
                  <LoaderCircle className="h-9 w-9 animate-spin text-violet-100" />
                </div>
              </div>
              <p className="text-xs uppercase tracking-[0.32em] text-white/45">Connection Found</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {matchTransition.secondsLeft > 0 ? matchTransition.secondsLeft : 1}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {language === "en"
                  ? "A room is opening just for you."
                  : "Ένα room ανοίγει ειδικά για εσένα."}
              </p>
              <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-violet-400 transition-[width] duration-1000 ease-out"
                  style={{ width: `${((3 - matchTransition.secondsLeft + 1) / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </Surface>
    </PageShell>
  );
};

export default QueuePage;
