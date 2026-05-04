import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Flag, MessageCircle, Mic, MicOff, PhoneOff, ShieldAlert, Timer, Volume2, VolumeX } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const remainingSeconds = useMemo(() => {
    if (!room) {
      return sessionDurationSeconds;
    }

    const elapsedSeconds = Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 1000);
    return Math.max(0, sessionDurationSeconds - elapsedSeconds);
  }, [room]);

  const [liveRemaining, setLiveRemaining] = useState(remainingSeconds);

  useEffect(() => {
    setLiveRemaining(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!room || room.status !== "active") {
      return;
    }

    const interval = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 1000);
      const nextRemaining = Math.max(0, sessionDurationSeconds - elapsedSeconds);
      setLiveRemaining(nextRemaining);
      if (nextRemaining === 0) {
        unlockVoice();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [room, unlockVoice]);

  useEffect(() => {
    if (room?.status === "ended") {
      stopVoiceChat();
      setMuted(false);
    }
  }, [room?.status, stopVoiceChat]);

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
  const formattedTimer = `${String(Math.floor(liveRemaining / 60)).padStart(2, "0")}:${String(liveRemaining % 60).padStart(2, "0")}`;
  const timerProgress = ((sessionDurationSeconds - liveRemaining) / sessionDurationSeconds) * 100;
  const roomTitle = pickById(room.id, roomTitles);
  const roomTagline = pickById(room.id, roomTaglines);
  const partnerLabel = room.partner?.username ?? (language === "en" ? "Anonymous Echoer" : "Ανώνυμος Echoer");
  const partnerInitial = partnerLabel.charAt(0).toUpperCase();

  return (
    <PageShell className="min-h-[calc(100vh-2rem)]">
      <Surface className="overflow-hidden border-white/10 bg-[#0b1020] p-0 shadow-2xl shadow-black/20">
        <div className="border-b border-white/10 bg-[#10162a] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge className="rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/5">
                <MessageCircle className="mr-2 h-3.5 w-3.5" />
                {language === "en" ? "Room" : "Δωμάτιο"}
              </Badge>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{roomTitle}</h1>
                <p className="mt-1 text-sm text-white/55">{roomTagline}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-violet-500/15 text-violet-100 hover:bg-violet-500/15">
                <Timer className="mr-1 h-3.5 w-3.5" />
                {isActive ? formattedTimer : "00:00"}
              </Badge>
              <Button
                variant="outline"
                className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => leaveRoom(copy.session.partnerDisconnected)}
              >
                {copy.session.leave}
              </Button>
            </div>
          </div>

          <Progress value={timerProgress} className="mt-4 h-2 rounded-full bg-white/10 [&>div]:bg-violet-400" />
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="flex min-w-[150px] items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-sm font-semibold text-violet-100">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "You" : "Εσύ"}</p>
                  <p className="text-sm font-medium text-white">{profile.username}</p>
                </div>
              </div>

              <div className="flex min-w-[150px] items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  {partnerInitial}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                    {language === "en" ? "Partner" : "Συνομιλητής"}
                  </p>
                  <p className="text-sm font-medium text-white">{partnerLabel}</p>
                </div>
              </div>

              <Badge className="ml-auto rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/5">
                {voiceState === "connected"
                  ? copy.session.connected
                  : room.voiceEnabled
                    ? copy.session.startVoice
                    : `${copy.session.countdownLabel}: ${formattedTimer}`}
              </Badge>
            </div>

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
                          "max-w-[80%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
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
              <div className="flex items-center gap-2 text-white/80">
                <ShieldAlert className="h-4 w-4 text-violet-200" />
                <p className="text-sm font-medium">{copy.safety.title}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">{copy.landing.safetyBody}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">{language === "en" ? "Controls" : "Έλεγχοι"}</p>
              <div className="mt-4 grid gap-3">
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
                  className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() =>
                    setMuted((current) => {
                      const next = !current;
                      if (audioRef.current) {
                        audioRef.current.muted = next;
                      }
                      return next;
                    })
                  }
                >
                  {muted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                  {muted ? (language === "en" ? "Unmute" : "Έναρξη ήχου") : (language === "en" ? "Mute" : "Σίγαση")}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={blockCurrentPartner}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  {copy.session.block}
                </Button>
                {room.voiceEnabled ? (
                  <Button
                    className="h-12 rounded-full bg-white text-slate-950 hover:bg-white/90"
                    onClick={async () => {
                      if (voiceState === "connected") {
                        stopVoiceChat();
                        return;
                      }

                      if (audioRef.current) {
                        await startVoiceChat(audioRef.current);
                      }
                    }}
                  >
                    {voiceState === "connected" ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {voiceState === "connected"
                      ? language === "en"
                        ? "Disconnect voice"
                        : "Αποσύνδεση φωνής"
                      : copy.session.startVoice}
                  </Button>
                ) : (
                  <div className="rounded-[20px] border border-violet-400/15 bg-violet-400/10 px-4 py-3 text-sm text-violet-50/80">
                    {language === "en"
                      ? "Voice will appear after the timer reaches zero."
                      : "Η φωνή θα εμφανιστεί όταν ο χρόνος μηδενιστεί."}
                  </div>
                )}
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
