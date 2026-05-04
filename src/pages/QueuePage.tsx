import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Sparkles, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { queueMessages } from "@/lib/presence-content";

const loadingWindowSeconds = 20;
const searchingWindowSeconds = 20;
const roomOpeningSeconds = 20;
const totalQueueSeconds = loadingWindowSeconds + searchingWindowSeconds;

type QueuePhase = "loading" | "searching" | "opening" | "timed-out";

const QueuePage = () => {
  const navigate = useNavigate();
  const { authenticated, queue, room, cancelQueue, copy, language, online } = usePresence();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [openingSecondsLeft, setOpeningSecondsLeft] = useState(roomOpeningSeconds);
  const [timedOut, setTimedOut] = useState(false);
  const [openingRoomId, setOpeningRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!queue.active && !room && !timedOut) {
      navigate("/dashboard", { replace: true });
    }
  }, [authenticated, navigate, queue.active, room, timedOut]);

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
    if (queue.active && elapsedSeconds >= totalQueueSeconds && !timedOut && !room) {
      setTimedOut(true);
      void cancelQueue();
    }
  }, [cancelQueue, elapsedSeconds, queue.active, room, timedOut]);

  useEffect(() => {
    if (!room) {
      setOpeningRoomId(null);
      setOpeningSecondsLeft(roomOpeningSeconds);
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
          navigate("/session", { replace: true });
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [navigate, openingRoomId, room]);

  const phase: QueuePhase = room
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

  if (!authenticated || (!queue.active && !room && !timedOut)) {
    return null;
  }

  const statusText =
    phase === "loading"
      ? language === "en"
        ? "Preparing your room"
        : "Προετοιμάζουμε το room σου"
      : phase === "searching"
        ? language === "en"
          ? "Searching for another Echoer"
          : "Ψάχνουμε άλλον Echoer"
        : phase === "opening"
          ? language === "en"
            ? "Match found. Opening your room..."
            : "Βρέθηκε match. Ανοίγουμε το room σου..."
          : language === "en"
            ? "Please try again in a couple minutes... every Echoer is busy at the moment!"
            : "Προσπάθησε ξανά σε λίγα λεπτά... όλοι οι Echoers είναι απασχολημένοι αυτή τη στιγμή!";

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
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/20">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Echoo live queue</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{copy.queue.title}</h1>
            </div>
          </div>

          <p className="text-sm leading-6 text-white/60">{copy.queue.body}</p>

          {phase === "timed-out" ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-left">
              <p className="text-sm font-medium text-white">{statusText}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {language === "en"
                  ? "We kept searching, but no one was free right now."
                  : "Συνεχίσαμε να ψάχνουμε, αλλά κανείς δεν ήταν διαθέσιμος τώρα."}
              </p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{statusText}</p>
                  <p className="mt-1 text-sm text-white/50">
                    {queue.softRelaxed ? copy.queue.relaxed : queueMessages[language][queue.messageIndex]}
                  </p>
                </div>
                <Badge className="rounded-full bg-violet-500/15 text-violet-100 hover:bg-violet-500/15">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  {secondsLeft}s
                </Badge>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-violet-400 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-white/45">
                {phase === "opening"
                  ? language === "en"
                    ? "Hold on while we bring you into the room"
                    : "Περίμενε όσο σε βάζουμε στο room"
                  : language === "en"
                    ? "It may take a little longer... please wait!"
                    : "Μπορεί να πάρει λίγο περισσότερο... περίμενε λίγο παρακαλώ!"}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={async () => {
                await cancelQueue();
                navigate("/dashboard", { replace: true });
              }}
            >
              {phase === "timed-out" ? (language === "en" ? "Back home" : "Πίσω") : copy.queue.cancel}
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
