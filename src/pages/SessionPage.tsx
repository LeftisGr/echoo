import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { ArrowRight, Check, Film, Flag, Home, ImagePlus, Info, Mic, Paperclip, PhoneOff, ShieldAlert, Send, X } from "lucide-react";

import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { PageShell, Surface } from "@/components/presence/presence-shell";
import { SessionMediaMessage } from "@/components/session/session-media-message";
import { SessionProgressHeader } from "@/components/session/session-progress-header";
import { usePresence } from "@/components/presence/presence-provider";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_MEDIA_MESSAGES_PER_SESSION,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  MEDIA_UPLOAD_COOLDOWN_MS,
  type MediaPreviewData,
  prepareMediaUpload,
} from "@/lib/session-media";
import { cn } from "@/lib/utils";
import { SESSION_TOTAL_PROGRESS_SECONDS, useSessionProgression } from "@/lib/session-progression";

function getRoomDisplayName(roomId: string) {
  const suffix = roomId
    .replace(/-/g, "")
    .slice(0, 8)
    .split("")
    .reduce((value, char) => value + char.charCodeAt(0), 0);

  return `Moment #${String(100 + (suffix % 900)).padStart(3, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SessionPage = () => {

  const navigate = useNavigate();
  const { roomId: routeRoomId } = useParams();
  const {
    authenticated,
    appReady,
    initializing,
    queue,

    room,

    roomLoaded,

    profile,
    copy,
    language,
    online,
    unlockVoice,
    sendMessage,
    sendMediaMessage,
    appendSystemMessage,
    leaveRoom,
    rateRoom,
    reportCurrentRoom,
    startNewSessionFromEndedRoom,

    startVoiceChat,
    stopVoiceChat,
    enableVoicePlayback,
    setVoiceTransmissionEnabled,
    sendTypingState,
    typingIndicator,
    voiceState,
    voicePlaybackBlocked,
    voiceDiagnostics,
  } = usePresence();

  const [draft, setDraft] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);

  const [selectedMedia, setSelectedMedia] = useState<MediaPreviewData | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const voiceAutoStartRoomIdRef = useRef<string | null>(null);
  const [reportReason, setReportReason] = useState("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [recentMessageId, setRecentMessageId] = useState<string | null>(null);

  const pttPointerIdRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);
  const pttStartedAtRef = useRef<number | null>(null);
  const pttReleaseTimeoutRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const mediaCooldownRef = useRef(0);
  const mediaSendCountRef = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const shouldForceScrollRef = useRef(true);

  const isNearBottomRef = useRef(true);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const lastVoiceUnlockAtRef = useRef<string | null>(null);
  const mediaUnlockMessageRoomIdRef = useRef<string | null>(null);

  const sessionProgression = useSessionProgression(room?.startedAt);
  const phase = sessionProgression.phase;

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
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!room) {
      return;
    }

    if (room.id !== routeRoomId) {
      lastVoiceUnlockAtRef.current = null;
      voiceAutoStartRoomIdRef.current = null;
      mediaUnlockMessageRoomIdRef.current = null;
      setReportDialogOpen(false);
      setReportReason("harassment");
      setReportDetails("");
      setAttachmentMenuOpen(false);
      setSelectedMedia(null);
      setMediaCaption("");
      setMediaError(null);
      setMediaBusy(false);
      mediaCooldownRef.current = 0;
      mediaSendCountRef.current = 0;
    }

    shouldForceScrollRef.current = true;
    isNearBottomRef.current = true;
  }, [room?.id, routeRoomId]);


  useEffect(() => {
    if (!room?.messages.length) {
      previousLastMessageIdRef.current = null;
      setRecentMessageId(null);
      return;
    }

    const lastMessageId = room.messages[room.messages.length - 1]?.id ?? null;
    if (!lastMessageId || previousLastMessageIdRef.current === lastMessageId) {
      return;
    }

    previousLastMessageIdRef.current = lastMessageId;
    setRecentMessageId(lastMessageId);

    const timeout = window.setTimeout(() => setRecentMessageId(null), 900);

    return () => window.clearTimeout(timeout);
  }, [room?.messages]);

  useEffect(() => () => stopTypingIndicator(), []);

  useEffect(() => {
    if (!room || phase === "TEXT_PHASE" || room.voiceUnlockedAt) {
      return;
    }

    unlockVoice();
  }, [phase, room, unlockVoice]);

  useEffect(() => {
    if (!room?.voiceUnlockedAt || room.voiceUnlockedAt === lastVoiceUnlockAtRef.current) {
      return;
    }

    lastVoiceUnlockAtRef.current = room.voiceUnlockedAt;
    appendSystemMessage(copy.session.voiceUnlocked);

    if (voiceAutoStartRoomIdRef.current === room.id) {
      return;
    }

    voiceAutoStartRoomIdRef.current = room.id;
    void startVoiceChat();
  }, [appendSystemMessage, copy.session.voiceUnlocked, room?.id, room?.voiceUnlockedAt, startVoiceChat]);

  useEffect(() => {
    if (!room || phase === "TEXT_PHASE") {
      return;
    }

    if (mediaUnlockMessageRoomIdRef.current === room.id) {
      return;
    }

    mediaUnlockMessageRoomIdRef.current = room.id;
    appendSystemMessage(copy.session.mediaUnlocked);
    console.info("[session] media unlocked", { roomId: room.id, phase });
  }, [appendSystemMessage, copy.session.mediaUnlocked, phase, room]);

  useEffect(() => {
    if (phase !== "TEXT_PHASE") {
      return;
    }

    setAttachmentMenuOpen(false);
    setSelectedMedia(null);
    setMediaCaption("");
    setMediaError(null);
    setMediaBusy(false);
  }, [phase]);

  useEffect(() => {

    const node = chatScrollRef.current;

    if (!node) {
      return;
    }

    if (!shouldForceScrollRef.current && !isNearBottomRef.current) {
      return;
    }

    const behavior: ScrollBehavior = shouldForceScrollRef.current ? "smooth" : "auto";
    const frame = window.requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior });
    });

    shouldForceScrollRef.current = false;
    return () => window.cancelAnimationFrame(frame);
  }, [room?.messages.length, recentMessageId]);

  useEffect(() => () => stopVoiceChat(), [stopVoiceChat]);



  useEffect(() => {
    if (room?.status === "ended") {
      stopTypingIndicator();
    }
  }, [room?.status]);

  useEffect(() => {
    const node = chatScrollRef.current;

    if (!room || !node) {
      return;
    }

    shouldForceScrollRef.current = true;
    isNearBottomRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      shouldForceScrollRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [room?.id]);

  const voiceReady =
    room?.voiceEnabled &&
    phase !== "TEXT_PHASE" &&
    voiceState === "connected";

  function stopTypingIndicator() {
    if (typingStopTimeoutRef.current) {
      window.clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    if (!typingActiveRef.current) {
      return;
    }

    typingActiveRef.current = false;
    sendTypingState(false);
  }

  function startTypingIndicator() {
    if (typingActiveRef.current) {
      return;
    }

    typingActiveRef.current = true;
    sendTypingState(true);
  }

  function queueTypingStop() {
    if (typingStopTimeoutRef.current) {
      window.clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = window.setTimeout(() => {
      stopTypingIndicator();
    }, 1500);
  }

  function resetMediaSelection() {
    if (selectedMedia?.previewUrl) {
      URL.revokeObjectURL(selectedMedia.previewUrl);
    }

    setSelectedMedia(null);
    setMediaCaption("");
    setMediaError(null);
    setMediaBusy(false);
  }

  async function handleMediaFileSelected(file: File) {
    setMediaError(null);

    if (!file) {
      return;
    }

    if (!file.type) {
      setMediaError(language === "en" ? "Unsupported file type." : "Μη υποστηριζόμενος τύπος αρχείου.");
      return;
    }

    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE_BYTES) {
      setMediaError(language === "en" ? "Image is too large." : "Η εικόνα είναι πολύ μεγάλη.");
      return;
    }

    if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE_BYTES) {
      setMediaError(language === "en" ? "Video is too large." : "Το βίντεο είναι πολύ μεγάλο.");
      return;
    }

    try {
      const prepared = await prepareMediaUpload(file);

      if (prepared.kind === "video" && (prepared.durationSeconds ?? 0) > MAX_VIDEO_DURATION_SECONDS) {
        setMediaError(language === "en" ? "Video is longer than the allowed limit." : "Το βίντεο ξεπερνά το επιτρεπτό όριο.");
        return;
      }

      const previewUrl = URL.createObjectURL(prepared.file);
      setSelectedMedia((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return {
          kind: prepared.kind,
          file: prepared.file,
          previewUrl,
          displayName: prepared.displayName,
          size: prepared.size,
          durationSeconds: prepared.durationSeconds,
          width: prepared.width,
          height: prepared.height,
        };
      });
      setAttachmentMenuOpen(false);
    } catch (mediaError) {
      setMediaError(mediaError instanceof Error ? mediaError.message : language === "en" ? "Could not read the file." : "Δεν ήταν δυνατή η ανάγνωση του αρχείου.");
    }
  }

  async function sendSelectedMedia() {
    if (!selectedMedia || mediaBusy) {
      return;
    }

    const now = Date.now();
    if (mediaCooldownRef.current && now - mediaCooldownRef.current < MEDIA_UPLOAD_COOLDOWN_MS) {
      setMediaError(language === "en" ? "Please wait a moment before sending another media item." : "Περίμενε λίγο πριν στείλεις άλλο media.");
      return;
    }

    if (mediaSendCountRef.current >= MAX_MEDIA_MESSAGES_PER_SESSION) {
      setMediaError(language === "en" ? "Media sharing limit reached for this session." : "Έφτασες το όριο media για αυτό το session.");
      return;
    }

    setMediaBusy(true);
    console.info("[media] send requested", {
      roomId: room?.id ?? null,
      phase,
      kind: selectedMedia.kind,
      fileName: selectedMedia.displayName,
      fileSize: selectedMedia.size,
      fileType: selectedMedia.file.type,
    });
    try {
      await sendMediaMessage({
        file: selectedMedia.file,
        caption: mediaCaption.trim(),
        preview: selectedMedia,
      });
      mediaCooldownRef.current = Date.now();
      mediaSendCountRef.current += 1;
      console.info("[media] send completed", {
        roomId: room?.id ?? null,
        phase,
        kind: selectedMedia.kind,
        fileName: selectedMedia.displayName,
      });
      resetMediaSelection();
    } catch (mediaSendError) {
      console.info("[media] send failed", {
        roomId: room?.id ?? null,
        phase,
        error: mediaSendError instanceof Error ? mediaSendError.message : String(mediaSendError),
      });
      setMediaError(mediaSendError instanceof Error ? mediaSendError.message : language === "en" ? "Upload failed." : "Η αποστολή απέτυχε.");
    } finally {
      setMediaBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      if (selectedMedia?.previewUrl) {
        URL.revokeObjectURL(selectedMedia.previewUrl);
      }
    };
  }, [selectedMedia?.previewUrl]);

  useEffect(() => {
    console.info("[typing] render state", {
      roomId: room?.id ?? null,
      remoteTyping: Boolean(typingIndicator),
    });
  }, [room?.id, typingIndicator]);

  useEffect(() => {
    console.info("[ptt] component rerender", {
      roomId: room?.id ?? null,
      phase,
      voiceState,
      voiceReady,
      isPressing: Boolean(voiceDiagnostics?.isPressing),
      transmitting: Boolean(voiceDiagnostics?.transmitting),
    });
  }, [phase, room?.id, voiceDiagnostics?.isPressing, voiceDiagnostics?.transmitting, voiceReady, voiceState]);

  const clearPushToTalkReleaseTimeout = useCallback(() => {
    if (pttReleaseTimeoutRef.current !== null) {
      window.clearTimeout(pttReleaseTimeoutRef.current);
      pttReleaseTimeoutRef.current = null;
    }
  }, []);

  const releasePushToTalk = useCallback(
    (pointerId?: number) => {
      if (pointerId !== undefined && pttPointerIdRef.current !== pointerId) {
        return;
      }

      if (!isPressingRef.current) {
        return;
      }

      clearPushToTalkReleaseTimeout();
      isPressingRef.current = false;
      pttPointerIdRef.current = null;
      pttStartedAtRef.current = null;
      console.info("[ptt] press end", {
        roomId: room?.id ?? null,
        phase,
        pointerId: pointerId ?? null,
      });
      console.info("[ptt] disabling track", {
        roomId: room?.id ?? null,
        phase,
        pointerId: pointerId ?? null,
      });
      setVoiceTransmissionEnabled(false);

    },
    [clearPushToTalkReleaseTimeout, phase, room?.id, setVoiceTransmissionEnabled],
  );

  const handlePushToTalkPress = useCallback(
    (pointerId: number) => {
      if (!voiceReady || voiceState !== "connected" || isPressingRef.current) {
        console.info("[ptt] pointerdown ignored", {
          roomId: room?.id ?? null,
          phase,
          voiceState,
          voiceReady,
          pointerId,
          alreadyPressing: isPressingRef.current,
        });
        return;
      }

      clearPushToTalkReleaseTimeout();
      isPressingRef.current = true;
      pttPointerIdRef.current = pointerId;
      pttStartedAtRef.current = Date.now();

      console.info("[ptt] press start", {
        roomId: room?.id ?? null,
        phase,
        voiceState,
        pointerId,
      });
      console.info("[ptt] enabling track", {
        roomId: room?.id ?? null,
        phase,
        pointerId,
      });
      setVoiceTransmissionEnabled(true);

    },
    [clearPushToTalkReleaseTimeout, phase, room?.id, setVoiceTransmissionEnabled, voiceReady, voiceState],
  );

  useEffect(() => {
    const handleWindowBlur = () => {
      stopTypingIndicator();
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [stopTypingIndicator]);

  useEffect(() => () => {
    clearPushToTalkReleaseTimeout();
    releasePushToTalk();
    stopTypingIndicator();
  }, [clearPushToTalkReleaseTimeout, releasePushToTalk, stopTypingIndicator]);

  if (initializing || !appReady || !roomLoaded || (queue.active && !room)) {

    return (
      <PageShell className="flex items-center">
        <Surface className="mx-auto w-full max-w-2xl space-y-3 p-6 text-center sm:p-10">
          <p className="text-sm uppercase tracking-[0.28em] text-white/40">Echoo</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{copy.misc.loading}</h1>

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

  if (routeRoomId && routeRoomId !== room.id) {
    return <Navigate to={`/session/${room.id}`} replace />;
  }

  if (!profile) {

    return (
      <PageShell className="flex items-center">
        <Surface className="mx-auto w-full max-w-2xl space-y-3 p-6 text-center sm:p-10">
          <p className="text-sm uppercase tracking-[0.28em] text-white/40">Echoo</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {copy.misc.loadingProfile}
          </h1>

        </Surface>
      </PageShell>
    );
  }

  const isActive = room.status === "active";
  const isEnded = room.status === "ended";
  const secondsRemaining =
    phase === "TEXT_PHASE"
      ? sessionProgression.secondsUntilVoiceUnlock
      : phase === "AUDIO_PHASE"
        ? sessionProgression.secondsUntilMediaUnlock
        : 0;
  const timerLabel = `${String(Math.floor(secondsRemaining / 60)).padStart(2, "0")}:${String(secondsRemaining % 60).padStart(2, "0")}`;

  const timerProgress = Math.min((sessionProgression.elapsedSeconds / SESSION_TOTAL_PROGRESS_SECONDS) * 100, 100);

  const voiceStatusInlineLabel =
    voiceState === "connected"
      ? language === "en"
        ? "You’re live"
        : "Είσαι live"
      : voiceState === "connecting" || voiceState === "requesting-microphone"
        ? copy.session.listening
        : voiceState === "reconnecting"
          ? language === "en"
            ? "Trying to reconnect"
            : "Προσπαθούμε να επανασυνδεθούμε"
          : voiceState === "failed" || voiceState === "error"
            ? language === "en"
              ? "Moment interrupted"
              : "Το moment διακόπηκε"
            : null;

  const voiceStatusInlineToneClass =
    voiceState === "connected"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      : voiceState === "connecting" || voiceState === "requesting-microphone"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-50"
        : voiceState === "reconnecting"
          ? "border-sky-300/20 bg-sky-300/10 text-sky-50"
          : voiceState === "failed" || voiceState === "error"
            ? "border-rose-300/20 bg-rose-300/10 text-rose-50"
            : "border-white/10 bg-white/5 text-white/55";

  const timerUrgent = secondsRemaining <= 60;

  const timerToneClass =
    phase === "TEXT_PHASE"
      ? "text-white"
      : phase === "AUDIO_PHASE"
        ? "text-emerald-100"
        : timerUrgent
          ? "text-amber-100"
          : "text-amber-50";

  const composerShellClass =
    phase === "TEXT_PHASE"
      ? "border-white/10 bg-[#10182b]/92"
      : phase === "AUDIO_PHASE"
        ? "border-emerald-300/12 bg-[#101f1a]/92"
        : "border-violet-300/18 bg-[#151826]/92";

  const latestSystemMessage = [...room.messages].reverse().find((message) => message.type === "system")?.content;

  const visibleMessages = room.messages.filter((message) => {
    if (message.type === "system") {
      return true;
    }

    const expiresAt = message.expiresAt ? new Date(message.expiresAt).getTime() : new Date(message.createdAt).getTime() + 15_000;
    return expiresAt > now;
  });
  const roomDisplayName = getRoomDisplayName(room.id);

  const reportReasonOptions = [
    { value: "harassment", label: language === "en" ? "Harassment or abuse" : "Παρενόχληση ή κακοποίηση" },
    { value: "threats", label: language === "en" ? "Threats or hate speech" : "Απειλές ή λόγος μίσους" },
    { value: "spam", label: language === "en" ? "Spam or unwanted content" : "Spam ή ανεπιθύμητο περιεχόμενο" },
  ];

  const submitRoomReport = async () => {
    const shortDetails = reportDetails.trim();
    const selectedLabel = reportReasonOptions.find((option) => option.value === reportReason)?.label ?? reportReason;
    const reason = shortDetails ? `${selectedLabel}: ${shortDetails}` : selectedLabel;

    setReportSubmitting(true);
    try {
      await reportCurrentRoom(reason);
      setReportDialogOpen(false);
      setReportReason("harassment");
      setReportDetails("");
    } finally {
      setReportSubmitting(false);
    }
  };

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
    isNearBottomRef.current = distanceFromBottom < 120;
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key.length !== 1 && event.key !== "Backspace" && event.key !== "Delete") {
      return;
    }

    console.info("[typing] key pressed", { key: event.key });

    if (event.key !== "Backspace" && event.key !== "Delete") {
      startTypingIndicator();
      queueTypingStop();
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);

    if (!value.trim()) {
      stopTypingIndicator();
      return;
    }

    startTypingIndicator();
    queueTypingStop();
  };

  if (isEnded) {

    return (
      <PageShell className="flex items-stretch">
        <div className="flex h-full min-h-0 w-full items-start py-4 sm:items-center">
          <Surface className="mx-auto w-full max-w-2xl overflow-hidden border-0 bg-[#0a0f1a] p-0 shadow-2xl shadow-black/30 max-h-[calc(100dvh-2rem)]">
            <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

              <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-3 text-center sm:p-5">
                  <p className="text-[9px] uppercase tracking-[0.32em] text-white/40">
                    {language === "en" ? "After the moment" : "Μετά το moment"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-2xl">{copy.session.howWasIt}</h2>
                  <p className="mt-1 text-xs leading-5 text-white/55 sm:text-sm">
                    {language === "en"
                      ? "Choose a quick reaction, then decide what feels right next."
                      : "Διάλεξε μια γρήγορη αντίδραση και μετά αποφάσισε τι σου ταιριάζει."}
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-2 sm:mt-4 sm:gap-3">
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
                          size="icon"
                          aria-label={option.label}
                          title={option.label}
                          className={cn(
                            "h-11 w-11 rounded-full border-white/10 bg-white/5 text-lg text-white transition-transform duration-150 active:scale-95 hover:bg-white/10 hover:text-white sm:h-12 sm:w-12",
                            isSelected && "border-violet-300/30 bg-violet-500/15 text-violet-50",
                          )}
                          onClick={() => rateRoom(option.score)}
                        >
                          {option.icon}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-violet-300/15 bg-violet-500/10 p-3 sm:p-4">
                  <p className="text-center text-[9px] uppercase tracking-[0.28em] text-violet-100/60">
                    {language === "en" ? "Next" : "Επόμενο"}
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="h-11 flex-1 rounded-full bg-violet-500 px-4 text-sm font-medium text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
                      onClick={async () => {
                        await startNewSessionFromEndedRoom();
                        navigate("/queue");
                      }}
                    >
                      {language === "en" ? "New session" : "Νέα συνεδρία"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1 rounded-full border-white/10 bg-white/5 text-sm text-white transition-transform duration-150 active:scale-95 hover:bg-white/10 hover:text-white"
                      asChild
                    >
                      <Link to="/">
                        <Home className="mr-2 h-4 w-4" />
                        {language === "en" ? "Home" : "Αρχική"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </Surface>

        </div>
      </PageShell>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#08101b] text-white">
      <div className="flex h-full min-h-0 flex-col">
        <header className="sticky top-0 z-30 flex-none border-b border-white/5 bg-[#0f1627]/92 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl sm:px-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/35">Echoo</p>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="truncate text-sm font-medium text-white/70 sm:text-base">{roomDisplayName}</h1>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                      aria-label={language === "en" ? "Why report this connection?" : "Γιατί να αναφέρεις αυτή τη σύνδεση;"}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-white/10 bg-[#11192b] text-white sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-left text-white">
                        {language === "en" ? "Why report this connection?" : "Γιατί να αναφέρεις αυτή τη σύνδεση;"}
                      </DialogTitle>
                      <DialogDescription className="text-left text-white/60">
                        {language === "en"
                          ? "Use reporting when someone is harassing, threatening, spamming, or breaking the room rules. Reports help us review behavior and keep Echoo safer."
                          : "Χρησιμοποίησε την αναφορά όταν κάποιος παρενοχλεί, απειλεί, σπαμάρει ή παραβιάζει τους κανόνες του room. Οι αναφορές βοηθούν να ελέγχουμε τη συμπεριφορά και να κρατάμε το Echoo πιο ασφαλές."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>

                </Dialog>
              </div>
              {voiceStatusInlineLabel && (
                <div className="mt-2 flex items-center gap-2 text-[11px] leading-none text-white/40">
                  <span className={cn("h-2.5 w-2.5 rounded-full", voiceState === "connected" ? "bg-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" : voiceState === "reconnecting" ? "bg-sky-300 shadow-[0_0_0_4px_rgba(56,189,248,0.12)]" : voiceState === "failed" || voiceState === "error" ? "bg-rose-300 shadow-[0_0_0_4px_rgba(251,113,133,0.12)]" : "bg-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]")} />
                  <span className={cn("rounded-full border px-2.5 py-1 font-medium tracking-[0.18em] uppercase", voiceStatusInlineToneClass)}>{voiceStatusInlineLabel}</span>
                  {voicePlaybackBlocked && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 rounded-full border-emerald-300/20 bg-emerald-300/10 px-2.5 text-[11px] text-emerald-50 hover:bg-emerald-300/15 hover:text-white"
                      onClick={async () => {
                        await enableVoicePlayback();
                      }}
                    >
                      {language === "en" ? "Turn audio on" : "Άνοιξε τον ήχο"}

                    </Button>

                  )}
                  {(voiceState === "idle" || voiceState === "failed" || voiceState === "error") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 rounded-full border-violet-300/20 bg-violet-300/10 px-2.5 text-[11px] text-violet-50 hover:bg-violet-300/15 hover:text-white"
                      onClick={async () => {
                        await startVoiceChat();
                      }}
                    >
                      {language === "en" ? "Try voice again" : "Δοκίμασε ξανά τη φωνή"}

                    </Button>

                  )}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-8 rounded-full border-white/10 bg-white/5 px-2.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setReportDialogOpen(true)}
              >
                <Flag className="mr-1.5 h-3.5 w-3.5" />
                {copy.session.report}
              </Button>

            </div>

            <div className="text-center">

              <SessionProgressHeader
                phase={phase}
                timerLabel={timerLabel}
                timerProgress={timerProgress}
                toneClassName={timerToneClass}
              />
            </div>

            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 rounded-full border-rose-400/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20 hover:text-white"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    {copy.session.leave}
                  </Button>

                </AlertDialogTrigger>
                <AlertDialogContent className="border-rose-400/20 bg-[#0f1424] text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{language === "en" ? "Leave this moment?" : "Να φύγεις από αυτό το moment;"}</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/55">
                      {language === "en"
                        ? "The connection will end for both people."
                        : "Η σύνδεση θα τερματιστεί και για τους δύο ανθρώπους."}
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
                      {language === "en" ? "Leave moment" : "Έξοδος"}

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
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-4 py-4 [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] sm:px-6"

        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-10 sm:pb-12">

            {visibleMessages.map((message) => {

              const isSelf = message.senderId === profile.id;
              const isSystem = message.type === "system";
              const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const arrivedHot = message.id === recentMessageId;

              if (isSystem) {
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "mx-auto max-w-[min(92%,34rem)] rounded-full border border-white/8 bg-white/5 px-4 py-2 text-center text-xs leading-5 text-white/45 shadow-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                      arrivedHot && "animate-[echo-message-in_220ms_ease-out]",
                    )}

                  >
                    {message.content}
                  </div>
                );
              }

              if (message.type === "media") {
                return (
                  <div key={message.id} className={cn("flex min-w-0", isSelf ? "justify-end" : "justify-start")}>
                    <div className={cn("min-w-0 max-w-[min(88%,42rem)] space-y-1", isSelf ? "items-end text-right" : "items-start text-left")}>
                      <div className="flex items-center gap-2 px-1 text-xs text-white/35">
                        <span className="font-medium uppercase tracking-[0.22em] text-white/45">{isSelf ? copy.session.you : copy.session.partner}</span>

                        <span>•</span>
                        <span>{timestamp}</span>
                      </div>
                      <SessionMediaMessage message={message} isSelf={isSelf} />

                    </div>
                  </div>
                );
              }

              return (
                <div key={message.id} className={cn("flex min-w-0", isSelf ? "justify-end" : "justify-start") }>
                  <div className={cn("min-w-0 max-w-[min(88%,42rem)] space-y-1", isSelf ? "items-end text-right" : "items-start text-left")}>
                    <div className="flex items-center gap-2 px-1 text-xs text-white/35">
                      <span className="font-medium uppercase tracking-[0.22em] text-white/45">{isSelf ? copy.session.you : copy.session.partner}</span>

                      <span>•</span>
                      <span>{timestamp}</span>
                    </div>
                    <div
                      className={cn(
                        "min-w-0 rounded-[18px] px-4 py-3 text-[15px] leading-6 shadow-sm transition-all duration-200 whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                        isSelf ? "bg-white text-slate-950" : "bg-white/7 text-white ring-1 ring-white/5",
                        arrivedHot && "ring-1 ring-white/10 animate-[echo-message-in_220ms_ease-out]",
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

        <footer className="sticky bottom-0 z-30 flex-none border-t border-white/5 bg-[#0b1220]/94 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-3 backdrop-blur-xl sm:px-6 sm:pt-4">
          <div className={cn("mx-auto w-full max-w-3xl rounded-[28px] border px-3 py-3 shadow-[0_-18px_45px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:px-4", composerShellClass)}>

            {isActive ? (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const nextDraft = draft.trim();
                  if (!nextDraft) {
                    return;
                  }

                  shouldForceScrollRef.current = isNearBottomRef.current;
                  stopTypingIndicator();
                  await sendMessage(nextDraft);
                  setDraft("");
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-end gap-2 sm:gap-3">
                    {phase !== "TEXT_PHASE" && (
                      <div className="relative shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn(
                            "h-12 w-12 rounded-full border-white/10 bg-white/5 text-white/70 shadow-sm shadow-black/15 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-300/40 active:scale-95",
                            attachmentMenuOpen && "border-violet-300/25 bg-violet-500/15 text-violet-50",
                          )}
                          onClick={() => setAttachmentMenuOpen((current) => !current)}
                          aria-label={language === "en" ? "Attach media" : "Επισύναψη media"}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>

                        {attachmentMenuOpen && (
                          <div className="absolute bottom-full left-0 z-20 mb-2 w-44 overflow-hidden rounded-[22px] border border-white/10 bg-[#11192b] p-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                              onClick={() => {
                                setAttachmentMenuOpen(false);
                                imageInputRef.current?.click();
                              }}
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-100">
                                <ImagePlus className="h-4 w-4" />
                              </span>
                              <span>{language === "en" ? "Photo" : "Φωτο"}</span>
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                              onClick={() => {
                                setAttachmentMenuOpen(false);
                                videoInputRef.current?.click();
                              }}
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-100">
                                <Film className="h-4 w-4" />
                              </span>
                              <span>{language === "en" ? "Video" : "Βίντεο"}</span>
                            </button>
                          </div>
                        )}

                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) {
                              await handleMediaFileSelected(file);
                            }
                          }}
                        />
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) {
                              await handleMediaFileSelected(file);
                            }
                          }}
                        />
                      </div>
                    )}

                    <Input
                      value={draft}
                      onKeyDown={handleDraftKeyDown}
                      onChange={(event) => handleDraftChange(event.target.value)}
                      onBlur={stopTypingIndicator}
                      placeholder={language === "en" ? "Say something simple..." : "Πες κάτι απλό..."}

                      className="h-14 min-w-0 flex-1 rounded-full border-0 bg-white/6 px-5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-violet-400/50"
                    />

                    <Button type="submit" className="h-14 shrink-0 rounded-full bg-violet-500 px-5 text-white shadow-md shadow-violet-500/20 transition-transform duration-150 hover:bg-violet-400 active:scale-95">
                      <span className="hidden sm:inline">{copy.session.send}</span>
                      <Send className="h-4 w-4 sm:ml-2" />
                    </Button>
                  </div>

                  {phase !== "TEXT_PHASE" && selectedMedia && (
                    <div className="space-y-3 rounded-[26px] border border-white/10 bg-[#0d1425] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative min-h-[96px] w-24 overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:w-28">
                          {selectedMedia.kind === "image" ? (
                            <img src={selectedMedia.previewUrl} alt={selectedMedia.displayName} className="h-full w-full object-cover" />
                          ) : (
                            <video src={selectedMedia.previewUrl} controls playsInline controlsList="nodownload noplaybackrate" className="h-full w-full object-cover" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{selectedMedia.displayName}</p>
                              <p className="text-xs text-white/45">
                                {selectedMedia.kind === "image"
                                  ? `${formatBytes(selectedMedia.size)} · ${selectedMedia.width ?? 0}×${selectedMedia.height ?? 0}`
                                  : `${formatBytes(selectedMedia.size)} · ${selectedMedia.durationSeconds ?? 0}s`}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                              onClick={resetMediaSelection}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={mediaCaption}
                            onChange={(event) => setMediaCaption(event.target.value)}
                            placeholder={language === "en" ? "Add a quiet caption (optional)" : "Πρόσθεσε μια μικρή λεζάντα (προαιρετικό)"}

                            className="h-11 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/35"
                            maxLength={180}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="button"
                          className="h-11 rounded-full bg-violet-500 px-5 text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
                          disabled={mediaBusy}
                          onClick={() => {
                            void sendSelectedMedia();
                          }}
                        >
                          {mediaBusy ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 animate-pulse rounded-full bg-white/80" />
                              {language === "en" ? "Sending..." : "Αποστολή..."}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              {language === "en" ? "Share moment" : "Μοιράσου το moment"}

                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "pt-1 transition-all duration-200",
                      phase === "TEXT_PHASE" && "pointer-events-none h-0 overflow-hidden pt-0 opacity-0",
                    )}
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      <div className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", voiceDiagnostics?.localTrackReadyState === "live" ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-50" : "border-white/10 bg-white/5 text-white/60")}>MIC LIVE</div>
                      <div className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", voiceDiagnostics?.transmitting ? "border-sky-300/30 bg-sky-500/15 text-sky-50" : "border-white/10 bg-white/5 text-white/60")}>{language === "en" ? "YOU’RE SPEAKING" : "ΜΙΛΑΣ"}</div>
                      <div className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", (voiceDiagnostics?.bytesSent ?? 0) > 0 ? "border-violet-300/30 bg-violet-500/15 text-violet-50" : "border-white/10 bg-white/5 text-white/60")}>{language === "en" ? "AUDIO BYTES SENT: " : "ΗΧΟΙ ΠΟΥ ΣΤΑΛΘΗΚΑΝ: "}{voiceDiagnostics?.bytesSent ?? 0}</div>
                      <div className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", voiceDiagnostics?.remoteAudioDetected ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-50" : "border-white/10 bg-white/5 text-white/60")}>{language === "en" ? "VOICE REACHING" : "Η ΦΩΝΗ ΦΤΑΝΕΙ"}</div>

                    </div>

                    <Button
                      type="button"
                      disabled={phase === "TEXT_PHASE"}
                      className={cn(
                        "group flex h-16 w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-[#10182b] px-5 text-white shadow-[0_16px_35px_rgba(0,0,0,0.22)] transition-all duration-200 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-violet-300/40 active:scale-[0.99]",
                        voiceDiagnostics?.transmitting && "border-emerald-300/30 bg-emerald-500/15 text-emerald-50 shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_0_28px_rgba(52,211,153,0.18)]",

                        !voiceReady && "cursor-not-allowed opacity-60",
                        "touch-none select-none [user-select:none] [-webkit-user-select:none] [touch-action:none]",
                      )}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        console.info("[ptt] pointerdown event", {
                          roomId: room?.id ?? null,
                          phase,
                          pointerId: event.pointerId,
                          button: event.button,
                          pointerType: event.pointerType,
                        });
                        try {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          console.info("[ptt] pointer capture set", {
                            roomId: room?.id ?? null,
                            phase,
                            pointerId: event.pointerId,
                          });
                        } catch (error) {
                          console.info("[ptt] pointer capture failed", {
                            roomId: room?.id ?? null,
                            phase,
                            pointerId: event.pointerId,
                            error: error instanceof Error ? error.message : String(error),
                          });
                        }
                        handlePushToTalkPress(event.pointerId);
                      }}
                      onPointerUp={(event) => {
                        console.info("[ptt] pointerup event", {
                          roomId: room?.id ?? null,
                          phase,
                          pointerId: event.pointerId,
                        });
                        try {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                          console.info("[ptt] pointer capture released", {
                            roomId: room?.id ?? null,
                            phase,
                            pointerId: event.pointerId,
                          });
                        } catch {
                          /* noop */
                        }
                        releasePushToTalk(event.pointerId);
                      }}
                      onPointerCancel={(event) => {
                        console.info("[ptt] pointercancel event", {
                          roomId: room?.id ?? null,
                          phase,
                          pointerId: event.pointerId,
                        });
                        releasePushToTalk(event.pointerId);
                      }}
                      onPointerLeave={(event) => {
                        const hasCapture = event.currentTarget.hasPointerCapture(event.pointerId);
                        console.info("[ptt] pointerleave event", {
                          roomId: room?.id ?? null,
                          phase,
                          pointerId: event.pointerId,
                          hasCapture,
                        });
                        if (!hasCapture) {
                          releasePushToTalk(event.pointerId);
                        }
                      }}
                      onContextMenu={(event) => event.preventDefault()}
                      aria-label={copy.session.startVoice}

                    >

                      <Mic className={cn("h-5 w-5 transition-transform duration-150", voiceDiagnostics?.transmitting && "scale-110 animate-pulse")} />
                      <span className="text-sm font-semibold tracking-wide sm:text-base">
                        {voiceDiagnostics?.transmitting ? copy.session.pttActive : copy.session.pttIdle}
                      </span>

                    </Button>

                    <div className="grid gap-2 rounded-[22px] border border-white/10 bg-black/20 p-3 text-[11px] leading-5 text-white/65 sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-3 rounded-full border border-white/8 bg-white/5 px-3 py-2">
                        <span className="uppercase tracking-[0.2em] text-white/40">mic track.enabled</span>
                        <span className={voiceDiagnostics?.localTrackEnabled ? "text-emerald-100" : "text-white/45"}>
                          {voiceDiagnostics ? String(voiceDiagnostics.localTrackEnabled) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-full border border-white/8 bg-white/5 px-3 py-2">
                        <span className="uppercase tracking-[0.2em] text-white/40">sender exists</span>
                        <span className={voiceDiagnostics && voiceDiagnostics.senderTrackEnabled !== null ? "text-emerald-100" : "text-white/45"}>
                          {voiceDiagnostics ? String(voiceDiagnostics.senderTrackEnabled !== null) : "—"}
                        </span>

                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-full border border-white/8 bg-white/5 px-3 py-2">
                        <span className="uppercase tracking-[0.2em] text-white/40">transmitting</span>
                        <span className={voiceDiagnostics?.transmitting ? "text-emerald-100" : "text-white/45"}>
                          {voiceDiagnostics ? String(voiceDiagnostics.transmitting) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-full border border-white/8 bg-white/5 px-3 py-2">
                        <span className="uppercase tracking-[0.2em] text-white/40">is pressing</span>
                        <span className={voiceDiagnostics?.isPressing ? "text-emerald-100" : "text-white/45"}>
                          {voiceDiagnostics ? String(voiceDiagnostics.isPressing) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {typingIndicator && (

                    <div className="mt-1 inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-2 text-sm text-violet-50/90 transition-all duration-200 animate-[echo-message-in_180ms_ease-out]">
                      <span className="truncate">{language === "en" ? "The other side is typing…" : "Η άλλη πλευρά γράφει…"}</span>

                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-100/80 animate-[echo-typing-dots_1s_ease-in-out_infinite] [animation-delay:-0.18s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-100/80 animate-[echo-typing-dots_1s_ease-in-out_infinite] [animation-delay:-0.08s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-100/80 animate-[echo-typing-dots_1s_ease-in-out_infinite]" />
                      </span>
                    </div>
                  )}

                </div>
              </form>

            ) : (
              <div className="rounded-[26px] border border-violet-300/15 bg-violet-500/10 p-4 text-center sm:p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-violet-100/60">
                  {language === "en" ? "What next?" : "Τι θέλεις μετά;"}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {language === "en" ? "Start new session or go home" : "Νέα συνεδρία ή αρχική;"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{copy.session.howWasIt}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="h-12 flex-1 rounded-full bg-violet-500 text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
                    onClick={async () => {
                      await startNewSessionFromEndedRoom();
                      navigate("/queue");
                    }}
                  >
                    {language === "en" ? "Start new session" : "Νέα συνεδρία"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 flex-1 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link to="/">
                      <Home className="mr-2 h-4 w-4" />
                      {language === "en" ? "Home" : "Αρχική"}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </footer>

      </div>


      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="border-rose-400/20 bg-[#11192b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-white">
              {language === "en" ? "Report this connection" : "Αναφορά σύνδεσης"}
            </DialogTitle>
            <DialogDescription className="text-left text-white/60">
              {language === "en"
                ? "Choose the reason that fits best. Your report helps us keep Echoo calm and safe."
                : "Επίλεξε τον λόγο που ταιριάζει καλύτερα. Η αναφορά μάς βοηθά να κρατάμε το Echoo ήρεμο και ασφαλές."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="grid gap-2 sm:grid-cols-3">
              {reportReasonOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-auto rounded-2xl border-white/10 px-3 py-3 text-left text-xs leading-5 text-white/75 hover:bg-white/10 hover:text-white",
                    reportReason === option.value && "border-rose-300/30 bg-rose-500/15 text-rose-50",
                  )}
                  onClick={() => setReportReason(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <Textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              placeholder={language === "en" ? "Add a short note (optional)" : "Πρόσθεσε μια σύντομη σημείωση (προαιρετικό)"}
              className="min-h-28 rounded-3xl border-white/10 bg-white/5 text-white placeholder:text-white/35"
              maxLength={240}
            />
          </div>

          <DialogFooter className="mt-2 flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setReportDialogOpen(false)}
            >
              {language === "en" ? "Cancel" : "Ακύρωση"}
            </Button>
            <Button
              type="button"
              className="h-12 rounded-full bg-rose-500 text-white hover:bg-rose-400"
              onClick={() => {
                void submitRoomReport();
              }}
              disabled={reportSubmitting}
            >
              {reportSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-white/80" />
                  {language === "en" ? "Sending..." : "Αποστολή..."}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  {language === "en" ? "Send report" : "Αποστολή αναφοράς"}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SessionPage;
