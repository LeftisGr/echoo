import { useEffect, useMemo, useState } from "react";

import { Clock3, Sparkles, SlidersHorizontal, WifiOff, X } from "lucide-react";

import { Link, Navigate, useNavigate } from "react-router-dom";

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
  const { authenticated, appReady, queue, room, matchTransition, cancelQueue, copy, language, online, adminMetrics, accountRestriction, roomFlowError } = usePresence();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageFading, setMessageFading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    if (queue.active && !room && !matchTransition) {
      return;
    }

    if (!queue.active && !room && !matchTransition) {

      setElapsedSeconds(0);
      setMessageIndex(0);
      setMessageFading(false);
    }
  }, [authenticated, queue.active, queue.joinedAt, room, matchTransition]);

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

    const timeoutIds: number[] = [];
    const interval = window.setInterval(() => {
      setMessageFading(true);
      const timeoutId = window.setTimeout(() => {
        setMessageIndex((current) => (current + 1) % queueMessages[language].length);
        setMessageFading(false);
      }, 160);
      timeoutIds.push(timeoutId);
    }, 3000);

    return () => {
      window.clearInterval(interval);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
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
        ? "A quiet check before the room settles."
        : "Ένας ήσυχος έλεγχος πριν ηρεμήσει το room."
      : phase === "searching"
        ? language === "en"
          ? "The queue keeps moving softly so nothing feels stuck."
          : "Η ουρά κινείται απαλά ώστε τίποτα να μη νιώθει κολλημένο."
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
            title={language === "en" ? "Bringing the queue back..." : "Φέρνουμε την ουρά πίσω..."}
            body={language === "en" ? "The room is settling before the first step." : "Το room ηρεμεί πριν από το πρώτο βήμα."}
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

  if (room && !matchTransition) {
    return <Navigate to={`/session/${room.id}`} replace />;
  }

  if (roomFlowError && !room && !matchTransition) {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow={language === "en" ? "Room error" : "Σφάλμα room"}
            title={language === "en" ? "We couldn’t open that room" : "Δεν μπορέσαμε να ανοίξουμε το room"}
            body={roomFlowError}
            status={language === "en" ? "Please try again from the dashboard." : "Δοκίμασε ξανά από το dashboard."}
            tone="rose"
            action={
              <Button asChild className="h-11 rounded-full bg-violet-500 text-white hover:bg-violet-400">
                <Link to="/dashboard">{language === "en" ? "Go to dashboard" : "Πήγαινε στο dashboard"}</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant="outline" className="h-11 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link to="/">{copy.nav.home}</Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  if (accountRestriction.status !== "ok" && !room && !matchTransition) {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow={language === "en" ? "Account restricted" : "Ο λογαριασμός περιορίστηκε"}
            title={accountRestriction.status === "banned" ? (language === "en" ? "Room access blocked" : "Η πρόσβαση στα rooms μπλοκαρίστηκε") : (language === "en" ? "Suspension active" : "Ενεργή αναστολή")}
            body={
              accountRestriction.reason ??
              (accountRestriction.status === "banned"
                ? language === "en"
                  ? "This account cannot enter the queue or start new rooms."
                  : "Αυτός ο λογαριασμός δεν μπορεί να μπει στην ουρά ή να ξεκινήσει νέα rooms."
                : language === "en"
                  ? "You can return when the suspension expires."
                  : "Μπορείς να επιστρέψεις όταν λήξει η αναστολή.")
            }
            status={accountRestriction.expiresAt ? new Date(accountRestriction.expiresAt).toLocaleString() : undefined}
            tone="rose"
            action={
              <Button asChild className="h-11 rounded-full bg-rose-500 text-white hover:bg-rose-400">
                <Link to="/trust-safety#safety">{language === "en" ? "Safety & rules" : "Ασφάλεια & κανόνες"}</Link>

              </Button>
            }
            secondaryAction={
              <Button asChild variant="outline" className="h-11 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link to="/">{copy.nav.home}</Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  if (!queue.active && !room && !matchTransition) {

    return <Navigate to="/dashboard" replace />;
  }

  const stageToneClass =
    phase === "loading"
      ? "border-white/10 bg-white/5 text-white/65"
      : phase === "searching"
        ? "border-violet-300/20 bg-violet-500/10 text-violet-50"
        : "border-emerald-300/20 bg-emerald-500/10 text-emerald-50";

  return (
    <PageShell className="flex items-center">
      <Surface className="relative mx-auto w-full max-w-3xl overflow-hidden p-0 shadow-2xl shadow-black/20 min-h-[600px]">
        <div className="absolute inset-0 bg-[#0b1020]" />
        <div className="absolute -left-24 top-10 h-48 w-48 rounded-full bg-violet-500/12 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative space-y-6 p-5 sm:p-7 lg:p-8">
          {!online && (
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
              <div className="flex items-center justify-center gap-2">
                <WifiOff className="h-4 w-4" />
                {copy.queue.offline}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-2 text-xs text-violet-50/80">
                <Sparkles className="h-4 w-4 text-violet-200" />
                {language === "en" ? "Quiet queue" : "Ήσυχη ουρά"}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/35">Echoo</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {copy.queue.title}
                </h1>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-white/62 sm:text-base">{copy.queue.body}</p>
            </div>

            <Badge className={cn("w-fit rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]", stageToneClass)}>
              {phase === "loading"
                ? language === "en"
                  ? "Listening"
                  : "Ακούμε"
                : phase === "searching"
                  ? language === "en"
                    ? "Searching"
                    : "Αναζήτηση"
                  : language === "en"
                    ? "Opening"
                    : "Άνοιγμα"}
            </Badge>
          </div>

          <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">
                  {language === "en" ? "Current pace" : "Τρέχων ρυθμός"}
                </p>
                <span className="text-xs text-white/45">{phase === "match-found" ? `${matchTransition?.secondsLeft ?? 0}s` : `${secondsLeft}s`}</span>
              </div>

              <div className="space-y-2 rounded-[24px] border border-white/10 bg-[#0b1020] p-4">
                <p className="text-sm font-medium text-white transition-opacity duration-300 ease-out" style={{ opacity: messageFading ? 0.45 : 1 }}>
                  {currentMessage}
                </p>
                <p className="text-sm leading-6 text-white/50">{statusNote}</p>
              </div>

              {queueNotice && phase !== "match-found" && (
                <div className="rounded-[24px] border border-violet-300/10 bg-violet-500/10 px-4 py-3 text-sm text-violet-50">
                  <p className="font-medium">{queueNotice}</p>
                  <p className="mt-1 text-xs text-violet-50/70">
                    {language === "en"
                      ? "Leave this tab open and the queue will keep listening in the background."
                      : "Άφησε αυτό το tab ανοιχτό και η ουρά θα συνεχίσει να ακούει στο παρασκήνιο."}
                  </p>
                </div>
              )}

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/65 hover:bg-white/5">
                    {currentPreferenceLabel}
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/65 hover:bg-white/5">
                    {currentLanguageLabel}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-out", queueUrgent ? "bg-rose-400" : "bg-violet-400")}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.22em] text-white/35">
                  <div className={cn("rounded-full border px-2 py-2", phase === "loading" ? "border-violet-300/25 bg-violet-500/15 text-violet-50" : "border-white/10 bg-white/5")}>1 · {upperWithoutAccents(language === "en" ? "Settling" : "Ηρεμία", language)}</div>
                  <div className={cn("rounded-full border px-2 py-2", phase === "searching" ? "border-violet-300/25 bg-violet-500/15 text-violet-50" : "border-white/10 bg-white/5")}>2 · {upperWithoutAccents(language === "en" ? "Finding" : "Εύρεση", language)}</div>
                  <div className={cn("rounded-full border px-2 py-2", phase === "match-found" ? "border-violet-300/25 bg-violet-500/15 text-violet-50" : "border-white/10 bg-white/5")}>3 · {upperWithoutAccents(language === "en" ? "Opening" : "Άνοιγμα", language)}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-white/10 bg-[#0b1020] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Estimated wait" : "Εκτίμηση αναμονής"}</p>
                <div className="mt-3 flex items-end gap-2 text-white">
                  <Clock3 className="mb-1 h-5 w-5 text-violet-200" />
                  <span className="text-3xl font-semibold tracking-tight">~{estimatedWait}s</span>
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[#0b1020] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Live now" : "Live τώρα"}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{liveUsers}</p>
                <p className="mt-1 text-sm text-white/50">{language === "en" ? "active users online now" : "ενεργοί χρήστες online τώρα"}</p>
              </div>
              <div className={cn("rounded-[24px] border p-4", queueUrgent ? "border-rose-400/20 bg-rose-500/10" : "border-white/10 bg-[#0b1020]") }>
                <p className={cn("text-xs uppercase tracking-[0.24em]", queueUrgent ? "text-rose-100/70" : "text-white/40")}>{language === "en" ? "Status" : "Κατάσταση"}</p>
                <p className={cn("mt-3 text-sm font-medium", queueUrgent ? "text-rose-100" : "text-violet-100")}>
                  {phase === "loading" ? copy.queue.loading : phase === "searching" ? copy.queue.searching : copy.queue.matchFound}
                </p>
                <p className={cn("mt-1 text-sm", queueUrgent ? "text-rose-50/80" : "text-white/50")}>{secondsLeft}s</p>
              </div>
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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050814]/88 backdrop-blur-xl transition-opacity duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.22),transparent_55%)] opacity-90" />
            <div className="relative mx-auto w-full max-w-md px-6 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(168,85,247,0.2)]">
                <div className="flex items-center gap-1.5 text-violet-100">
                  <span className="h-2 w-2 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current [animation-delay:-0.16s]" />
                  <span className="h-2 w-2 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current [animation-delay:-0.08s]" />
                  <span className="h-2 w-2 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current" />
                </div>
              </div>

              <p className="text-xs uppercase tracking-[0.32em] text-white/45">{copy.queue.matchFound}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {matchTransition.secondsLeft > 0 ? matchTransition.secondsLeft : 1}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {language === "en" ? "A quiet room is opening for you." : "Ένα ήσυχο room ανοίγει για εσένα."}
              </p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                <div className="rounded-full border border-violet-300/25 bg-violet-400/15 px-2 py-2 text-violet-50">
                  {language === "en" ? "Listening" : "Ακούμε"}
                </div>
                <div className="rounded-full border border-violet-300/25 bg-violet-400/15 px-2 py-2 text-violet-50">
                  {language === "en" ? "Connecting" : "Σύνδεση"}
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
