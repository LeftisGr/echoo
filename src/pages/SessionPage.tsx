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

import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { persistRoomTyping } from "@/lib/presence-backend";
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
    voiceState,
  } = usePresence();

  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState(sessionDurationSeconds);
  const [voiceUnlockedFlash, setVoiceUnlockedFlash] = useState(false);
  const [voiceUnlockPromptOpen, setVoiceUnlockPromptOpen] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const typingClearTimeoutRef = useRef<number | null>(null);
  const typingPublishTimeoutRef = useRef<number | null>(null);
  const typingHeartbeatRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const shouldForceScrollRef = useRef(true);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (!room) {
      return;
    }

    const syncSessionTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 1000);
      const nextRemaining = Math.max(sessionDurationSeconds - elapsedSeconds, 0);
      setSessionRemaining(nextRemaining);

      if (nextRemaining === 0 && !room.voiceEnabled) {
        unlockVoice();
        setVoiceUnlockedFlash(true);
        setVoiceUnlockPromptOpen(true);
      }
    };

    syncSessionTimer();
    shouldForceScrollRef.current = true;
    isNearBottomRef.current = true;

    const interval = window.setInterval(syncSessionTimer, 1000);

    return () => window.clearInterval(interval);
  }, [room?.id, room?.startedAt, room?.voiceEnabled, unlockVoice]);

  useEffect(() => {
    if (!voiceUnlockedFlash) {
      return;
    }

    const timeout = window.setTimeout(() => setVoiceUnlockedFlash(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [voiceUnlockedFlash]);

  useEffect(() => {
    return () => {
      if (typingPublishTimeoutRef.current) {
        window.clearTimeout(typingPublishTimeoutRef.current);
      }
      if (typingClearTimeoutRef.current) {
        window.clearTimeout(typingClearTimeoutRef.current);
      }
      if (typingHeartbeatRef.current) {
        window.clearInterval(typingHeartbeatRef.current);
      }
      if (room && profile?.id) {
        void persistRoomTyping(room, null);
      }
    };
  }, [profile?.id, room]);

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
    const node = chatEndRef.current;
    if (!node) {
      return;
    }

    if (!shouldForceScrollRef.current && !isNearBottomRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: shouldForceScrollRef.current ? "smooth" : "auto",
        block: "end",
      });
    });

    shouldForceScrollRef.current = false;
  }, [room?.messages.length]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => () => stopVoiceChat(), [stopVoiceChat]);

  const publishTypingState = (isTyping: boolean) => {
    if (!room || !profile?.id) {
      return;
    }

    typingActiveRef.current = isTyping;
    void persistRoomTyping(room, isTyping ? profile.id : null);
  };

  const clearTypingTimers = () => {
    if (typingPublishTimeoutRef.current) {
      window.clearTimeout(typingPublishTimeoutRef.current);
      typingPublishTimeoutRef.current = null;
    }

    if (typingClearTimeoutRef.current) {
      window.clearTimeout(typingClearTimeoutRef.current);
      typingClearTimeoutRef.current = null;
    }

    if (typingHeartbeatRef.current) {
      window.clearInterval(typingHeartbeatRef.current);
      typingHeartbeatRef.current = null;
    }
  };

  const stopTyping = () => {
    clearTypingTimers();
    publishTypingState(false);
  };

  const scheduleTypingState = (value: string) => {
    clearTypingTimers();

    if (!value.trim()) {
      publishTypingState(false);
      return;
    }

    const currentValue = value;
    typingPublishTimeoutRef.current = window.setTimeout(() => {
      if (!typingActiveRef.current) {
        publishTypingState(true);
      }

      if (typingHeartbeatRef.current) {
        window.clearInterval(typingHeartbeatRef.current);
      }

      typingHeartbeatRef.current = window.setInterval(() => {
        if (currentValue.trim()) {
          publishTypingState(true);
        }
      }, 900);
    }, 120);

    typingClearTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, 1200);
  };

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

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
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
  const timerLabel = `${String(Math.floor(sessionRemaining / 60)).padStart(2, "0")}:${String(sessionRemaining % 60).padStart(2, "0")}`;

  const timerProgress = ((sessionDurationSeconds - sessionRemaining) / sessionDurationSeconds) * 100;
  const voiceReady = room.voiceEnabled && sessionRemaining === 0;
  const timerUrgent = sessionRemaining <= 60;
  const timerPulseClass = sessionRemaining % 2 === 0 ? "scale-[1.01]" : "scale-100";
  const timerToneClass = timerUrgent ? "text-rose-200" : "text-white";
  const latestSystemMessage = [...room.messages].reverse().find((message) => message.type === "system")?.content;
  const sessionBanner = !online
    ? copy.session.connectionLost
    : isEnded
      ? latestSystemMessage ?? copy.session.ended
      : null;

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

    if (typingPublishTimeoutRef.current) {
      window.clearTimeout(typingPublishTimeoutRef.current);
      typingPublishTimeoutRef.current = null;
    }

    if (typingClearTimeoutRef.current) {
      window.clearTimeout(typingClearTimeoutRef.current);
      typingClearTimeoutRef.current = null;
    }

    if (typingHeartbeatRef.current) {
      window.clearInterval(typingHeartbeatRef.current);
      typingHeartbeatRef.current = null;
    }

    if (!value.trim()) {
      stopTyping();
      return;
    }

    scheduleTypingState(value);
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
    <div className="h-[100dvh] overflow-hidden bg-[#08101b] text-white">
      <div className="flex h-full min-h-0 flex-col">
        <header className="sticky top-0 z-30 flex-none border-b border-white/5 bg-[#0f1627]/92 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl sm:px-6">
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
          <div
            className={cn(
              "flex-none border-b px-4 py-3 text-sm sm:px-6",
              !online ? "border-amber-400/20 bg-amber-400/10 text-amber-50" : "border-white/10 bg-white/5 text-white/80",
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", !online ? "bg-amber-400/15 text-amber-100" : "bg-white/10 text-white")}>
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">{sessionBanner}</p>
                <p className={cn("mt-1 text-xs", !online ? "text-amber-50/70" : "text-white/45")}>
                  {!online
                    ? language === "en"
                      ? "We are reconnecting in the background."
                      : "Προσπαθούμε να επανασυνδεθούμε στο παρασκήνιο."
                    : language === "en"
                      ? "You can start a new session when you're ready."
                      : "Μπορείς να ξεκινήσεις νέο session όταν είσαι έτοιμος/η."}
                </p>
              </div>
            </div>
          </div>
        )}

        <main
          ref={chatScrollRef}
          onScroll={handleChatScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-4 py-4 sm:px-6"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-6">
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
                <div key={message.id} className={cn("flex animate-in fade-in slide-in-from-bottom-1 duration-300", isSelf ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[82%] space-y-1", isSelf ? "items-end text-right" : "items-start text-left")}>
                    <div className="flex items-center gap-2 px-1 text-xs text-white/35">
                      <span className="font-medium uppercase tracking-[0.22em] text-white/45">{isSelf ? "You" : "Stranger"}</span>
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
            <div ref={chatEndRef} />
          </div>
        </main>

        <footer className="sticky bottom-0 z-30 flex-none border-t border-white/5 bg-[#0b1220]/96 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4 backdrop-blur-xl sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
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
                      voiceReady && voiceState === "connected" && "ring-2 ring-violet-300/40",
                      !voiceReady && "cursor-not-allowed opacity-45",
                    )}
                    disabled={!voiceReady}
                    onClick={handleVoiceButton}
                  >
                    {voiceState === "connected" ? muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button type="submit" className="h-14 rounded-full bg-violet-500 px-5 text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400">
                    {copy.session.send}
                  </Button>
                </div>

                <div className="mt-3 flex min-h-[2.5rem] items-center justify-between gap-3">
                  {partnerTyping ? (
                    <div className="flex items-center gap-3 rounded-full border border-violet-300/15 bg-violet-500/10 px-4 py-2 text-sm text-violet-50">
                      <span className="font-medium">Stranger is typing...</span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-200 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-200 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-200" />
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-white/35">
                      {voiceReady
                        ? language === "en"
                          ? "Voice is ready — the microphone button unlocks now."
                          : "Η φωνή είναι έτοιμη — το μικρόφωνο ξεκλειδώνει τώρα."
                        : language === "en"
                          ? "Microphone unlocks when the timer reaches zero."
                          : "Το μικρόφωνο ξεκλειδώνει όταν ο χρόνος μηδενιστεί."}
                    </span>
                  )}
                </div>
              </form>
            ) : (
              <div className="rounded-[22px] bg-white/5 p-4 text-center text-white/70">{copy.session.howWasIt}</div>
            )}
          </div>
        </footer>

        <audio ref={audioRef} className="hidden" />
      </div>

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
    </div>
  );
};

export default SessionPage;