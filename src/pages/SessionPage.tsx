import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Mic, PhoneOff, ShieldAlert, Timer } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { localizeRating, ratingOptions } from "@/lib/presence-content";
import { cn } from "@/lib/utils";

const acceleratedFactor = 20;
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
  const [showVoicePrompt, setShowVoicePrompt] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const remainingSeconds = useMemo(() => {
    if (!room) {
      return sessionDurationSeconds;
    }

    const elapsedMs = Date.now() - new Date(room.startedAt).getTime();
    const acceleratedSeconds = Math.floor((elapsedMs / 1000) * acceleratedFactor);
    return Math.max(0, sessionDurationSeconds - acceleratedSeconds);
  }, [room]);

  const [liveRemaining, setLiveRemaining] = useState(remainingSeconds);

  useEffect(() => {
    if (!room || room.status !== "active") {
      return;
    }

    const interval = window.setInterval(() => {
      const elapsedMs = Date.now() - new Date(room.startedAt).getTime();
      const acceleratedSeconds = Math.floor((elapsedMs / 1000) * acceleratedFactor);
      const nextRemaining = Math.max(0, sessionDurationSeconds - acceleratedSeconds);
      setLiveRemaining(nextRemaining);
      if (nextRemaining === 0) {
        unlockVoice();
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [room, unlockVoice]);

  useEffect(() => {
    setShowVoicePrompt(true);
  }, [room?.id]);

  useEffect(() => {
    const node = messagesRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [room?.messages.length]);

  useEffect(() => {
    return () => stopVoiceChat();
  }, [stopVoiceChat]);

  if (!authenticated || !profile) {
    return <Navigate to="/auth" replace />;
  }

  if (!room) {
    return <Navigate to="/dashboard" replace />;
  }

  const formattedTimer = `${String(Math.floor(liveRemaining / 60)).padStart(2, "0")}:${String(
    liveRemaining % 60,
  ).padStart(2, "0")}`;

  return (
    <PageShell className="space-y-5">
      <audio ref={audioRef} className="hidden" />
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            <Timer className="h-4 w-4 text-violet-200" />
            {formattedTimer}
          </div>
          <Button
            variant="outline"
            className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => leaveRoom(copy.session.partnerDisconnected)}
          >
            {copy.session.leave}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">{copy.session.you}</div>
          <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10">
            {copy.session.partner}
          </div>
        </div>
        <div className="rounded-[24px] border border-violet-400/15 bg-violet-400/10 px-4 py-3 text-sm text-violet-50">
          {copy.session.textNote}
        </div>
        <div className="text-xs text-white/45">{copy.session.demoTimer}</div>
      </Surface>

      <Surface className="flex h-[60vh] min-h-[520px] flex-col overflow-hidden p-0">
        <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-3">
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
        </div>

        {room.status === "active" ? (
          <form
            className="border-t border-white/10 p-4"
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
        ) : (
          <div className="space-y-5 border-t border-white/10 p-5">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-center">
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

      {room.status === "active" && (
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Surface className="space-y-4 p-5">
            <div className="flex items-center gap-3 text-white">
              <Mic className="h-5 w-5 text-violet-200" />
              <div>
                <p className="text-sm font-medium text-white">
                  {language === "en" ? "Voice status" : "Κατάσταση φωνής"}
                </p>
                <p className="text-sm text-white/55">{voiceState === "connected" ? copy.session.connected : copy.session.textNote}</p>
              </div>
            </div>
            {room.voiceEnabled && showVoicePrompt ? (
              <div className="rounded-[26px] border border-violet-400/20 bg-violet-400/10 p-4">
                <p className="text-lg font-medium text-violet-50">{copy.session.voiceUnlocked}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    className="h-12 rounded-full bg-white text-slate-950 hover:bg-white/90"
                    onClick={async () => {
                      if (audioRef.current) {
                        await startVoiceChat(audioRef.current);
                      }
                    }}
                  >
                    {copy.session.startVoice}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => setShowVoicePrompt(false)}
                  >
                    {copy.session.keepText}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                {room.voiceEnabled
                  ? voiceState === "connected"
                    ? copy.session.connected
                    : copy.session.keepText
                  : copy.session.textNote}
              </div>
            )}
            {voiceState === "connected" && (
              <Button
                variant="outline"
                className="h-12 rounded-full border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/15 hover:text-red-50"
                onClick={stopVoiceChat}
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                {copy.session.leave}
              </Button>
            )}
          </Surface>

          <Surface className="space-y-4 p-5">
            <div className="flex items-center gap-3 text-white">
              <ShieldAlert className="h-5 w-5 text-violet-200" />
              <div>
                <p className="text-sm font-medium text-white">{language === "en" ? "Safety" : "Ασφάλεια"}</p>

                <p className="text-sm text-white/55">{copy.landing.safetyBody}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-full border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15 hover:text-amber-50"
                onClick={() => void reportCurrentRoom(language === "en" ? "Abusive behavior" : "Κακοποιητική συμπεριφορά")}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {copy.session.report}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={blockCurrentPartner}
              >
                {copy.session.block}
              </Button>
            </div>
          </Surface>
        </div>
      )}
    </PageShell>
  );
};

export default SessionPage;