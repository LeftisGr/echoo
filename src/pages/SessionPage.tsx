import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { ArrowRight, Check, Flag, Home, ImagePlus, Mic, Paperclip, PhoneOff, ShieldAlert, Send, Video, X } from "lucide-react";

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

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { PageShell, Surface } from "@/components/presence/presence-shell";
import { CalmStateCard } from "@/components/presence/calm-state-card";
import { SessionMediaMessage } from "@/components/session/session-media-message";
import { UnlockProgress } from "@/components/session/unlock-progress";

import { SessionTypingIndicator } from "@/components/session/session-typing-indicator";
import { SupportCard } from "@/components/support/support-card";
import { usePresence } from "@/components/presence/presence-provider";

import { supabase } from "@/integrations/supabase/client";

import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_MEDIA_MESSAGES_PER_SESSION,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  MEDIA_UPLOAD_COOLDOWN_MS,
  type MediaPreviewData,
  prepareMediaUpload,
} from "@/lib/session-media";

import { canUseFeature, FeatureGateKey, useFeatureGates } from "@/lib/feature-gates";
import { playSoundFeedback } from "@/lib/sound-feedback";

import { cn } from "@/lib/utils";
import { logAnalyticsEvent, logErrorEvent } from "@/lib/operational-logs";
import {
  deleteRoomPresenceSignal,
  getApproxDistance,
  getPresenceLabel,

  loadRoomPresenceSignals,
  roundPresenceCoordinate,
  upsertRoomPresenceSignal,
} from "@/lib/room-presence";

import { getSessionPhaseCopy, SESSION_AUDIO_PHASE_SECONDS, SESSION_TEXT_PHASE_SECONDS, useSessionProgression } from "@/lib/session-progression";

function getRoomDisplayName(roomId: string) {
  const suffix = roomId
    .replace(/-/g, "")
    .slice(0, 8)
    .split("")
    .reduce((value, char) => value + char.charCodeAt(0), 0);

  return `Room #${String(100 + (suffix % 900)).padStart(3, "0")}`;

}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MESSAGE_GROUPING_WINDOW_MS = 3 * 60 * 1000;

function requestApproximatePosition() {

  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: roundPresenceCoordinate(position.coords.latitude),
          longitude: roundPresenceCoordinate(position.coords.longitude),
        });
      },
      reject,
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
}

const reactionOptions = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const;

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
    roomFlowError,

    profile,

    copy,
    language,
    matchSoundEnabled,
    online,
    unlockVoice,
    sendMessage,
    sendMediaMessage,
    appendSystemMessage,
    leaveRoom,
    rateRoom,
    reportCurrentRoom,
    blockCurrentPartner,
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
  const [messageSending, setMessageSending] = useState(false);
  const [messageSendError, setMessageSendError] = useState<string | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);

  const [selectedMedia, setSelectedMedia] = useState<MediaPreviewData | null>(null);

  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const voiceAutoStartRoomIdRef = useRef<string | null>(null);
  const [reportReason, setReportReason] = useState("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [recentMessageId, setRecentMessageId] = useState<string | null>(null);
  const [progressionMoment, setProgressionMoment] = useState<string | null>(null);
  const [presenceDistanceKm, setPresenceDistanceKm] = useState<number | null>(null);
  const [presenceBadgeReady, setPresenceBadgeReady] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});

  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);

  const presenceRefreshRunIdRef = useRef(0);
  const pttPointerIdRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);
  const pttReleaseTimeoutRef = useRef<number | null>(null);
  const pttLatchTimeoutRef = useRef<number | null>(null);
  const pttLatchedRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [pttLatched, setPttLatched] = useState(false);

  const mediaCooldownRef = useRef(0);
  const mediaSendCountRef = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const shouldForceScrollRef = useRef(true);

  const isNearBottomRef = useRef(true);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const lastVoiceUnlockAtRef = useRef<string | null>(null);
  const mediaUnlockMessageRoomIdRef = useRef<string | null>(null);
  const lastProgressionPhaseRef = useRef<string | null>(null);
  const progressionMomentTimeoutRef = useRef<number | null>(null);
  const reactionHoldTimeoutRef = useRef<number | null>(null);
  const reactionHoldMessageIdRef = useRef<string | null>(null);
  const sessionProgression = useSessionProgression(room?.startedAt);
  const phase = sessionProgression.phase;
  const featureGates = useFeatureGates(room?.startedAt, room?.status);

  const logMediaFailure = useCallback(
    (reason: string, message: string) => {
      const currentUserId = profile?.id ?? null;
      void logAnalyticsEvent("upload_failed", {
        userId: currentUserId,
        roomId: room?.id ?? null,
        properties: {
          phase,
          reason,
        },
      });
      void logErrorEvent("upload_failed", {
        userId: currentUserId,
        roomId: room?.id ?? null,
        severity: "warn",
        errorMessage: message,
        properties: {
          phase,
          reason,
        },
      });
    },
    [phase, profile?.id, room?.id],
  );

  useEffect(() => {
    if (progressionMomentTimeoutRef.current !== null) {
      window.clearTimeout(progressionMomentTimeoutRef.current);
      progressionMomentTimeoutRef.current = null;
    }

    if (!room?.id) {
      lastProgressionPhaseRef.current = null;
      setProgressionMoment(null);
      return;
    }

    const phaseKey = `${room.id}:${phase}:${language}`;
    const nextMoment = getSessionPhaseCopy(phase, language).moment;

    if (lastProgressionPhaseRef.current === phaseKey) {
      return;
    }

    lastProgressionPhaseRef.current = phaseKey;
    setProgressionMoment(nextMoment);

    progressionMomentTimeoutRef.current = window.setTimeout(() => {
      setProgressionMoment(null);
    }, 2800);

    return () => {
      if (progressionMomentTimeoutRef.current !== null) {
        window.clearTimeout(progressionMomentTimeoutRef.current);
        progressionMomentTimeoutRef.current = null;
      }
    };
  }, [language, phase, room?.id]);

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
    if (!room || !profile) {
      return;
    }

    return () => {
      void deleteRoomPresenceSignal(room.id, profile.id).catch(() => undefined);
    };
  }, [profile?.id, room?.id]);

  useEffect(() => {
    if (!room || !profile || room.status === "active") {
      return;
    }

    void deleteRoomPresenceSignal(room.id, profile.id).catch(() => undefined);
  }, [profile?.id, room?.id, room?.status]);

  useEffect(() => {
    if (!room || !profile || room.status !== "active") {
      setPresenceDistanceKm(null);
      setPresenceBadgeReady(false);
      return;
    }

    let cancelled = false;
    const runId = ++presenceRefreshRunIdRef.current;

    setPresenceDistanceKm(null);
    setPresenceBadgeReady(false);

    const clearPresenceBadge = () => {
      if (cancelled || runId !== presenceRefreshRunIdRef.current) {
        return;
      }

      setPresenceDistanceKm(null);
      setPresenceBadgeReady(false);
    };

    const refreshPresence = async () => {

      if (cancelled || runId !== presenceRefreshRunIdRef.current) {
        return;
      }

      if (!navigator.geolocation) {
        clearPresenceBadge();
        return;
      }

      try {
        if (navigator.permissions) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });
            if (cancelled || runId !== presenceRefreshRunIdRef.current) {
              return;
            }

            if (permissionStatus.state === "denied") {
              clearPresenceBadge();
              return;
            }
          } catch {
            // If permission state can't be queried, still ask the browser normally.
          }
        }

        const position = await requestApproximatePosition();

        if (cancelled || runId !== presenceRefreshRunIdRef.current) {
          return;
        }

        await upsertRoomPresenceSignal(room.id, profile.id, {
          latitude: position.latitude,
          longitude: position.longitude,
          updatedAt: new Date().toISOString(),
        });

        if (cancelled || runId !== presenceRefreshRunIdRef.current) {
          return;
        }

        const signals = await loadRoomPresenceSignals(room.id);
        if (cancelled || runId !== presenceRefreshRunIdRef.current) {
          return;
        }

        const signalMap = new Map(signals.map((signal) => [signal.user_id, signal]));
        const userASignal = signalMap.get(room.userA);
        const userBSignal = signalMap.get(room.userB);

        if (!userASignal || !userBSignal) {
          clearPresenceBadge();
          return;
        }

        const distanceKm = getApproxDistance(
          {
            latitude: userASignal.coarse_latitude,
            longitude: userASignal.coarse_longitude,
          },
          {
            latitude: userBSignal.coarse_latitude,
            longitude: userBSignal.coarse_longitude,
          },
        );

        if (cancelled || runId !== presenceRefreshRunIdRef.current) {
          return;
        }

        setPresenceDistanceKm(distanceKm);

        setPresenceBadgeReady(true);
      } catch (error) {
        const maybeError = error as GeolocationPositionError | Error | null;
        if (maybeError && "code" in maybeError && maybeError.code === 1) {
          clearPresenceBadge();
          return;
        }

        clearPresenceBadge();
      }
    };

    const roomPresenceChannel = supabase
      .channel(`session-presence-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_presence_signals", filter: `room_id=eq.${room.id}` }, (payload) => {
        const signalUserId = (payload.new as { user_id?: string } | null | undefined)?.user_id ?? null;
        if (signalUserId === profile.id) {
          return;
        }

        void refreshPresence();

      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, () => {
        void refreshPresence();
      })
      .subscribe((status) => {

        if (status !== "SUBSCRIBED") {
          clearPresenceBadge();
          return;
        }

        void refreshPresence();

      });

    let permissionStatus: PermissionStatus | null = null;
    const bindPermissionChange = async () => {
      if (!navigator.permissions) {
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        permissionStatus.onchange = () => {
          void refreshPresence();
        };

      } catch {
        permissionStatus = null;
      }
    };

    void refreshPresence();

    void bindPermissionChange();

    return () => {
      cancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
      void supabase.removeChannel(roomPresenceChannel);
    };
  }, [online, profile?.id, room?.id, room?.rtcConnectionId, room?.rtcState, room?.status]);

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
      setActiveReactionMessageId(null);
      if (reactionHoldTimeoutRef.current !== null) {
        window.clearTimeout(reactionHoldTimeoutRef.current);
        reactionHoldTimeoutRef.current = null;
      }
      reactionHoldMessageIdRef.current = null;
      mediaCooldownRef.current = 0;
      mediaSendCountRef.current = 0;
    }

    shouldForceScrollRef.current = true;
    isNearBottomRef.current = true;
  }, [room?.id, routeRoomId]);

  useEffect(() => {
    setMessageReactions({});
  }, [room?.id]);

  useEffect(() => {
    if (!room) {
      return;
    }
  }, [room?.id, room?.status, room?.partner, routeRoomId]);

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

  useEffect(() => {

    if (!room || !featureGates[FeatureGateKey.PttVoice].unlocked || room.voiceUnlockedAt) {
      return;
    }

    unlockVoice();
  }, [featureGates, room, unlockVoice]);

  useEffect(() => {
    if (!room?.voiceUnlockedAt || room.voiceUnlockedAt === lastVoiceUnlockAtRef.current) {
      return;
    }

    lastVoiceUnlockAtRef.current = room.voiceUnlockedAt;
    appendSystemMessage(copy.session.voiceUnlocked);
    setProgressionMoment(language === "en" ? "The room opens for your voice." : "Το room ανοίγει για τη φωνή σου.");

    if (voiceAutoStartRoomIdRef.current === room.id) {
      return;
    }

    voiceAutoStartRoomIdRef.current = room.id;
    void startVoiceChat().catch(() => undefined);
  }, [appendSystemMessage, copy.session.voiceUnlocked, language, room?.id, room?.voiceUnlockedAt, startVoiceChat]);

  useEffect(() => {
    if (!room || !featureGates[FeatureGateKey.EphemeralContent].unlocked) {
      return;
    }

    if (mediaUnlockMessageRoomIdRef.current === room.id) {
      return;
    }

    const hasUnlockMessage = room.messages.some((message) => message.type === "system" && message.content === copy.session.mediaUnlocked);
    mediaUnlockMessageRoomIdRef.current = room.id;

    if (hasUnlockMessage) {
      return;
    }

    appendSystemMessage(copy.session.mediaUnlocked);
    setProgressionMoment(language === "en" ? "A little more of the room is visible now." : "Λίγο περισσότερο room είναι τώρα ορατό.");
    playSoundFeedback("content-reveal", matchSoundEnabled);
  }, [appendSystemMessage, copy.session.mediaUnlocked, featureGates, language, matchSoundEnabled, room]);
  useEffect(() => {
    if (featureGates[FeatureGateKey.EphemeralContent].unlocked) {
      return;
    }

    setAttachmentMenuOpen(false);
    setSelectedMedia(null);
    setMediaCaption("");
    setMediaError(null);
    setMediaBusy(false);
  }, [featureGates]);

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

  const canShareImages = canUseFeature(featureGates, FeatureGateKey.ImageSending);
  const canShareMedia = canShareImages || canUseFeature(featureGates, FeatureGateKey.AudioContentSending);
  const canUseVoice = canUseFeature(featureGates, FeatureGateKey.PttVoice);

  const voiceReady =
    room?.voiceEnabled &&
    canUseVoice &&
    voiceState === "connected";

  const reconnectingAudio = room?.status === "active" && (room.rtcState === "reconnecting" || voiceState === "reconnecting");

  const pttButtonLabel = reconnectingAudio
    ? language === "en"
      ? "Reconnecting audio…"
      : "Επανασύνδεση ήχου…"
    : pttLatched
      ? language === "en"
        ? "Mic on"
        : "Μικρόφωνο ανοιχτό"
      : voiceDiagnostics?.transmitting
        ? copy.session.pttActive
        : copy.session.pttIdle;

  const clearTypingTimers = useCallback(() => {
    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
  }, []);

  const stopTyping = useCallback(
    (reason: string) => {
      clearTypingTimers();

      if (!typingActiveRef.current) {
        return;
      }

      typingActiveRef.current = false;
      sendTypingState(false, new Date().toISOString());

    },
    [clearTypingTimers, room?.id, sendTypingState],
  );

  const startTyping = useCallback(() => {
    if (typingActiveRef.current) {
      return;
    }

    typingActiveRef.current = true;
    sendTypingState(true, new Date().toISOString());

  }, [room?.id, sendTypingState]);

  const queueTypingStop = useCallback(() => {
    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = window.setTimeout(() => {
      stopTyping("debounce");
    }, 2000);

  }, [stopTyping]);

  useEffect(() => () => stopTyping("unmount"), [stopTyping]);

  useEffect(() => {
    if (!room || room.status !== "active") {
      stopTyping("room-closed");
      return;
    }

    if (voiceState === "failed" || voiceState === "error") {
      stopTyping("reconnect-failed");
      return;
    }

    if (voiceState === "reconnecting" || voiceState === "connecting") {
      stopTyping("reconnect");
      return;
    }

    if (!online) {
      stopTyping("disconnect");
    }
  }, [online, room?.id, room?.status, stopTyping, voiceState]);

  useEffect(() => {
    const handlePageHide = () => {
      if (typingActiveRef.current) {
        void sendTypingState(false, new Date().toISOString());
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [sendTypingState]);

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
      const message = language === "en" ? "Unsupported file type." : "Μη υποστηριζόμενος τύπος αρχείου.";
      setMediaError(message);
      logMediaFailure("unsupported-type", message);
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      const message = language === "en" ? "Unsupported file type." : "Μη υποστηριζόμενος τύπος αρχείου.";
      setMediaError(message);
      logMediaFailure("unsupported-type", message);
      return;
    }

    if (file.type.startsWith("image/") && !canShareImages) {
      const message = language === "en" ? "Photo sharing is not available yet." : "Η αποστολή φωτογραφιών δεν είναι ακόμα διαθέσιμη.";
      setMediaError(message);
      logMediaFailure("feature-locked", message);
      return;
    }

    if (file.type.startsWith("video/") && !canShareMedia) {
      const message = language === "en" ? "Video sharing is not available yet." : "Η αποστολή βίντεο δεν είναι ακόμα διαθέσιμη.";
      setMediaError(message);
      logMediaFailure("feature-locked", message);
      return;
    }

    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE_BYTES) {
      const message = language === "en" ? "Image is too large." : "Η εικόνα είναι πολύ μεγάλη.";
      setMediaError(message);
      logMediaFailure("too-large", message);
      return;
    }

    if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE_BYTES) {

      const message = language === "en" ? "Video is too large." : "Το βίντεο είναι πολύ μεγάλο.";
      setMediaError(message);
      logMediaFailure("too-large", message);
      return;
    }

    try {
      const prepared = await prepareMediaUpload(file);

      if (prepared.kind === "video" && (prepared.durationSeconds ?? 0) > MAX_VIDEO_DURATION_SECONDS) {
        const message = language === "en" ? "Video is longer than the allowed limit." : "Το βίντεο ξεπερνά το επιτρεπτό όριο.";
        setMediaError(message);
        logMediaFailure("too-long", message);
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
      const message = mediaError instanceof Error ? mediaError.message : language === "en" ? "Could not read the file." : "Δεν ήταν δυνατή η ανάγνωση του αρχείου.";
      setMediaError(message);
      logMediaFailure("read-error", message);
    }
  }

  async function sendSelectedMedia() {
    if (!selectedMedia || mediaBusy) {
      return;
    }

    stopTyping("media-send");

    const now = Date.now();
    if (mediaCooldownRef.current && now - mediaCooldownRef.current < MEDIA_UPLOAD_COOLDOWN_MS) {
      const message = language === "en" ? "Please wait a moment before sending another media item." : "Περίμενε λίγο πριν στείλεις άλλο media.";
      setMediaError(message);
      logMediaFailure("cooldown", message);
      return;
    }

    if (mediaSendCountRef.current >= MAX_MEDIA_MESSAGES_PER_SESSION) {
      const message = language === "en" ? "Media sharing limit reached for this room." : "Έφτασες το όριο media για αυτό το room.";
      setMediaError(message);
      logMediaFailure("limit-reached", message);
      return;
    }

    setMediaBusy(true);

    try {
      await sendMediaMessage({
        file: selectedMedia.file,
        caption: mediaCaption.trim(),
        preview: selectedMedia,
      });
      mediaCooldownRef.current = Date.now();
      mediaSendCountRef.current += 1;

      resetMediaSelection();
    } catch (mediaSendError) {
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


  const clearPushToTalkReleaseTimeout = useCallback(() => {
    if (pttReleaseTimeoutRef.current !== null) {
      window.clearTimeout(pttReleaseTimeoutRef.current);
      pttReleaseTimeoutRef.current = null;
    }
  }, []);

  const clearPushToTalkLatchTimeout = useCallback(() => {
    if (pttLatchTimeoutRef.current !== null) {
      window.clearTimeout(pttLatchTimeoutRef.current);
      pttLatchTimeoutRef.current = null;
    }
  }, []);

  const resetPushToTalkLatch = useCallback(() => {
    clearPushToTalkLatchTimeout();
    pttLatchedRef.current = false;
    setPttLatched(false);
  }, [clearPushToTalkLatchTimeout]);

  const releasePushToTalk = useCallback(
    (pointerId?: number, force = false) => {
      if (pointerId !== undefined && pttPointerIdRef.current !== pointerId) {
        return;
      }

      if (!isPressingRef.current && !force) {
        return;
      }

      clearPushToTalkReleaseTimeout();
      isPressingRef.current = false;
      pttPointerIdRef.current = null;

      if (force) {
        resetPushToTalkLatch();
        setVoiceTransmissionEnabled(false);
        return;
      }

      if (pttLatchedRef.current) {
        return;
      }

      setVoiceTransmissionEnabled(false);
      playSoundFeedback("ptt-release", matchSoundEnabled);
    },
    [clearPushToTalkReleaseTimeout, matchSoundEnabled, resetPushToTalkLatch, setVoiceTransmissionEnabled],
  );

  const handlePushToTalkPress = useCallback(
    (pointerId: number) => {
      if (pttLatchedRef.current) {
        releasePushToTalk(undefined, true);
        playSoundFeedback("ptt-release", matchSoundEnabled);
        return;
      }

      if (!voiceReady || voiceState !== "connected" || isPressingRef.current) {
        return;
      }

      clearPushToTalkReleaseTimeout();
      clearPushToTalkLatchTimeout();
      isPressingRef.current = true;
      pttPointerIdRef.current = pointerId;
      setVoiceTransmissionEnabled(true);
      playSoundFeedback("ptt-press", matchSoundEnabled);

      pttLatchTimeoutRef.current = window.setTimeout(() => {
        if (pttPointerIdRef.current !== pointerId || !isPressingRef.current) {
          return;
        }

        clearPushToTalkReleaseTimeout();
        isPressingRef.current = false;
        pttPointerIdRef.current = null;
        pttLatchedRef.current = true;
        setPttLatched(true);
      }, 3000);
    },
    [clearPushToTalkLatchTimeout, clearPushToTalkReleaseTimeout, matchSoundEnabled, releasePushToTalk, setVoiceTransmissionEnabled, voiceReady, voiceState],
  );

  useEffect(() => () => {
    clearPushToTalkReleaseTimeout();
    clearPushToTalkLatchTimeout();
    releasePushToTalk(undefined, true);
    stopTyping("unmount");
  }, [clearPushToTalkLatchTimeout, clearPushToTalkReleaseTimeout, releasePushToTalk, stopTyping]);

  useEffect(() => {
    if (!room || room.status !== "active") {
      if (isPressingRef.current || pttLatchedRef.current) {
        releasePushToTalk(undefined, true);
      }
    }
  }, [releasePushToTalk, room?.id, room?.status]);


  if ((initializing || !appReady || !roomLoaded || (queue.active && !room)) && !roomFlowError) {
    const loadingTitle = queue.active
      ? language === "en"
        ? "Finding your room..."
        : "Βρίσκουμε το room σου..."
      : language === "en"
        ? "Restoring your room..."
        : "Φέρνουμε ξανά το room σου...";

    const loadingBody = queue.active
      ? language === "en"
        ? "We’re gently reconnecting the path between queue and room."
        : "Επανασυνδέουμε απαλά τη διαδρομή ανάμεσα στην ουρά και το room."
      : language === "en"
        ? "Hold for a second while Echoo settles the room."
        : "Περίμενε μια στιγμή όσο το Echoo ηρεμεί το room.";

    return (
      <PageShell className="flex items-center" showStickyBottomBar={false}>
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow="Echoo"
            title={loadingTitle}
            body={loadingBody}
            status={queue.active ? copy.misc.listening : copy.misc.reconnectingMoment}
            tone={queue.active ? "violet" : "sky"}
            className="shadow-2xl"
          />
        </div>
      </PageShell>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (roomFlowError && !room) {
    return (
      <PageShell className="flex items-center" showStickyBottomBar={false}>
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow={language === "en" ? "Room error" : "Σφάλμα room"}
            title={language === "en" ? "We couldn’t finish your room" : "Δεν μπορέσαμε να ολοκληρώσουμε το room"}
            body={roomFlowError}
            status={language === "en" ? "Please go back to the dashboard and try again." : "Πήγαινε πίσω στο dashboard και δοκίμασε ξανά."}
            tone="rose"
            action={
              <Button asChild className="h-11 rounded-full bg-violet-500 text-white hover:bg-violet-400">
                <Link to="/dashboard">{language === "en" ? "Go to dashboard" : "Πήγαινε στο dashboard"}</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant="outline" className="h-11 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link to="/queue">{language === "en" ? "Go to queue" : "Πήγαινε στην ουρά"}</Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  if (!room) {
    return <Navigate to="/dashboard" replace />;
  }

  if (routeRoomId && routeRoomId !== room.id) {
    return <Navigate to={`/session/${room.id}`} replace />;
  }

  const isActive = room.status === "active";

  const isEnded = room.status === "ended";

  const unlockStage = sessionProgression.mediaUnlocked ? "content" : sessionProgression.voiceUnlocked ? "voice" : "chat";

  const secondsRemaining =
    unlockStage === "chat"
      ? sessionProgression.secondsUntilVoiceUnlock
      : unlockStage === "voice"
        ? sessionProgression.secondsUntilMediaUnlock
        : 0;

  const timerLabel = `${String(Math.floor(secondsRemaining / 60)).padStart(2, "0")}:${String(secondsRemaining % 60).padStart(2, "0")}`;

  const timerProgress =
    unlockStage === "chat"
      ? Math.min(((SESSION_TEXT_PHASE_SECONDS - sessionProgression.secondsUntilVoiceUnlock) / SESSION_TEXT_PHASE_SECONDS) * 100, 100)
      : unlockStage === "voice"
        ? Math.min(((SESSION_AUDIO_PHASE_SECONDS - sessionProgression.secondsUntilMediaUnlock) / SESSION_AUDIO_PHASE_SECONDS) * 100, 100)
        : 100;

  const voiceStatusDotClass =

    voiceState === "connected"
      ? "bg-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.16)]"
      : voiceState === "connecting" || voiceState === "requesting-microphone"
        ? "bg-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.16)]"
        : voiceState === "reconnecting"
          ? "bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.16)]"
          : voiceState === "failed" || voiceState === "error"
            ? "bg-slate-500 shadow-[0_0_0_4px_rgba(100,116,139,0.16)]"
            : "bg-white/20";

  const timerUrgent = secondsRemaining <= 10;

  const composerShellClass =

    phase === "TEXT_PHASE"
      ? timerUrgent
        ? "border-rose-400/18 bg-[#28161a]/92"
        : "border-white/10 bg-[#10182b]/92"
      : phase === "AUDIO_PHASE"
        ? timerUrgent
          ? "border-rose-400/18 bg-[#28161a]/92"
          : "border-emerald-300/12 bg-[#101f1a]/92"
        : timerUrgent
          ? "border-rose-400/18 bg-[#28161a]/92"
          : "border-violet-300/18 bg-[#151826]/92";

  const presenceTone = useMemo(() => {
    if (!presenceBadgeReady || presenceDistanceKm === null) {
      return null;
    }

    return presenceDistanceKm < 50 ? "nearby" : "away";
  }, [presenceBadgeReady, presenceDistanceKm]);

  const presenceLabel = useMemo(() => {
    if (!presenceBadgeReady || presenceDistanceKm === null) {
      return null;
    }

    return getPresenceLabel(presenceDistanceKm, language);
  }, [language, presenceBadgeReady, presenceDistanceKm]);

  const latestSystemMessage = [...room.messages].reverse().find((message) => message.type === "system")?.content;

  const visibleMessages = room.messages;

  const groupedVisibleMessages = useMemo(() => {
    const groups: Array<
      | { kind: "system"; message: (typeof room.messages)[number]; arrivedHot: boolean }
      | {
          kind: "chat";
          key: string;
          isSelf: boolean;
          senderLabel: string;
          showSenderLabel: boolean;
          messages: Array<{ message: (typeof room.messages)[number]; timestamp: string; arrivedHot: boolean }>;
        }
    > = [];

    room.messages.forEach((message, index) => {
      const arrivedHot = message.id === recentMessageId;
      const previousMessage = room.messages[index - 1];

      if (message.type === "system") {
        groups.push({ kind: "system", message, arrivedHot });
        return;
      }

      const isSelf = message.senderId === profile.id;
      const shouldStartNewGroup =
        !previousMessage ||
        previousMessage.type === "system" ||
        previousMessage.senderId !== message.senderId ||
        Date.parse(message.createdAt) - Date.parse(previousMessage.createdAt) > MESSAGE_GROUPING_WINDOW_MS;

      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.kind !== "chat" || shouldStartNewGroup) {
        groups.push({
          kind: "chat",
          key: message.id,
          isSelf,
          senderLabel: isSelf ? "YOU" : "STRANGER",
          showSenderLabel: true,
          messages: [],
        });

      }

      const targetGroup = groups[groups.length - 1];
      if (targetGroup.kind !== "chat") {
        return;
      }

      targetGroup.messages.push({
        message,
        timestamp: new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        arrivedHot,
      });
    });

    return groups;
  }, [profile.id, recentMessageId, room.messages]);

  const roomDisplayName = getRoomDisplayName(room.id);

  const reportReasonOptions = useMemo(
    () => [
      { value: "harassment", label: language === "en" ? "Harassment or abuse" : "Παρενόχληση ή κακοποίηση" },
      { value: "threats", label: language === "en" ? "Threats or hate speech" : "Απειλές ή λόγος μίσους" },
      { value: "spam", label: language === "en" ? "Spam or unwanted content" : "Spam ή ανεπιθύμητο περιεχόμενο" },
    ],
    [language],
  );

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

  const handleDraftChange = (value: string) => {
    setDraft(value);
    setMessageSendError(null);

    if (!value.trim()) {
      stopTyping("cleared");
      return;
    }

    startTyping();
    queueTypingStop();
  };

  const closeReactionPicker = useCallback(() => {
    setActiveReactionMessageId(null);
    if (reactionHoldTimeoutRef.current !== null) {
      window.clearTimeout(reactionHoldTimeoutRef.current);
      reactionHoldTimeoutRef.current = null;
    }
    reactionHoldMessageIdRef.current = null;
  }, []);

  const handleReactionPressStart = useCallback(
    (messageId: string, isSelf: boolean) => {
      if (isSelf) {
        return;
      }

      if (reactionHoldTimeoutRef.current !== null) {
        window.clearTimeout(reactionHoldTimeoutRef.current);
      }

      reactionHoldMessageIdRef.current = messageId;
      reactionHoldTimeoutRef.current = window.setTimeout(() => {
        setActiveReactionMessageId(messageId);
      }, 1000);
    },
    [],
  );

  const handleReactionPressEnd = useCallback(
    (messageId: string) => {
      if (reactionHoldTimeoutRef.current !== null) {
        window.clearTimeout(reactionHoldTimeoutRef.current);
        reactionHoldTimeoutRef.current = null;
      }

      if (reactionHoldMessageIdRef.current === messageId && activeReactionMessageId !== messageId) {
        reactionHoldMessageIdRef.current = null;
      }
    },
    [activeReactionMessageId],
  );

  const handleChatPointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {

      if (!activeReactionMessageId) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target) {
        closeReactionPicker();
        return;
      }

      if (target.closest(`[data-reaction-message="${activeReactionMessageId}"]`) || target.closest(`[data-reaction-picker="${activeReactionMessageId}"]`)) {
        return;
      }

      closeReactionPicker();
    },
    [activeReactionMessageId, closeReactionPicker],
  );

  const handleReactionSelect = useCallback(
    (messageId: string, emoji: string) => {
      setMessageReactions((current) => ({
        ...current,
        [messageId]: current[messageId] === emoji ? "" : emoji,
      }));
      closeReactionPicker();
    },
    [closeReactionPicker],
  );

  const renderReactionPicker = (messageId: string, isSelf: boolean) => (
    <div
      data-reaction-picker={messageId}
      className={cn(
        "absolute top-full z-20 mt-2 flex items-center gap-1 rounded-full border border-white/10 bg-[#10182b] px-2 py-2 shadow-[0_18px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        isSelf ? "right-0" : "left-0",
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {reactionOptions.map((emoji) => {
        const activeReaction = messageReactions[messageId] === emoji;
        return (
          <button
            key={emoji}
            type="button"
            aria-label={`React with ${emoji}`}
            title={emoji}
            onClick={() => handleReactionSelect(messageId, emoji)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-all duration-150 active:scale-95",
              activeReaction
                ? "border-violet-300/25 bg-violet-400/15 text-white"
                : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white",
            )}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );

  const renderReactionBadge = (messageId: string, isSelf: boolean) => {
    const reaction = messageReactions[messageId];
    if (!reaction) {
      return null;
    }

    return (
      <span
        className={cn(
          "absolute -bottom-2 inline-flex h-7 items-center rounded-full border border-white/10 bg-[#0f1729] px-2 text-sm shadow-sm",
          isSelf ? "right-2" : "left-2",
        )}
      >
        {reaction}
      </span>
    );
  };

  const renderSenderLabel = (label: string, isSelf: boolean) => (
    <div className={cn("px-1 text-[10px] font-medium uppercase tracking-[0.28em] text-white/35", isSelf ? "text-right" : "text-left")}>
      {label}
    </div>
  );

  const renderTimestamp = (timestamp: string, isSelf: boolean) => (
    <div className={cn("px-1 pt-1 text-[11px] uppercase tracking-[0.2em] text-white/28", isSelf ? "text-right" : "text-left")}>
      {timestamp}
    </div>
  );

  if (!profile) {

    return (
      <PageShell className="flex items-center" showStickyBottomBar={false}>
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow="Echoo"
            title={copy.misc.loadingProfile}
            body={language === "en" ? "Your anonymous profile is warming up in the background." : "Το ανώνυμο προφίλ σου ζεσταίνεται στο παρασκήνιο."}
            status={copy.misc.restoring}
            tone="amber"
          />
        </div>
      </PageShell>
    );
  }

  if (isEnded) {

    return (
      <PageShell className="flex items-stretch" showStickyBottomBar={false}>
        <div className="flex h-full min-h-0 w-full items-start py-4 sm:items-center">
          <Surface className="mx-auto w-full max-w-2xl overflow-hidden border-0 bg-[#0a0f1a] p-0 shadow-2xl shadow-black/30 max-h-[calc(var(--app-height,100vh)-2rem)]">
            <div className="max-h-[calc(var(--app-height,100vh)-2rem)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                  {language === "en" ? "After the room" : "Μετα το room"}
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
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="h-11 flex-1 rounded-full bg-violet-500 px-4 text-sm font-medium text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
                      onClick={async () => {
                        await startNewSessionFromEndedRoom();
                        navigate("/queue");
                      }}

                    >
                      {language === "en" ? "New room" : "Νεο room"}

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

                <SupportCard language={language} />

              </div>

            </div>
          </Surface>

        </div>
      </PageShell>
    );
  }

  return (
    <div className="h-[var(--app-height,100vh)] overflow-hidden bg-[#08101b] text-white">
      <div className="flex h-full min-h-0 flex-col">
        <header className="sticky top-0 z-30 flex-none border-b border-white/5 bg-[#0f1627]/92 px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl sm:px-6 sm:py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
            <div className="min-w-0 space-y-2 text-left">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-white/35">Echoo</p>
                <h1 className="mt-1 truncate text-sm font-medium text-white/70 sm:text-base">{roomDisplayName}</h1>
              </div>

              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-6 w-fit rounded-full border-white/10 bg-white/5 px-2 text-[10px] font-medium text-white/55 hover:bg-white/10 hover:text-white"
                  aria-label={language === "en" ? "Open report" : "Άνοιγμα αναφοράς"}
                  onClick={() => setReportDialogOpen(true)}
                >
                  <Flag className="mr-1 h-3 w-3" />
                  {language === "en" ? "Report" : "Αναφορά"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-6 w-fit rounded-full border-rose-300/15 bg-rose-500/10 px-2 text-[10px] font-medium text-rose-50/75 hover:bg-rose-500/15 hover:text-rose-50"
                    >
                      <PhoneOff className="mr-1 h-3 w-3" />
                      {language === "en" ? "Block" : "Αποκλεισμός"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-rose-400/20 bg-[#0f1424] text-white sm:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{language === "en" ? "Block this user?" : "Να γίνει αποκλεισμός αυτού του χρήστη;"}</AlertDialogTitle>
                      <AlertDialogDescription className="text-white/55">
                        {language === "en"
                          ? "You will not be placed in a room with this person again."
                          : "Δεν θα μπείτε ξανά στο ίδιο room με αυτό το άτομο."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                        {language === "en" ? "Cancel" : "Ακύρωση"}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-full bg-rose-500 text-white hover:bg-rose-400"
                        onClick={() => {
                          void blockCurrentPartner();
                        }}
                      >
                        {language === "en" ? "Block User" : "Αποκλεισμός χρήστη"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {voicePlaybackBlocked && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-6 w-fit rounded-full border-emerald-300/20 bg-emerald-300/10 px-2 text-[10px] font-medium text-emerald-50 hover:bg-emerald-300/15 hover:text-white"
                    onClick={async () => {
                      await enableVoicePlayback();
                    }}
                  >
                    {language === "en" ? "Audio on" : "Ήχος on"}
                  </Button>
                )}

              </div>
            </div>

            <div className="flex justify-self-center text-center">
              <UnlockProgress stage={unlockStage} timerLabel={timerLabel} timerProgress={timerProgress} language={language} />
            </div>

            <div className="flex justify-end justify-self-end pl-2">
              <div className="flex flex-col items-end gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 rounded-full border-rose-400/20 bg-rose-500/10 px-3 text-xs text-rose-100 hover:bg-rose-500/20 hover:text-white"
                    >
                      {copy.session.leave}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-rose-400/20 bg-[#0f1424] text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{copy.session.backLeaveTitle}</AlertDialogTitle>
                      <AlertDialogDescription className="whitespace-pre-line text-white/55">
                        {copy.session.backLeaveBody}
                      </AlertDialogDescription>

                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                        {copy.session.backStay}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-full bg-rose-500 text-white hover:bg-rose-400"
                        onClick={() => leaveRoom(copy.session.partnerDisconnected)}
                      >
                        {copy.session.backLeave}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {presenceLabel && (
                  <div
                    key={presenceTone ?? "unknown"}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-left shadow-[0_10px_24px_rgba(10,14,25,0.18),0_0_18px_rgba(139,92,246,0.06)] animate-[echo-fade-in_240ms_ease-out] backdrop-blur-sm"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.02)]",
                        presenceTone === "nearby" ? "bg-emerald-300 shadow-emerald-300/25" : "bg-sky-300 shadow-sky-300/20",
                      )}
                    />
                    <span className="text-[10px] font-medium uppercase tracking-[0.26em] text-white/55">{presenceLabel}</span>
                  </div>
                )}

              </div>
            </div>
          </div>
        </header>

        {progressionMoment && (
          <div className="flex-none px-4 pt-3 sm:px-6">
            <div className="mx-auto max-w-3xl rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-white/70 backdrop-blur-sm animate-[echo-message-in_220ms_ease-out]">
              {progressionMoment}
            </div>
          </div>
        )}

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
                      ? "You can start a new room when you're ready."
                      : "Μπορείς να ξεκινήσεις νέο room όταν είσαι έτοιμος/η."}

                </p>
              </div>
            </div>
          </div>
        )}

        <main
          ref={chatScrollRef}
          onScroll={handleChatScroll}
          onPointerDownCapture={handleChatPointerDownCapture}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-4 py-4 [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] sm:px-6"

        >

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-10 sm:pb-12">
            {visibleMessages.length === 0 && (
              <div className="py-4 sm:py-8">
                <CalmStateCard
                  eyebrow={language === "en" ? "Quiet room" : "Ήσυχο room"}
                  title={copy.session.noMessages}
                  body={
                    language === "en"
                      ? "The first line decides the temperature. Say something small and let the room answer."
                      : "Η πρώτη γραμμή ορίζει τη θερμοκρασία. Πες κάτι μικρό και άσε το room να απαντήσει."
                  }
                  status={copy.session.whisper}
                  tone="violet"
                  className="mx-auto max-w-xl"
                />
              </div>
            )}

            {groupedVisibleMessages.map((item) => {
              if (item.kind === "system") {
                const normalizedSystemMessage = item.message.content
                  .normalize("NFD")
                  .toLowerCase()
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[.·…]+/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                const isPositiveSystemMessage =
                  normalizedSystemMessage.includes("connection opened") ||
                  normalizedSystemMessage.includes("η συνδεση ανοιξε") ||
                  normalizedSystemMessage.includes("connection unlocked") ||
                  normalizedSystemMessage.includes("stay curious") ||
                  normalizedSystemMessage.includes("μεινε περιεργος") ||
                  normalizedSystemMessage.includes("voice is now open") ||
                  normalizedSystemMessage.includes("η φωνη ειναι τωρα ανοιχτη") ||
                  normalizedSystemMessage.includes("media sharing is now open") ||
                  normalizedSystemMessage.includes("temporary media sharing is now open") ||
                  normalizedSystemMessage.includes("η προσωρινη κοινη χρηση media ειναι τωρα ανοιχτη") ||
                  normalizedSystemMessage.includes("room opens") ||
                  normalizedSystemMessage.includes("room ανοιγει") ||
                  normalizedSystemMessage.includes("unlocked") ||
                  normalizedSystemMessage.includes("ανοιχτ");

                return (
                  <div
                    key={item.message.id}
                    className={cn(
                      "mx-auto max-w-[min(92%,34rem)] rounded-full border px-4 py-2 text-center text-xs leading-5 shadow-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                      isPositiveSystemMessage ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-50" : "border-white/8 bg-white/5 text-white/45",
                      item.arrivedHot && "animate-[echo-message-in_220ms_ease-out]",
                    )}
                  >
                    {item.message.content}
                  </div>
                );
              }

              return (
                <div key={item.key} className="space-y-2">
                  {item.showSenderLabel && renderSenderLabel(item.senderLabel, item.isSelf)}

                  <div className="space-y-2">
                    {item.messages.map(({ message, timestamp, arrivedHot }) => {
                      if (message.type === "media") {
                        return (
                          <div key={message.id} className={cn("relative flex min-w-0", item.isSelf ? "justify-end" : "justify-start")}>
                            <div
                              data-reaction-message={message.id}
                              className={cn("relative min-w-0 max-w-[min(88%,42rem)] space-y-1", item.isSelf ? "items-end text-right" : "items-start text-left")}
                              onPointerDown={() => handleReactionPressStart(message.id, item.isSelf)}
                              onPointerUp={() => handleReactionPressEnd(message.id)}
                              onPointerCancel={() => handleReactionPressEnd(message.id)}
                              onPointerLeave={() => handleReactionPressEnd(message.id)}
                              onContextMenu={(event) => event.preventDefault()}
                            >
                              <SessionMediaMessage message={message} isSelf={item.isSelf} />
                              {renderTimestamp(timestamp, item.isSelf)}
                              {renderReactionBadge(message.id, item.isSelf)}
                              {activeReactionMessageId === message.id && renderReactionPicker(message.id, item.isSelf)}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={message.id} className={cn("relative flex min-w-0", item.isSelf ? "justify-end" : "justify-start")}>
                          <div
                            data-reaction-message={message.id}
                            className={cn("relative min-w-0 max-w-[min(88%,42rem)] space-y-1", item.isSelf ? "items-end text-right" : "items-start text-left")}
                            onPointerDown={() => handleReactionPressStart(message.id, item.isSelf)}
                            onPointerUp={() => handleReactionPressEnd(message.id)}
                            onPointerCancel={() => handleReactionPressEnd(message.id)}
                            onPointerLeave={() => handleReactionPressEnd(message.id)}
                            onContextMenu={(event) => event.preventDefault()}
                          >
                            <div
                              className={cn(
                                "min-w-0 rounded-[18px] px-4 py-3 text-[15px] leading-6 shadow-sm transition-all duration-200 whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                                item.isSelf ? "bg-white text-slate-950" : "bg-white/7 text-white ring-1 ring-white/5",
                                arrivedHot && "ring-1 ring-white/10 animate-[echo-message-in_220ms_ease-out]",
                              )}
                            >
                              {message.content}
                            </div>
                            {renderTimestamp(timestamp, item.isSelf)}
                            {renderReactionBadge(message.id, item.isSelf)}
                            {activeReactionMessageId === message.id && renderReactionPicker(message.id, item.isSelf)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {typingIndicator && (
              <div className="mt-2 flex justify-start px-1">
                <SessionTypingIndicator />
              </div>
            )}


          </div>
        </main>

        <footer className="sticky bottom-0 z-30 flex-none border-t border-white/5 bg-[#0b1220]/94 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-3 backdrop-blur-xl sm:px-6 sm:pt-4">
          <div className={cn("mx-auto w-full max-w-3xl rounded-[28px] border px-3 py-3 shadow-[0_-18px_45px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:px-4", composerShellClass)}>

            {reconnectingAudio && (
              <div className="mb-3 flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-50">
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                <span>{language === "en" ? "Reconnecting audio…" : "Επανασύνδεση ήχου…"}</span>
              </div>
            )}

            {isActive ? (

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const nextDraft = draft.trim();
                  if (!nextDraft || messageSending) {
                    return;
                  }

                  shouldForceScrollRef.current = isNearBottomRef.current;
                  stopTyping("send");
                  setMessageSendError(null);
                  setMessageSending(true);

                  try {
                    const sent = await sendMessage(nextDraft);
                    if (sent) {
                      setDraft("");
                    } else {
                      setMessageSendError(language === "en" ? "That message didn’t go through. Try again." : "Το μήνυμα δεν στάλθηκε. Δοκίμασε ξανά.");
                    }
                  } catch {
                    setMessageSendError(language === "en" ? "That message didn’t go through. Try again." : "Το μήνυμα δεν στάλθηκε. Δοκίμασε ξανά.");
                  } finally {
                    setMessageSending(false);
                  }
                }}

              >
                <div className="space-y-3">
                  <div className="flex items-end gap-2 sm:gap-3">
                    {canShareMedia && (
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
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-100">
                                <Video className="h-4 w-4" />
                              </span>
                              <span>{language === "en" ? "Mini video" : "Mini video"}</span>
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

                      </div>
                    )}

                    <Input
                      value={draft}
                      onChange={(event) => handleDraftChange(event.target.value)}
                      onBlur={() => stopTyping("blur")}
                      placeholder={language === "en" ? "Say something simple..." : "Πες κάτι απλό..."}
                      className="h-14 min-w-0 flex-1 rounded-full border-0 bg-white/6 px-5 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-violet-400/50"
                    />

                    <Button
                      type="submit"
                      className="h-14 shrink-0 rounded-full bg-violet-500 px-5 text-white shadow-md shadow-violet-500/20 transition-transform duration-150 hover:bg-violet-400 active:scale-95"
                      disabled={messageSending || !draft.trim()}
                    >
                      {messageSending ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 animate-pulse rounded-full bg-white/80" />
                          <span className="hidden sm:inline">{language === "en" ? "Sending" : "Αποστολή"}</span>
                        </span>
                      ) : (
                        <>
                          <span className="hidden sm:inline">{copy.session.send}</span>
                          <Send className="h-4 w-4 sm:ml-2" />
                        </>
                      )}
                    </Button>
                  </div>

                  {messageSendError && (
                    <div className="flex flex-col gap-2 rounded-[22px] border border-amber-300/15 bg-amber-500/10 px-4 py-3 text-sm text-amber-50 sm:flex-row sm:items-center sm:justify-between">
                      <p>{messageSendError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setMessageSendError(null);
                          setMessageSending(true);
                          void (async () => {
                            try {
                              stopTyping("send-retry");
                              const nextDraft = draft.trim();
                              const sent = await sendMessage(nextDraft);

                              if (sent) {
                                setDraft("");
                              } else {
                                setMessageSendError(language === "en" ? "That message didn’t go through. Try again." : "Το μήνυμα δεν στάλθηκε. Δοκίμασε ξανά.");
                              }
                            } catch {
                              setMessageSendError(language === "en" ? "That message didn’t go through. Try again." : "Το μήνυμα δεν στάλθηκε. Δοκίμασε ξανά.");
                            } finally {
                              setMessageSending(false);
                            }
                          })();
                        }}
                      >
                        {language === "en" ? "Retry" : "Προσπάθησε ξανά"}
                      </Button>
                    </div>
                  )}

                  {canShareMedia && selectedMedia && (

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

                          {(mediaBusy || mediaError) && (
                            <div className="space-y-2 pt-1">
                              {mediaBusy ? (
                                <div className="space-y-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
                                  <span className="inline-flex items-center gap-2">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-violet-200/80" />
                                    {language === "en" ? "Uploading media..." : "Μεταφόρτωση media..."}
                                  </span>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                                    <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-violet-300/70" />
                                  </div>
                                </div>
                              ) : null}

                              {mediaError ? (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-full border border-rose-300/15 bg-rose-500/10 px-3 py-2 text-xs text-rose-50/90">
                                  <span className="leading-5">{mediaError}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white"
                                    onClick={() => {
                                      void sendSelectedMedia();
                                    }}
                                    disabled={mediaBusy}
                                  >
                                    {language === "en" ? "Retry" : "Προσπάθησε ξανά"}
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          )}
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
                              {language === "en" ? "Uploading..." : "Μεταφόρτωση..."}

                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              {language === "en" ? "Share it" : "Μοιράσου το"}

                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "pt-1 transition-all duration-200",
                      !canUseVoice && "pointer-events-none h-0 overflow-hidden pt-0 opacity-0",

                    )}
                  >
                    <Button

                      type="button"
                      disabled={!canUseVoice}

                      className={cn(
                        "group flex h-16 w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-[#10182b] px-5 text-white shadow-[0_16px_35px_rgba(0,0,0,0.22)] transition-all duration-200 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-violet-300/40 active:scale-[0.99]",
                        (voiceDiagnostics?.transmitting || pttLatched) && "border-emerald-300/30 bg-emerald-500/15 text-emerald-50 shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_0_28px_rgba(52,211,153,0.18)]",

                        !voiceReady && !pttLatched && "cursor-not-allowed opacity-60",
                        "touch-none select-none [user-select:none] [-webkit-user-select:none] [touch-action:none]",
                      )}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        try {
                          event.currentTarget.setPointerCapture(event.pointerId);
                        } catch {
                          /* noop */
                        }
                        handlePushToTalkPress(event.pointerId);
                      }}
                      onPointerUp={(event) => {
                        try {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        } catch {
                          /* noop */
                        }
                        releasePushToTalk(event.pointerId);
                      }}
                      onPointerCancel={(event) => {
                        releasePushToTalk(event.pointerId);
                      }}
                      onPointerLeave={(event) => {
                        const hasCapture = event.currentTarget.hasPointerCapture(event.pointerId);
                        if (!hasCapture) {
                          releasePushToTalk(event.pointerId);
                        }
                      }}
                      onContextMenu={(event) => event.preventDefault()}
                      aria-label={copy.session.startVoice}

                    >

                      <Mic className={cn("h-5 w-5 transition-transform duration-150", voiceDiagnostics?.transmitting && "scale-110 animate-pulse")} />
                      {phase !== "TEXT_PHASE" && (
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full transition-colors duration-300",
                            voiceStatusDotClass,
                          )}
                          aria-label={language === "en" ? "Audio status" : "Κατάσταση ήχου"}
                          title={
                            voiceState === "connected"
                              ? language === "en"
                                ? "Live"
                                : "Live"
                              : voiceState === "connecting" || voiceState === "requesting-microphone"
                                ? language === "en"
                                  ? "Connecting"
                                  : "Συνδέεται"
                                : voiceState === "reconnecting"
                                  ? language === "en"
                                    ? "Reconnecting"
                                    : "Επανασύνδεση"
                                  : voiceState === "failed" || voiceState === "error"
                                    ? language === "en"
                                      ? "Connection issue"
                                      : "Πρόβλημα σύνδεσης"
                                    : language === "en"
                                      ? "Idle"
                                      : "Ανενεργό"
                          }
                        />
                      )}
                      <span className="text-sm font-semibold tracking-wide sm:text-base">
                        {pttButtonLabel}
                      </span>

                    </Button>

                  </div>

                </div>
              </form>

            ) : (
              <div className="rounded-[26px] border border-violet-300/15 bg-violet-500/10 p-4 text-center sm:p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-violet-100/60">
                  {language === "en" ? "What next?" : "Τι θέλεις μετά;"}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {language === "en" ? "Start a new room or go home" : "Νεο room ή αρχικη;"}

                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {language === "en" ? "A small reflection helps us keep Echoo calm and useful." : "Μια μικρή σκέψη μας βοηθά να κρατάμε το Echoo ήρεμο και χρήσιμο."}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="h-12 flex-1 rounded-full bg-violet-500 text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
                    onClick={async () => {
                      await startNewSessionFromEndedRoom();
                      navigate("/queue");
                    }}

                  >
                    {language === "en" ? "Start a new room" : "Νεο room"}

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
            <DialogTitle>{language === "en" ? "Raise a concern" : "Αναφορά room"}</DialogTitle>
            <DialogDescription className="text-white/55">
              {language === "en"
                ? "Help us keep Echoo safe and respectful."
                : "Βοήθησέ μας να κρατήσουμε το Echoo ασφαλές και με σεβασμό."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/75">
                {language === "en" ? "Reason" : "Λόγος"}
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {reportReasonOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReportReason(option.value)}
                    className={cn(
                      "rounded-[18px] border px-3 py-3 text-left text-sm transition-colors",
                      reportReason === option.value
                        ? "border-rose-400/30 bg-rose-500/15 text-white"
                        : "border-white/10 bg-white/5 text-white/65 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/75">
                {language === "en" ? "Details" : "Λεπτομέρειες"}
              </label>
              <Textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                placeholder={language === "en" ? "Tell us what happened" : "Πες μας τι συνέβη"}
                className="min-h-28 rounded-[20px] border-white/10 bg-white/5 text-white placeholder:text-white/35"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setReportDialogOpen(false)}>
              {language === "en" ? "Cancel" : "Ακύρωση"}
            </Button>
            <Button
              className="rounded-full bg-rose-500 text-white hover:bg-rose-400"
              disabled={reportSubmitting}
              onClick={submitRoomReport}
            >
              {reportSubmitting ? (language === "en" ? "Sending..." : "Αποστολή...") : language === "en" ? "Send report" : "Αποστολή αναφοράς"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    );

  }

export default SessionPage;
