import { useEffect, useRef, useState } from "react";
import { ArrowRight, Mic, PhoneOff, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { persistRoomTyping } from "@/lib/presence-backend";
import { localizeRating, ratingOptions } from "@/lib/presence-content";
import { cn } from "@/lib/utils";

const sessionDurationSeconds = 600;

const SessionPage = () => {
  const navigate = useNavigate();
  const {
    authenticated,
    sessionReady,
    queue,
    room,
    profile,
    copy,
    language,
    online,
    unlockVoice,
    sendMessage,
    leaveRoom,
    rateRoom,
    startNewSessionFromEndedRoom,
    startVoiceChat,
    stopVoiceChat,
    cancelQueue,
    voiceState,
  } = usePresence();

  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState(sessionDurationSeconds);
  const [voiceUnlockedFlash, setVoiceUnlockedFlash] = useState(false);
  const [voiceUnlockPromptOpen, setVoiceUnlockPromptOpen] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [messagePulse, setMessagePulse] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const shouldForceScrollRef = useRef(true);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    if (!room) {
      return;
    }

    setSessionRemaining(sessionDurationSeconds);
    setVoiceUnlockedFlash(false);
    setVoiceUnlockPromptOpen(false);
    setMessagePulse((current) => current + 1);
    shouldForceScrollRef.current = true;
    isNearBottomRef.current = true;

    const interval = window.setInterval(() => {
      setSessionRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          unlockVoice();
          setVoiceUnlockedFlash(true);
          setVoiceUnlockPromptOpen(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [room?.id, unlockVoice]);

  useEffect(() => {
    if (!voiceUnlockedFlash) {
      return;
    }

    const timeout = window.setTimeout(() => setVoiceUnlockedFlash(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [voiceUnlockedFlash]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      if (room && profile?.id) {
        void persistRoomTyping(room, null);
      }
    };
  }, [profile?.id, room?.id]);

  useEffect(() => {
    if (!room?.typingUserId || room.typingUserId === profile?.id || !room.typingUpdatedAt) {
      setPartnerTyping(false);
      return;
    }

    const isRecent = Date.now() - new Date(room.typingUpdatedAt).getTime() < 1600;
    setPartnerTyping(isRecent);

    if (!isRecent) {
      return;
    }

    const timeout = window.setTimeout(() => setPartnerTyping(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [profile?.id, room?.typingUpdatedAt, room?.typingUserId]);

  useEffect(() => {
    const node = chatScrollRef.current;
    if (!node) {
      return;
    }

    if (!shouldForceScrollRef.current && !isNearBottomRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      node.scrollTo({
        top: node.scrollHeight,
        behavior: shouldForceScrollRef.current || messagePulse > 0 ? "smooth" : "auto",
      });
    });

    shouldForceScrollRef.current = false;
  }, [room?.messages.length, messagePulse]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => () => stopVoiceChat(), [stopVoiceChat]);

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!sessionReady || (queue.active && !room)) {
    return (
      <PageShell className="flex items-center">
        <Surface className="mx-auto w-full max-w-2xl space-y-3 p-6 text-center sm:p-10">
          <p className="text-sm uppercase tracking-[0.28em] text-white/40">Echoo</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {language === "en" ? "Loading your room..." : "Φορτώνουμε το room σου..."}
          </h1>
        </Surface>
      </PageShell>
    );
  }

  if (!room) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!profile) {
    return (
      <PageShell className="flex items-center">
        <Surface className="mx-auto w-full max-w-2xl space-y-3 p-6 text-center sm:p-10">
          <p className="text-sm uppercase tracking-[0.28em] text-white/40">Echoo</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {language === "en" ? "Loading your profile..." : "Φορτώνουμε το προφίλ σου..."}
          </h1>
        </Surface>
      </PageShell>
    );
  }

  const isActive = room.status === "active";
  const isEnded = room.status === "ended";
  const partnerLabel = room.partner?.username ?? (language === "en" ? "Stranger" : "Stranger");
  const timerLabel = `${String(Math.floor(sessionRemaining / 60)).padStart(2, "0")}:${String(sessionRemaining % 60).padStart(2, "0")}`;
  const timerProgress = ((sessionDurationSeconds - sessionRemaining) / sessionDurationSeconds) * 100;
  const voiceReady = room.voiceEnabled && sessionRemaining === 0;
  const timerUrgent = sessionRemaining <= 60;
  const timerPulseClass = sessionRemaining % 2 === 0 ? "scale-[1.01]" : "scale-100";
  const timerToneClass = timerUrgent ? "text-rose-200" : "text-white";
  const timerGlowClass = timerUrgent ? "shadow-[0_0_60px_rgba(244,63,94,0.18)]" : "shadow-[0_0_50px_rgba(129,140,248,0.12)]";
  const micGlowClass = voiceReady ? "ring-2 ring-violet-300/60 shadow-[0_0_24px_rgba(167,139,250,0.28)] animate-pulse" : "";
  const latestSystemMessage = [...room.messages].reverse().find((message) => message.type === "system")?.content;
  const sessionBanner = !online
    ? copy.session.connectionLost
    : isEnded
      ? latestSystemMessage ?? copy.session.ended
      : null;

  const publishTypingState = (isTyping: boolean) => {
    if (!room || !profile?.id) {
      return;
    }

    void persistRoomTyping(room, isTyping ? profile.id : null);
  };

  const handleChatScroll = () => {
    const node = chatScrollRef.current;
    if (!node) {
      return;
    }

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 96;
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (!value.trim()) {
      publishTypingState(false);
      return;
    }

    publishTypingState(true);
    typingTimeoutRef.current = window.setTimeout(() => publishTypingState(false), 1200);
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    publishTypingState(false);
  };

  const handleVoiceButton = async () => {
    if (!voiceReady) {
      return;
    }

    if (voiceState === "connected") {
      setMuted((current) => {
        const next = !current;
        if (audioRef.current) {
          audioRef.current.muted = next;
        }
        return next;
      });
      return;
    }

    if (audioRef.current) {
      await startVoiceChat(audioRef.current);
      setMuted(false);
    }
  };

  if (isEnded) {
    return (
      <PageShell className="flex items-center">
        <Surface className="mx-auto w-full max-w-2xl overflow-hidden border-0 bg-[#0a0f1a] p-0 shadow-2xl shadow-black/30">
          <div className="border-b border-white/5 bg-[#0f1526] px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-100 ring-1 ring-violet-300/15">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/35">Echoo</p>
                <h1 className="text-xl font-semibold tracking-tight text-white">{copy.session.ended}</h1>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40">
                {language === "en" ? "Post-session" : "Μετά το session"}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.session.howWasIt}</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {language === "en"
                  ? "A quick rating helps us shape the next conversation."
                  : "Μια γρήγορη αξιολόγηση μας βοηθά να βελτιώσουμε την επόμενη συνομιλία."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { score: "good" as const, icon: "👍", label: language === "en" ? "Good" : "Καλό" },
                  { score: "neutral" as const, icon: "👌", label: language === "en" ? "Okay" : "Εντάξει" },
                  { score: "bad" as const, icon: "👎", label: language === "en" ? "Bad" : "Κακό" },
                ].map((option) => {
                  const isSelected = room.rating === option.score;
                  return (
                    <Button
                      key={option.score}
                      variant="outline"
                      className={cn(
                        "h-16 rounded-[22px] border-white/10 bg-white/5 text-white transition-transform duration-150 active:scale-95 hover:bg-white/10 hover:text-white",
                        isSelected && "border-violet-300/30 bg-violet-500/15 text-violet-50",
                      )}
                      onClick={() => rateRoom(option.score)}
                    >
                      <span className="mr-2 text-lg">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-14 flex-1 rounded-full bg-violet-500 text-base font-medium text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
                onClick={async () => {
                  await startNewSessionFromEndedRoom();
                  navigate("/queue");
                }}
              >
                {copy.session.findNew}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="h-14 flex-1 rounded-full border-white/10 bg-white/5 text-white transition-transform duration-150 active:scale-95 hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/dashboard">{copy.session.backHome}</Link>
              </Button>
            </div>
          </div>
        </Surface>
      </PageShell>
    );
  }

  return (
    <PageShell className="h-screen overflow-hidden">
      <Surface className="flex h-full min-h-0 flex-col overflow-hidden border-0 bg-[#08101b] p-0 shadow-2xl shadow-black/30">
        <header className="flex-none border-b border-white/5 bg-[#0f1627]/95 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur sm:px-6">
          <div className="grid grid-cols-[auto,1fr,auto] items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/15 text-violet-100 ring-1 ring-violet-300/15">
                <span className="text-sm font-semibold tracking-[0.18em]">E</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.34em] text-white/35">Echoo</p>
                <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">Private Session</h1>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">{language === "en" ? "Session timer" : "Χρονομετρητής"}</p>
              <div className={cn("mt-1 text-4xl font-semibold tracking-tight text-white sm:text-5xl", timerToneClass, voiceUnlockedFlash && "animate-pulse", timerPulseClass)}>
                {timerLabel}
              </div>
              <div className="mx-auto mt-2 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-300", timerUrgent ? "bg-rose-400" : "bg-violet-400")}
                  style={{ width: `${timerProgress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-white/10 bg-white/5 px-4 text-white transition-transform duration-150 active:scale-95 hover:bg-white/10 hover:text-white"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    {language === "en" ? "Leave" : "Έξοδος"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-white/10 bg-[#0f1424] text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{language === "en" ? "Leave this session?" : "Να φύγεις από το session;"}</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/55">
                      {language === "en"
                        ? "The connection will end for both users."
                        : "Η σύνδεση θα τερματιστεί και για τους δύο χρήστες."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                      {language === "en" ? "Cancel" : "Ακύρωση"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-full bg-rose-500 text-white hover:bg-rose-400"
                      onClick={() => leaveRoom(copy.session.partnerDisconnected)}
                    >
                      {language === "en" ? "Yes, leave" : "Ναι, έξοδος"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </header>

        {sessionBanner && (
          <div className={cn("flex-none border-b px-4 py-3 text-sm sm:px-6", !online ? "border-amber-400/20 bg-amber-400/10 text-amber-50" : "border-white/10 bg-white/5 text-white/80")}>
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", !online ? "bg-amber-400/15 text-amber-100" : "bg-white/10 text-white") }>
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">{sessionBanner}</p>
                <p className={cn("mt-1 text-xs", !online ? "text-amber-50/70" : "text-white/45")}>{!online ? (language === "en" ? "We are reconnecting in the background." : "Προσπαθούμε να επανασυνδεθούμε στο παρασκήνιο.") : language === "en" ? "You can start a new session when you're ready." : "Μπορείς να ξεκινήσεις νέο session όταν είσαι έτοιμος/η."}</p>
              </div>
            </div>
          </div>
        )}

        <div
          ref={chatScrollRef}
          onScroll={handleChatScroll}
          className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-4 py-4 sm:px-6"
        >
          <div className="space-y-4 pb-4">
            {room.messages.map((message) => {
              const isSelf = message.senderId === profile.id;
              const isSystem = message.type === "system";
              const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              if (isSystem) {
                return (
                  <div key={message.id} className="mx-auto max-w-[88%] rounded-full bg-white/5 px-4 py-2 text-center text-xs text-white/45">
                    {message.content}
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex animate-in fade-in slide-in-from-bottom-1 duration-300",
                    isSelf ? "justify-end" : "justify-start",
                  )}
                >
                  <div className={cn("max-w-[82%] space-y-1", isSelf ? "items-end text-right" : "items-start text-left")}>
                    <div className="flex items-center gap-2 px-1 text-xs text-white/35">
                      <span className="font-medium uppercase tracking-[0.22em] text-white/45">
                        {isSelf ? (language === "en" ? "You" : "You") : (language === "en" ? "Stranger" : "Stranger")}
                      </span>
                      <span>•</span>
                      <span>{timestamp}</span>
                    </div>
                    <div
                      className={cn(
                        "rounded-[20px] px-4 py-3 text-[15px] leading-7 shadow-sm",
                        isSelf ? "bg-white text-slate-950" : "bg-white/7 text-white ring-1 ring-white/5",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex-none border-t border-white/5 bg-[#0b1220]/96 px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] backdrop-blur sm:px-6">
          {isActive ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const nextDraft = draft.trim();
                if (!nextDraft) {
                  return;
                }
                shouldForceScrollRef.current = true;
                await sendMessage(nextDraft);
                stopTyping();
                setDraft("");
              }}
            >
              <div className="flex items-end gap-3">
                <Input
                  value={draft}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  onBlur={stopTyping}
                  placeholder={language === "en" ? "Write a message..." : "Γράψε ένα μήνυμα..."}
                  className="h-14 flex-1 rounded-full border-0 bg-white/6 px-5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-violet-400/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-14 w-14 rounded-full border-0 bg-white/6 p-0 text-white transition-transform duration-150 active:scale-95 hover:bg-white/10 hover:text-white",
                    micGlowClass,
                    !voiceReady && "cursor-not-allowed opacity-45",
                  )}
                  disabled={!voiceReady}
                  onClick={handleVoiceButton}
                >
                  {voiceState === "connected" ? (
                    muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button type="submit" className="h-14 rounded-full bg-violet-500 px-5 text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400">
                  {copy.session.send}
                </Button>
              </div>
              {partnerTyping && (
                <div className="mt-3 flex items-center gap-3 rounded-full border border-violet-300/15 bg-violet-500/10 px-4 py-2 text-sm text-violet-50">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.45)]" />
                  <span className="font-medium">{partnerLabel}</span>
                  <span className="text-violet-100/70">{language === "en" ? "is typing..." : "γράφει..."}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-200 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-200 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-200" />
                  </span>
                </div>
              )}
              <p className="mt-2 text-xs text-white/35">
                {voiceReady
                  ? language === "en"
                    ? "Voice is ready — the microphone button unlocks now."
                    : "Η φωνή είναι έτοιμη — το μικρόφωνο ξεκλειδώνει τώρα."
                  : language === "en"
                    ? "Microphone unlocks when the timer reaches zero."
                    : "Το μικρόφωνο ξεκλειδώνει όταν ο χρόνος μηδενιστεί."}
              </p>
            </form>
          ) : (
            <div className="rounded-[22px] bg-white/5 p-4 text-center text-white/70">
              {copy.session.howWasIt}
            </div>
          )}
        </footer>

        <audio ref={audioRef} className="hidden" />
      </Surface>
      <Dialog open={voiceUnlockPromptOpen} onOpenChange={setVoiceUnlockPromptOpen}>
        <DialogContent className="border-white/10 bg-[#10182b] text-white shadow-2xl shadow-black/40 sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-100 ring-1 ring-violet-300/25">
              <Mic className="h-6 w-6 animate-pulse" />
            </div>
            <DialogTitle className="text-center text-2xl font-semibold tracking-tight">
              {language === "en" ? "Voice is now available" : "Η φωνή είναι τώρα διαθέσιμη"}
            </DialogTitle>
            <DialogDescription className="text-center text-white/60">
              {language === "en"
                ? "You can switch from text to voice whenever you're ready."
                : "Μπορείς να περάσεις από το κείμενο στη φωνή όποτε είσαι έτοιμος/η."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col gap-3 sm:flex-row">
            <Button
              className="h-12 flex-1 rounded-full bg-violet-500 text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
              onClick={async () => {
                setVoiceUnlockPromptOpen(false);
                if (audioRef.current) {
                  await startVoiceChat(audioRef.current);
                  setMuted(false);
                }
              }}
            >
              <Mic className="mr-2 h-4 w-4" />
              {language === "en" ? "Start Voice Chat" : "Έναρξη φωνητικής συνομιλίας"}
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setVoiceUnlockPromptOpen(false)}
            >
              {language === "en" ? "Keep Text Only" : "Μόνο κείμενο"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default SessionPage;
