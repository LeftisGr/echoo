import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Flag,
  Mic,
  PhoneOff,
  ShieldAlert,
  Timer,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
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
    unlockVoice,
    sendMessage,
    leaveRoom,
    rateRoom,
    reportCurrentRoom,
    blockCurrentPartner,
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
  const [messagePulse, setMessagePulse] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }

    setSessionRemaining(sessionDurationSeconds);
    setVoiceUnlockedFlash(false);
    setMessagePulse((current) => current + 1);

    const interval = window.setInterval(() => {
      setSessionRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          unlockVoice();
          setVoiceUnlockedFlash(true);
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
    const node = messagesRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [room?.messages.length, messagePulse]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => () => stopVoiceChat(), [stopVoiceChat]);

  useEffect(() => {
    if (room && queue.active) {
      void cancelQueue();
    }
  }, [cancelQueue, queue.active, room]);

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
  const partnerLabel = room.partner?.username ?? (language === "en" ? "Stranger" : "Stranger");
  const timerLabel = `${String(Math.floor(sessionRemaining / 60)).padStart(2, "0")}:${String(sessionRemaining % 60).padStart(2, "0")}`;
  const timerProgress = ((sessionDurationSeconds - sessionRemaining) / sessionDurationSeconds) * 100;
  const voiceReady = room.voiceEnabled && sessionRemaining === 0;

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

  return (
    <PageShell className="min-h-[calc(100vh-2rem)]">
      <Surface className="overflow-hidden border-0 bg-[#0a0f1a] p-0 shadow-2xl shadow-black/30">
        <div className="border-b border-white/5 bg-[#0f1526] px-4 py-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-violet-100 ring-1 ring-white/5">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/35">Room</p>
                <h1 className="text-xl font-semibold tracking-tight text-white">Private Session</h1>
              </div>
            </div>

            <div className="order-first flex flex-col items-center lg:order-none">
              <div className="rounded-full border border-white/5 bg-white/5 px-5 py-3 shadow-[0_0_50px_rgba(129,140,248,0.12)]">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/35 text-center">
                  {language === "en" ? "Session timer" : "Χρονομετρητής"}
                </p>
                <div className={cn("mt-1 text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl", voiceUnlockedFlash && "animate-pulse text-violet-200")}>
                  {timerLabel}
                </div>
              </div>
              <Progress value={timerProgress} className="mt-3 h-1.5 w-full max-w-[260px] rounded-full bg-white/10 [&>div]:bg-violet-400" />
            </div>

            <div className="flex items-center justify-end gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-rose-400/20 bg-rose-400/10 px-4 text-rose-50 hover:bg-rose-400/15 hover:text-rose-50"
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
        </div>

        <div className="flex min-h-[calc(100vh-14rem)] flex-col">
          <ScrollArea className="flex-1 scroll-smooth px-4 py-4 sm:px-6">
            <div ref={messagesRef} className="space-y-4 pb-6">
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
          </ScrollArea>

          <div className="border-t border-white/5 bg-[#0c1120]/95 p-4 backdrop-blur">
            {isActive ? (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const nextDraft = draft.trim();
                  if (!nextDraft) {
                    return;
                  }
                  await sendMessage(nextDraft);
                  setDraft("");
                }}
              >
                <div className="flex items-center gap-3">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={language === "en" ? "Write a message..." : "Γράψε ένα μήνυμα..."}
                    className="h-14 rounded-full border-0 bg-white/6 px-5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-violet-400/50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-14 w-14 rounded-full border-0 bg-white/6 p-0 text-white hover:bg-white/10 hover:text-white",
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
                  <Button type="submit" className="h-14 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400">
                    {copy.session.send}
                  </Button>
                </div>
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
          </div>
        </div>

        {!isActive && (
          <div className="border-t border-white/5 bg-[#0c1120]/95 p-4 backdrop-blur">
            <p className="text-lg font-medium text-white">{copy.session.ended}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ratingOptions.map((score) => (
                <Button
                  key={score}
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => rateRoom(score)}
                >
                  {localizeRating(language, score)}
                </Button>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button
                className="h-12 flex-1 rounded-full bg-violet-500 text-white hover:bg-violet-400"
                onClick={async () => {
                  await startNewSessionFromEndedRoom();
                  navigate("/queue");
                }}
              >
                {copy.session.findNew}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link to="/dashboard" className="flex-1">
                <Button variant="outline" className="h-12 w-full rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  {copy.session.backHome}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Surface>
      <audio ref={audioRef} className="hidden" />
    </PageShell>
  );
};

export default SessionPage;
