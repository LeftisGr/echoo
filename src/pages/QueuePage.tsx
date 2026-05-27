import { useEffect, useMemo, useState } from "react";
import { Clock3, Sparkles, SlidersHorizontal, WifiOff, X } from "lucide-react";

import { Navigate, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, Surface } from "@/components/presence/presence-shell";
import { CalmStateCard } from "@/components/presence/calm-state-card";
import { usePresence } from "@/components/presence/presence-provider";

import { localizeLanguagePreference, localizePreference, queueMessages } from "@/lib/presence-content";
import { cn, upperWithoutAccents } from "@/lib/utils";

const loadingWindowSeconds = 20;
const searchingWindowSeconds = 20;
const totalQueueSeconds = loadingWindowSeconds + searchingWindowSeconds;

const QueuePage = () => {
  const navigate = useNavigate();
  const { authenticated, appReady, queue, room, matchTransition, cancelQueue, copy, language, online, adminMetrics, accountModeration } = usePresence();

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

  const phase = matchTransition ? "match-found" : room ? "opening" : elapsedSeconds < loadingWindowSeconds ? "loading" : "searching";

  const progress = useMemo(() => {
    if (phase === "match-found") {
      return Math.min(((3 - matchTransition!.secondsLeft) / 3) * 100, 100);
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
  const liveUsers = Math.max(adminMetrics.usersOnlineNow, 14);
  const matchingStage = phase === "loading" ? 1 : phase === "searching" ? 2 : 3;
  const currentPreferenceLabel = localizePreference(language, queue.filters.preference);
  const currentLanguageLabel = localizeLanguagePreference(language, queue.filters.language);

  const currentMessage =
    phase === "loading"
      ? copy.queue.loading
      : phase === "searching"
        ? queue.softRelaxed
          ? copy.queue.relaxed
          : queueMessages[language][messageIndex]
        : copy.queue.found;

  const statusNote =
    phase === "loading"
      ? language === "en"
        ? "A quiet check before the room opens."
        : "Ένας ήσυχος έλεγχος πριν ανοίξει το room."
      : phase === "searching"
        ? language === "en"
          ? "The queue keeps moving so the room never feels frozen."
          : "Η ουρά κινείται συνεχώς ώστε το room να μη νιώθει παγωμένο."
        : language === "en"
          ? "A connection has found its shape."
          : "Μια σύνδεση έχει βρει το σχήμα της."
;

  const queueNotice = !online ? copy.queue.offline : phase === "searching" && queue.softRelaxed ? copy.queue.relaxed : null;
  const queueUrgent = secondsLeft <= 10;

  if (!appReady) {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow="Echoo"
            title={language === "en" ? "Waking the queue..." : "Ξυπνάμε την ουρά..."}
            body={language === "en" ? "The room is being tuned before the first step." : "Το room συντονίζεται πριν από το πρώτο βήμα."}
            status={copy.misc.restoring}
            tone="violet"
          />
        </div>
      </PageShell>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (accountModeration?.isBanned || accountModeration?.isSuspended) {
    const isBanned = accountModeration.isBanned;
    const until = accountModeration.suspendedUntil ?? accountModeration.banExpiresAt;
    const reason = isBanned ? accountModeration.banReason : accountModeration.suspensionReason;

    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow={isBanned ? (language === "en" ? "Account restricted" : "Λογαριασμός περιορισμένος") : language === "en" ? "Pause active" : "Η παύση είναι ενεργή"}
            title={isBanned ? (language === "en" ? "This account cannot join Echoo right now." : "Αυτός ο λογαριασμός δεν μπορεί να μπει στο Echoo τώρα.") : language === "en" ? "This account is temporarily paused." : "Αυτός ο λογαριασμός είναι προσωρινά σε παύση."}
            body={
              language === "en"
                ? `${reason ?? "A moderation action is active."}${until ? ` Until ${new Date(until).toLocaleString()}.` : ""}`
                : `${reason ?? "Υπάρχει ενεργή ενέργεια moderation."}${until ? ` Έως ${new Date(until).toLocaleString()}.` : ""}`
            }
            status={isBanned ? (language === "en" ? "No matching is available." : "Δεν υπάρχει διαθέσιμο matching.") : language === "en" ? "Queue access paused." : "Η πρόσβαση στην ουρά είναι σε παύση."}
            tone={isBanned ? "rose" : "amber"}
            action={
              <Button className="h-12 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400" onClick={() => navigate("/")}>
                {language === "en" ? "Go home" : "Πήγαινε αρχική"}
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  if (room && !matchTransition) {
    return <Navigate to={`/session/${room.id}`} replace />;
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
              <div className="relative flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-violet-100 [animation-delay:-0.16s]" />
                <span className="h-1.5 w-1.5 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-violet-100 [animation-delay:-0.08s]" />
                <span className="h-1.5 w-1.5 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-violet-100" />
              </div>
            </div>

            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40">Echoo listening room</p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{copy.queue.title}</h1>
            </div>
            <Badge className="rounded-full border border-violet-400/15 bg-violet-400/10 px-3 py-1 text-violet-50 hover:bg-violet-400/10">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Live
            </Badge>
          </div>

          <p className="max-w-xl text-sm leading-6 text-white/60">{copy.queue.body}</p>

          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 sm:grid-cols-2 sm:p-5">
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                {language === "en" ? "Your match settings" : "Οι ρυθμίσεις σου"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/5">
                  {currentPreferenceLabel}
                </Badge>
                <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/5">
                  {currentLanguageLabel}
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                {language === "en" ? "Match flow" : "Ροή matching"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.18em] text-white/45">
                <div className={`rounded-full border px-2 py-2 ${matchingStage >= 1 ? "border-violet-300/30 bg-violet-400/15 text-violet-50" : "border-white/10 bg-white/5"}`}>
                  1 · {upperWithoutAccents(language === "en" ? "Ready" : "Έτοιμο", language)}
                </div>
                <div className={`rounded-full border px-2 py-2 ${matchingStage >= 2 ? "border-violet-300/30 bg-violet-400/15 text-violet-50" : "border-white/10 bg-white/5"}`}>
                  2 · {upperWithoutAccents(language === "en" ? "Listening" : "Ακούμε", language)}
                </div>
                <div className={`rounded-full border px-2 py-2 ${matchingStage >= 3 ? "border-violet-300/30 bg-violet-400/15 text-violet-50" : "border-white/10 bg-white/5"}`}>
                  3 · {upperWithoutAccents(language === "en" ? "Opening" : "Ανοίγει", language)}
                </div>

              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Estimated wait" : "Εκτίμηση αναμονής"}</p>
              <div className="mt-2 flex items-end gap-2 text-white">
                <Clock3 className="mb-1 h-5 w-5 text-violet-200" />
                <span className="text-3xl font-semibold tracking-tight">~{estimatedWait}s</span>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Live now" : "Live τώρα"}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{liveUsers}</p>
              <p className="mt-1 text-sm text-white/50">{language === "en" ? "people online now" : "άτομα online τώρα"}</p>
            </div>
            <div className={cn("rounded-[24px] border p-4", queueUrgent ? "border-rose-400/20 bg-rose-500/10" : "border-white/10 bg-white/5") }>
              <p className={cn("text-xs uppercase tracking-[0.24em]", queueUrgent ? "text-rose-100/70" : "text-white/40")}>{language === "en" ? "Status" : "Κατάσταση"}</p>
              <p className={cn("mt-2 text-sm font-medium", queueUrgent ? "text-rose-100" : "text-violet-100")}>
                {phase === "loading" ? copy.queue.loading : phase === "searching" ? copy.queue.searching : copy.queue.matchFound}
              </p>
              <p className={cn("mt-1 text-sm", queueUrgent ? "text-rose-50/80" : "text-white/50")}>{secondsLeft}s</p>
            </div>

          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white transition-opacity duration-300 ease-out" style={{ opacity: messageFading ? 0.4 : 1 }}>
                  {currentMessage}
                </p>
                <p className="mt-2 text-sm text-white/50">{statusNote}</p>

              </div>
              <Badge className="rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/5">
                {phase === "match-found" ? `${matchTransition?.secondsLeft ?? 0}...` : `${secondsLeft}s`}
              </Badge>
            </div>

            {queueNotice && phase !== "match-found" && (
              <div className="mt-4 rounded-[22px] border border-violet-300/10 bg-violet-500/10 px-4 py-3 text-sm text-violet-50">
                <p className="font-medium">{queueNotice}</p>
                <p className="mt-1 text-xs text-violet-50/70">
                  {language === "en"
                    ? "Keep this tab open and we will keep listening for your next connection."
                    : "Άφησε αυτό το tab ανοιχτό και θα συνεχίσουμε να ακούμε για την επόμενη σύνδεσή σου."}
                </p>
              </div>
            )}

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-out", queueUrgent ? "bg-rose-400" : "bg-violet-400")}
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
                  <div className="flex items-center gap-1.5 text-violet-100">
                    <span className="h-2 w-2 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current [animation-delay:-0.16s]" />
                    <span className="h-2 w-2 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current [animation-delay:-0.08s]" />
                    <span className="h-2 w-2 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current" />
                  </div>
                </div>
              </div>

              <p className="text-xs uppercase tracking-[0.32em] text-white/45">{copy.queue.matchFound}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {matchTransition.secondsLeft > 0 ? matchTransition.secondsLeft : 1}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {language === "en" ? "A moment is opening just for you." : "Ένα moment ανοίγει ειδικά για εσένα."}
              </p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                <div className="rounded-full border border-violet-300/25 bg-violet-400/15 px-2 py-2 text-violet-50">
                  {language === "en" ? "Listening" : "Ακούμε"}
                </div>
                <div className="rounded-full border border-violet-300/25 bg-violet-400/15 px-2 py-2 text-violet-50">
                  {language === "en" ? "Matching" : "Matching"}
                </div>
                <div className="rounded-full border border-violet-300/25 bg-violet-400/15 px-2 py-2 text-violet-50">
                  {language === "en" ? "Opening" : "Άνοιγμα"}
                </div>
              </div>
            </div>
          </div>
        )}
      </Surface>
    </PageShell>
  );
};

export default QueuePage;
