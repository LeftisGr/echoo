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
const roomOpeningSeconds = 20;
const totalQueueSeconds = loadingWindowSeconds + searchingWindowSeconds;

const QueuePage = () => {
  const navigate = useNavigate();
  const { authenticated, queue, room, cancelQueue, copy, language, online, adminMetrics } = usePresence();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [openingSecondsLeft, setOpeningSecondsLeft] = useState(roomOpeningSeconds);
  const [timedOut, setTimedOut] = useState(false);
  const [openingRoomId, setOpeningRoomId] = useState<string | null>(null);
  const [readyToEnter, setReadyToEnter] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageFading, setMessageFading] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    if (!queue.active && !room && !timedOut) {
      setReadyToEnter(false);
      setElapsedSeconds(0);
      setMessageIndex(0);
      setMessageFading(false);
    }
  }, [authenticated, queue.active, room, timedOut]);

  useEffect(() => {
    if (!queue.active || room || timedOut) {
      return;
    }

    setElapsedSeconds(0);
    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => Math.min(current + 1, totalQueueSeconds));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [queue.active, room, timedOut]);

  useEffect(() => {
    if (!queue.active || room || timedOut) {
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
  }, [language, queue.active, room, timedOut]);

  useEffect(() => {
    if (queue.active && elapsedSeconds >= totalQueueSeconds && !timedOut && !room) {
      setTimedOut(true);
      void cancelQueue();
    }
  }, [cancelQueue, elapsedSeconds, queue.active, room, timedOut]);

  useEffect(() => {
    if (!room) {
      setOpeningRoomId(null);
      setOpeningSecondsLeft(roomOpeningSeconds);
      setReadyToEnter(false);
      return;
    }

    if (openingRoomId === room.id) {
      return;
    }

    setTimedOut(false);
    setOpeningRoomId(room.id);
    setOpeningSecondsLeft(roomOpeningSeconds);
  }, [openingRoomId, room]);

  useEffect(() => {
    if (!room || openingRoomId !== room.id) {
      return;
    }

    const interval = window.setInterval(() => {
      setOpeningSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setReadyToEnter(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [openingRoomId, room]);

  const phase = room
    ? "opening"
    : timedOut
      ? "timed-out"
      : elapsedSeconds < loadingWindowSeconds
        ? "loading"
        : "searching";

  const progress = useMemo(() => {
    if (phase === "opening") {
      return ((roomOpeningSeconds - openingSecondsLeft) / roomOpeningSeconds) * 100;
    }

    if (phase === "timed-out") {
      return 100;
    }

    return Math.min((elapsedSeconds / totalQueueSeconds) * 100, 100);
  }, [elapsedSeconds, openingSecondsLeft, phase]);

  const secondsLeft =
    phase === "opening"
      ? openingSecondsLeft
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
          ? "Match found. Opening your room..."
          : "Βρέθηκε match. Ανοίγουμε το room σου...";

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (readyToEnter && room) {
    return <Navigate to="/session" replace />;
  }

  if (!queue.active && !room && !timedOut) {
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
              <p className="mt-1 text-sm text-white/50">
                {language === "en" ? "people online now" : "άτομα online τώρα"}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Status" : "Κατάσταση"}</p>
              <p className="mt-2 text-sm font-medium text-violet-100">{phase === "opening" ? (language === "en" ? "Opening room" : "Ανοίγει το room") : phase === "searching" ? (language === "en" ? "Searching" : "Γίνεται αναζήτηση") : language === "en" ? "Preparing" : "Προετοιμασία"}</p>
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
                  {phase === "opening"
                    ? language === "en"
                      ? "Hold on while we bring you into the room."
                      : "Περίμενε όσο σε βάζουμε στο room."
                    : language === "en"
                      ? "It updates every few seconds so the queue feels alive."
                      : "Η κατάσταση αλλάζει κάθε λίγα δευτερόλεπτα για να νιώθεις τη ροή."}
                </p>
              </div>
              <Badge className="rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/5">
                {secondsLeft}s
              </Badge>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400 transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {phase === "timed-out" ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-left">
              <p className="text-sm font-medium text-white">{language === "en" ? "Still searching..." : "Συνεχίζουμε την αναζήτηση..."}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {language === "en"
                  ? "We kept searching, but no one was free right now."
                  : "Συνεχίσαμε να ψάχνουμε, αλλά κανείς δεν ήταν διαθέσιμος τώρα."}
              </p>
            </div>
          ) : null}

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
      </Surface>
    </PageShell>
  );
};

export default QueuePage;
