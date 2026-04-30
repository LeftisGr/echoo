import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Mic, PhoneOff, ShieldAlert, Timer } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
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
    voiceState,
  } = usePresence();
  const [draft, setDraft] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const remainingSeconds = useMemo(() => {
    if (!room) {
      return sessionDurationSeconds;
    }

    const elapsedMs = Date.now() - new Date(room.startedAt).getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
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
      const elapsedMs = Date.now() - new Date(room.startedAt).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
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
    }
  }, [room?.status, stopVoiceChat]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [room?.messages.length]);

  useEffect(() => {
    return () => stopVoiceChat();
  }, [stopVoiceChat]);

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
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

  const formattedTimer = `${String(Math.floor(liveRemaining / 60)).padStart(2, "0")}:${String(
    liveRemaining % 60,
  ).padStart(2, "0")}`;
  const timerProgress = ((sessionDurationSeconds - liveRemaining) / sessionDurationSeconds) * 100;
  const isActive = room.status === "active";

  return (
    <PageShell className="space-y-5">
      <audio ref={audioRef} className="hidden" />

      <Surface className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Echoo room</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {isActive ? copy.session.title : copy.session.ended}
            </h1>
          </div>
          <Button
            variant="outline"
            className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => leaveRoom(copy.session.partnerDisconnected)}
          >
            {copy.session.leave}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-white/80">
              <Timer className="h-4 w-4 text-violet-200" />
              <p className="text-sm font-medium">{copy.session.countdownLabel}</p>
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold text-white">{isActive ? formattedTimer : "00:00"}</p>
                <p className="mt-1 text-sm text-white/50">
                  {isActive
                    ? room.voiceEnabled
                      ? copy.session.voiceUnlocked
                      : copy.session.textNote
                    : copy.session.demoTimer}
                </p>
              </div>
              <div className="text-right text-xs text-white/40">
                <p>{language === "en" ? "Text phase" : "Φάση κειμένου"}</p>
                <p>10:00</p>
              </div>
            </div>
            <Progress value={timerProgress} className="mt-4 h-2 rounded-full bg-white/10 [&>div]:bg-violet-400" />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-white/80">
              <Mic className="h-4 w-4 text-violet-200" />
              <p className="text-sm font-medium">{language === "en" ? "Room state" : "Κατάσταση room"}</p>
            </div>
            <div className="mt-3 space-y-2 text-sm text-white/65">
              <p>
                <span className="text-white/90">{copy.session.you}:</span> {profile.username}
              </p>
              <p>
                <span className="text-white/90">{copy.session.partner}:</span> {room.partner.username}
              </p>
              <p>{isActive ? copy.session.textNote : copy.session.ended}</p>
            </div>
          </div>
        </div>

        {isActive ? (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-[#0b0f1a] p-3 sm:p-4">
              <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">
                <div>
                  <p className="text-sm font-medium text-white">{copy.session.title}</p>
                  <p className="text-xs text-white/45">
                    {room.voiceEnabled ? copy.session.voiceUnlocked : copy.session.textNote}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  {voiceState === "connected" ? copy.session.connected : copy.session.countdownLabel}
                </div>
              </div>

              <ScrollArea className="h-[42vh] min-h-[360px] pr-2">
                <div ref={messagesRef} className="space-y-3 py-4">
                  {room.messages.map((message) => {
                    const isSelf = message.senderId === profile.id;
                    const isSystem = message.type === "system";

                    if (isSystem) {
                      return (
                        <div
                          key={message.id}
                          className="mx-auto max-w-[92%] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-xs text-white/55"
                        >
                          {message.content}
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className={cn("flex", isSelf ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[82%] rounded-[26px] px-4 py-3 text-sm leading-6 shadow-sm",
                            isSelf
                              ? "rounded-br-md bg-white text-slate-950"
                              : "rounded-bl-md bg-[#111521] text-white ring-1 ring-white/10",
                          )}
                        >
                          {message.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <form
                className="border-t border-white/10 px-2 pt-4"
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
              </form>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-violet-400/15 bg-violet-400/10 p-4">
                <div className="flex items-center gap-3 text-violet-50">
                  <Mic className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">
                      {room.voiceEnabled ? copy.session.voiceUnlocked : copy.session.textNote}
                    </p>
                    <p className="text-sm text-violet-50/70">
                      {room.voiceEnabled
                        ? voiceState === "connected"
                          ? copy.session.connected
                          : copy.session.startVoice
                        : `${copy.session.countdownLabel}: ${formattedTimer}`}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    disabled={!room.voiceEnabled}
                    className="h-12 rounded-full bg-white text-slate-950 hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/35 disabled:text-slate-700"
                    onClick={async () => {
                      if (room.voiceEnabled && audioRef.current) {
                        await startVoiceChat(audioRef.current);
                      }
                    }}
                  >
                    {room.voiceEnabled ? copy.session.startVoice : formattedTimer}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => navigate("/settings")}
                  >
                    {copy.nav.settings}
                  </Button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white/80">
                  <ShieldAlert className="h-4 w-4 text-violet-200" />
                  <p className="text-sm font-medium">{copy.safety.title}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/60">{copy.landing.safetyBody}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {copy.session.report}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-rose-400/20 bg-rose-400/10 text-rose-50 hover:bg-rose-400/15 hover:text-rose-50"
                    onClick={blockCurrentPartner}
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    {copy.session.block}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-lg font-medium text-white">{copy.session.ended}</p>
              <p className="mt-2 text-sm text-white/55">{copy.session.howWasIt}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
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
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="h-12 rounded-full bg-violet-500 text-white hover:bg-violet-400"
                onClick={async () => {
                  await startNewSessionFromEndedRoom();
                  navigate("/queue");
                }}
              >
                {copy.session.findNew}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link to="/dashboard">
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
      </Surface>
    </PageShell>
  );
};

export default SessionPage;
