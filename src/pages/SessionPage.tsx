import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Flag,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  ShieldAlert,
  Timer,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

const roomTitles = [
  "Signal Lounge",
  "Velvet Circuit",
  "Moonlit Relay",
  "Echo Deck",
  "Pulse Room",
  "Late Night Channel",
  "Afterglow Room",
  "Soft Static",
];

const roomTaglines = [
  "One room. Two voices. No pressure.",
  "Text first, voice later.",
  "A quiet place to meet someone new.",
  "Simple conversation, shared time.",
];

function pickById(id: string, items: string[]) {
  const score = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[score % items.length];
}

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }

    setSessionRemaining(sessionDurationSeconds);
    setVoiceUnlockedFlash(false);

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

    const timeout = window.setTimeout(() => setVoiceUnlockedFlash(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [voiceUnlockedFlash]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [room?.messages.length]);

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
  const roomTitle = pickById(room.id, roomTitles);
  const roomTagline = pickById(room.id, roomTaglines);
  const partnerLabel = room.partner?.username ?? (language === "en" ? "Anonymous Echoer" : "Ανώνυμος Echoer");
  const partnerInitial = partnerLabel.charAt(0).toUpperCase();
  const timerLabel = `${String(Math.floor(sessionRemaining / 60)).padStart(2, "0")}:${String(sessionRemaining % 60).padStart(2, "0")}`;
  const timerProgress = ((sessionDurationSeconds - sessionRemaining) / sessionDurationSeconds) * 100;
  const voiceReady = room.voiceEnabled && sessionRemaining === 0;

  const voiceButtonLabel = voiceState === "connected"
    ? muted
      ? language === "en"
        ? "Unmute"
        : "Ήχος"
      : language === "en"
        ? "Mute"
        : "Σίγαση"
    : voiceReady
      ? copy.session.startVoice
      : language === "en"
        ? "Voice locked"
        : "Κλειδωμένη φωνή";

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
      <Surface className="overflow-hidden border-white/10 bg-[#0b1020] p-0 shadow-2xl shadow-black/20">
        <div className="border-b border-white/10 bg-[#10162a] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/5">
                  <MessageCircle className="mr-2 h-3.5 w-3.5" />
                  {language === "en" ? "Room" : "Δωμάτιο"}
                </Badge>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 rounded-full border-violet-400/20 bg-violet-400/10 px-4 text-violet-50 hover:bg-violet-400/15 hover:text-violet-50"
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      {language === "en" ? "Safety" : "Ασφάλεια"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-white/10 bg-[#0f1424] text-white sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{language === "en" ? "Room safety" : "Ασφάλεια δωματίου"}</DialogTitle>
                      <DialogDescription className="text-white/55">
                        {language === "en"
                          ? "Respect comes first. You can report, block, or mute at any time."
                          : "Ο σεβασμός είναι ο βασικός κανόνας. Μπορείς να κάνεις report, block ή mute οποιαδήποτε στιγμή."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm leading-6 text-white/70">
                      <p>{language === "en" ? "• No harassment or threats." : "• Χωρίς παρενόχληση ή απειλές."}</p>
                      <p>{language === "en" ? "• Leave anytime if it feels wrong." : "• Φύγε οποιαδήποτε στιγμή αν κάτι δεν σου ταιριάζει."}</p>
                      <p>{language === "en" ? "• Report, block, and mute stay available." : "• Report, block και mute παραμένουν διαθέσιμα."}</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                        onClick={() =>
                          reportCurrentRoom(
                            language === "en"
                              ? "Conversation reported from the room."
                              : "Η συνομιλία αναφέρθηκε από το room.",
                          )
                        }
                      >
                        <Flag className="mr-2 h-4 w-4" />
                        {copy.session.report}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                        onClick={blockCurrentPartner}
                      >
                        <PhoneOff className="mr-2 h-4 w-4" />
                        {copy.session.block}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{roomTitle}</h1>
                <p className="mt-1 text-sm text-white/55">{roomTagline}</p>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 rounded-full border-violet-400/20 bg-violet-400/10 px-4 text-violet-50 hover:bg-violet-400/15 hover:text-violet-50"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Echoers 2/2
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-white/10 bg-[#0f1424] text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{language === "en" ? "Echoers in this room" : "Echoers σε αυτό το room"}</DialogTitle>
                    <DialogDescription className="text-white/55">
                      {language === "en"
                        ? "This room is always 1-to-1."
                        : "Αυτό το room είναι πάντα 1-προς-1."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "You" : "Εσύ"}</p>
                      <p className="mt-1 text-base font-medium text-white">{profile.username}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Partner" : "Συνομιλητής"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-base font-medium text-white">{partnerLabel}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                          onClick={() =>
                            reportCurrentRoom(
                              language === "en"
                                ? "Conversation reported from the participants view."
                                : "Η συνομιλία αναφέρθηκε από το παράθυρο συμμετεχόντων.",
                            )
                          }
                        >
                          <Flag className="mr-1 h-3.5 w-3.5" />
                          {copy.session.report}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full border-rose-400/20 bg-rose-400/10 text-rose-50 hover:bg-rose-400/15 hover:text-rose-50"
                          onClick={blockCurrentPartner}
                        >
                          <PhoneOff className="mr-1 h-3.5 w-3.5" />
                          {copy.session.block}
                        </Button>
                      </div>
                    </div>
                  </div>

                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:max-w-[220px]">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-rose-400/25 bg-rose-400/10 text-rose-50 hover:bg-rose-400/15 hover:text-rose-50"
                  >
                    {copy.session.leave}
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

              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Timer" : "Χρόνος"}</p>
                <div className={cn("mt-1 text-3xl font-semibold tracking-tight text-white", voiceUnlockedFlash && "animate-pulse text-violet-200")}>{timerLabel}</div>
              </div>
            </div>
          </div>

          <Progress value={timerProgress} className="mt-4 h-2 rounded-full bg-white/10 [&>div]:bg-violet-400" />
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex min-h-[70vh] flex-col border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
            <ScrollArea className="flex-1 px-4 py-4 sm:px-5">
              <div ref={messagesRef} className="space-y-3 pb-4">
                {room.messages.map((message) => {
                  const isSelf = message.senderId === profile.id;
                  const isSystem = message.type === "system";

                  if (isSystem) {
                    return (
                      <div
                        key={message.id}
                        className="mx-auto max-w-[90%] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-xs text-white/55"
                      >
                        {message.content}
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className={cn("flex", isSelf ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[84%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
                          isSelf ? "rounded-br-md bg-white text-slate-950" : "rounded-bl-md bg-[#151b30] text-white ring-1 ring-white/10",
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-white/10 p-4 sm:p-5">
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
                  <div className="flex gap-3">
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={copy.session.placeholder}
                      className="h-12 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/35"
                    />
                    <Button className="h-12 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400">
                      {copy.session.send}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    {language === "en"
                      ? "Text is the default. Voice unlocks after 10 minutes."
                      : "Το κείμενο είναι το βασικό mode. Η φωνή ξεκλειδώνει μετά από 10 λεπτά."}
                  </p>
                </form>
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-center text-white/70">
                  {copy.session.howWasIt}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Voice" : "Φωνή"}</p>
              <Button
                className="mt-3 h-12 w-full rounded-full bg-white text-slate-950 hover:bg-white/90"
                onClick={handleVoiceButton}
              >
                {voiceState === "connected" ? (
                  muted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />
                ) : voiceReady ? (
                  <Mic className="mr-2 h-4 w-4" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                {voiceButtonLabel}
              </Button>
              <p className="mt-3 text-xs leading-5 text-white/45">
                {voiceState === "connected"
                  ? language === "en"
                    ? "Use this button to mute or unmute."
                    : "Χρησιμοποίησε αυτό το κουμπί για mute ή unmute."
                  : voiceReady
                    ? language === "en"
                      ? "The mic appears when the timer ends."
                      : "Το μικρόφωνο εμφανίζεται όταν τελειώσει ο χρόνος."
                    : language === "en"
                      ? "Voice is locked until the timer reaches zero."
                      : "Η φωνή παραμένει κλειδωμένη μέχρι να μηδενιστεί ο χρόνος."}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-white/80">
                <ShieldAlert className="h-4 w-4 text-violet-200" />
                <p className="text-sm font-medium">{copy.safety.title}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">{copy.landing.safetyBody}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Quick actions" : "Γρήγορες ενέργειες"}</p>
              <div className="mt-4 grid gap-3">
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={blockCurrentPartner}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  {copy.session.block}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setMuted((current) => !current)}
                >
                  {muted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                  {muted ? (language === "en" ? "Unmute" : "Ήχος") : (language === "en" ? "Mute" : "Σίγαση")}
                </Button>
              </div>
            </div>

            {!isActive && (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-lg font-medium text-white">{copy.session.ended}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ratingOptions.map((score) => (
                    <Button
                      key={score}
                      variant="outline"
                      className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    >
                      {copy.session.backHome}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </Surface>
      <audio ref={audioRef} className="hidden" />
    </PageShell>
  );
};

export default SessionPage;
