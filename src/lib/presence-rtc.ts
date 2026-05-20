import { supabase } from "@/integrations/supabase/client";

export interface VoiceSessionController {
  stop: () => void;
}

type VoiceSignalType = "offer" | "answer" | "ice";

type VoiceSignalRow = {
  id: string;
  room_id: string;
  sender_id: string;
  target_id: string;
  signal_type: VoiceSignalType;
  signal_payload: {
    connectionId: string;
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
  created_at: string;
};

function rtcLog(message: string, data?: Record<string, unknown>) {
  if (data) {
    console.debug("[rtc]", message, data);
    return;
  }

  console.debug("[rtc]", message);
}

function createPeerConnection() {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  });

  peer.addTransceiver("audio", { direction: "sendrecv" });
  return peer;
}

function describeRtcState(state: RTCPeerConnectionState | RTCIceConnectionState) {
  if (state === "connected") {
    return "connected" as const;
  }

  if (state === "connecting" || state === "checking" || state === "new") {
    return "connecting" as const;
  }

  if (state === "disconnected") {
    return "reconnecting" as const;
  }

  return "failed" as const;
}

async function updateRoomRtcState(
  roomId: string,
  rtcState: "idle" | "connecting" | "connected" | "reconnecting" | "failed",
  rtcConnectionId: string | null,
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      rtc_state: rtcState,
      rtc_connection_id: rtcConnectionId,
      rtc_updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) {
    rtcLog("room rtc state update failed", { roomId, rtcState, error: error.message });
    throw error;
  }
}

async function publishSignal(roomId: string, senderId: string, targetId: string, signalType: VoiceSignalType, payload: VoiceSignalRow["signal_payload"]) {
  const { error } = await supabase.from("voice_signals").insert({
    room_id: roomId,
    sender_id: senderId,
    target_id: targetId,
    signal_type: signalType,
    signal_payload: payload,
  });

  if (error) {
    rtcLog("signal publish failed", { roomId, signalType, error: error.message });
    throw error;
  }
}

export async function createPeerToPeerVoiceSession({
  audioElement,
  roomId,
  currentUserId,
  userA,
  userB,
  connectionId: initialConnectionId,
  onStateChange,
}: {
  audioElement: HTMLAudioElement;
  roomId: string;
  currentUserId: string;
  userA: string;
  userB: string;
  connectionId?: string | null;
  onStateChange?: (state: "idle" | "connecting" | "connected" | "reconnecting" | "failed" | "error") => void;
}): Promise<VoiceSessionController> {

  const remoteUserId = currentUserId === userA ? userB : userA;
  const isInitiator = currentUserId < remoteUserId;

  audioElement.autoplay = true;
  audioElement.muted = true;
  audioElement.setAttribute("playsinline", "true");
  audioElement.setAttribute("autoplay", "true");
  void audioElement.play().catch(() => undefined);

  const localStream = await navigator.mediaDevices.getUserMedia({

    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  rtcLog("microphone acquired", { roomId, currentUserId, remoteUserId, isInitiator });

  let stopped = false;
  let reconnectAttempts = 0;
  let currentConnectionId = isInitiator ? crypto.randomUUID() : initialConnectionId ?? null;
  let activePeer: RTCPeerConnection | null = null;
  let remoteStream = new MediaStream();
  let signalChannel: ReturnType<typeof supabase.channel> | null = null;
  let pollTimer: number | null = null;
  let remoteDescriptionReady = false;
  let restarting = false;
  const processedSignalIds = new Set<string>();
  const pendingCandidates: RTCIceCandidateInit[] = [];

  const stopPolling = () => {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const stopChannel = () => {
    if (!signalChannel) {
      return;
    }

    signalChannel.unsubscribe();
    signalChannel = null;
  };

  const ensureAudioPlayback = async (reason: string) => {
    audioElement.srcObject = remoteStream;
    audioElement.autoplay = true;
    audioElement.muted = false;
    audioElement.volume = 1;
    audioElement.setAttribute("playsinline", "true");
    audioElement.setAttribute("autoplay", "true");
    rtcLog("stream attached", { roomId, reason, tracks: remoteStream.getTracks().length });

    try {
      await audioElement.play();
      rtcLog("audio playback started", { roomId, reason });
      return;
    } catch (error) {
      rtcLog("audio playback error", {
        roomId,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      audioElement.muted = true;
      await audioElement.play();
      audioElement.muted = false;
      rtcLog("audio playback started with muted fallback", { roomId, reason });
    } catch (fallbackError) {
      rtcLog("audio playback fallback failed", {
        roomId,
        reason,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }
  };

  const emitState = (state: "idle" | "connecting" | "connected" | "reconnecting" | "failed") => {
    onStateChange?.(state);
  };

  const setRoomState = async (
    rtcState: "idle" | "connecting" | "connected" | "reconnecting" | "failed",
    connectionId: string | null = currentConnectionId,
  ) => {
    emitState(rtcState);
    await updateRoomRtcState(roomId, rtcState, connectionId);
  };

  const cleanupPeer = () => {
    if (!activePeer) {
      return;
    }

    activePeer.ontrack = null;
    activePeer.onicecandidate = null;
    activePeer.onconnectionstatechange = null;
    activePeer.oniceconnectionstatechange = null;
    activePeer.onicegatheringstatechange = null;
    activePeer.close();
    activePeer = null;
  };

  const teardown = async (markIdle = true) => {
    if (stopped) {
      return;
    }

    stopped = true;
    stopPolling();
    stopChannel();
    cleanupPeer();
    audioElement.pause();
    audioElement.srcObject = null;
    localStream.getTracks().forEach((track) => track.stop());
    remoteStream.getTracks().forEach((track) => track.stop());
    if (markIdle) {
      await setRoomState("idle", null).catch(() => undefined);
    }
  };

  const attachPeerHandlers = (peer: RTCPeerConnection) => {
    peer.onicecandidate = (event) => {
      if (!event.candidate || !currentConnectionId) {
        return;
      }

      rtcLog("ice candidate gathered", { roomId, connectionId: currentConnectionId });
      void publishSignal(roomId, currentUserId, remoteUserId, "ice", {
        connectionId: currentConnectionId,
        candidate: event.candidate.toJSON(),
      });
    };

    peer.ontrack = (event) => {
      rtcLog("track received", {
        roomId,
        connectionId: currentConnectionId,
        kind: event.track.kind,
        streams: event.streams.length,
      });

      if (!remoteStream.getTracks().some((existing) => existing.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }

      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((existing) => existing.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });

      void ensureAudioPlayback("track");

    };

    peer.onconnectionstatechange = () => {
      rtcLog("peer connection state", {
        roomId,
        connectionId: currentConnectionId,
        state: peer.connectionState,
      });

      if (peer.connectionState === "connected") {
        reconnectAttempts = 0;
        void setRoomState("connected").catch(() => undefined);
        return;
      }

      if (peer.connectionState === "disconnected" || peer.connectionState === "failed") {
        void handleReconnect(peer.connectionState);
      }
    };

    peer.oniceconnectionstatechange = () => {
      rtcLog("ice connection state", {
        roomId,
        connectionId: currentConnectionId,
        state: peer.iceConnectionState,
      });

      if (peer.iceConnectionState === "connected") {
        reconnectAttempts = 0;
        void setRoomState("connected").catch(() => undefined);
        return;
      }

      if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
        void handleReconnect(peer.iceConnectionState);
      }
    };

    peer.onicegatheringstatechange = () => {
      rtcLog("ice gathering state", {
        roomId,
        connectionId: currentConnectionId,
        state: peer.iceGatheringState,
      });
    };
  };

  const resetRemoteStream = () => {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = new MediaStream();
    void ensureAudioPlayback("reset");
  };

  const startPeer = async (mode: "offer" | "answer") => {
    if (stopped) {
      return;
    }

    cleanupPeer();
    resetRemoteStream();

    const peer = createPeerConnection();
    activePeer = peer;
    remoteDescriptionReady = false;
    pendingCandidates.length = 0;

    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });

    attachPeerHandlers(peer);

    if (mode === "offer") {
      if (!currentConnectionId) {
        currentConnectionId = crypto.randomUUID();
      }

      await setRoomState(restarting ? "reconnecting" : "connecting", currentConnectionId).catch(() => undefined);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      rtcLog("offer created", { roomId, connectionId: currentConnectionId });
      await publishSignal(roomId, currentUserId, remoteUserId, "offer", {
        connectionId: currentConnectionId,
        description: offer,
      });
      return;
    }

    await setRoomState(restarting ? "reconnecting" : "connecting", currentConnectionId).catch(() => undefined);
  };

  const flushPendingCandidates = async () => {
    if (!activePeer || !remoteDescriptionReady) {
      return;
    }

    while (pendingCandidates.length) {
      const candidate = pendingCandidates.shift();
      if (candidate) {
        await activePeer.addIceCandidate(candidate);
      }
    }
  };

  const handleOffer = async (signal: VoiceSignalRow) => {
    const connectionId = signal.signal_payload.connectionId;
    if (currentConnectionId === connectionId && remoteDescriptionReady) {
      return;
    }

    const needsFreshPeer =
      !activePeer ||
      activePeer.connectionState === "failed" ||
      activePeer.connectionState === "disconnected" ||
      activePeer.connectionState === "closed" ||
      currentConnectionId !== connectionId;

    currentConnectionId = connectionId;
    rtcLog("offer received", { roomId, connectionId, from: signal.sender_id });

    if (needsFreshPeer) {
      cleanupPeer();
      resetRemoteStream();
      await startPeer("answer");
    }

    if (!activePeer) {
      return;
    }

    await activePeer.setRemoteDescription(signal.signal_payload.description as RTCSessionDescriptionInit);

    remoteDescriptionReady = true;
    await flushPendingCandidates();

    const answer = await activePeer.createAnswer();
    await activePeer.setLocalDescription(answer);
    rtcLog("answer created", { roomId, connectionId });
    await publishSignal(roomId, currentUserId, remoteUserId, "answer", {
      connectionId,
      description: answer,
    });
    await setRoomState("connected", connectionId).catch(() => undefined);
  };

  const handleAnswer = async (signal: VoiceSignalRow) => {
    if (!activePeer || !currentConnectionId || signal.signal_payload.connectionId !== currentConnectionId) {
      return;
    }

    rtcLog("answer received", { roomId, connectionId: currentConnectionId });
    await activePeer.setRemoteDescription(signal.signal_payload.description as RTCSessionDescriptionInit);
    remoteDescriptionReady = true;
    await flushPendingCandidates();
    await setRoomState("connected", currentConnectionId).catch(() => undefined);
  };

  const handleIce = async (signal: VoiceSignalRow) => {
    if (!activePeer || !currentConnectionId || signal.signal_payload.connectionId !== currentConnectionId) {
      return;
    }

    const candidate = signal.signal_payload.candidate;
    if (!candidate) {
      return;
    }

    rtcLog("ice candidate received", { roomId, connectionId: currentConnectionId });
    if (!remoteDescriptionReady) {
      pendingCandidates.push(candidate);
      return;
    }

    await activePeer.addIceCandidate(candidate);
  };

  const handleSignal = async (signal: VoiceSignalRow) => {
    if (stopped || processedSignalIds.has(signal.id)) {
      return;
    }

    processedSignalIds.add(signal.id);

    if (signal.room_id !== roomId || signal.sender_id === currentUserId) {
      return;
    }

    if (signal.signal_type === "offer") {
      await handleOffer(signal);
      return;
    }

    if (signal.signal_type === "answer") {
      await handleAnswer(signal);
      return;
    }

    await handleIce(signal);
  };

  const fetchPendingSignals = async () => {
    const { data, error } = await supabase
      .from("voice_signals")
      .select("id, room_id, sender_id, target_id, signal_type, signal_payload, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      rtcLog("signal fetch failed", { roomId, error: error.message });
      return;
    }

    for (const row of (data ?? []) as VoiceSignalRow[]) {
      await handleSignal(row);
    }
  };

  const startListening = async () => {
    stopChannel();
    signalChannel = supabase
      .channel(`voice-signals-${roomId}-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "voice_signals", filter: `room_id=eq.${roomId}` },
        (payload) => {
          rtcLog("signal received", {
            roomId,
            connectionId: currentConnectionId,
            type: (payload.new as VoiceSignalRow).signal_type,
          });
          void handleSignal(payload.new as VoiceSignalRow);
        },
      )
      .subscribe((status) => {
        rtcLog("signal channel status", { roomId, status });
      });

    await fetchPendingSignals();

    stopPolling();
    pollTimer = window.setInterval(() => {
      void fetchPendingSignals();
    }, 1500);
  };

  const handleReconnect = async (state: RTCPeerConnectionState | RTCIceConnectionState) => {
    if (stopped || restarting) {
      return;
    }

    restarting = true;
    const rtcState = describeRtcState(state);
    rtcLog("reconnect requested", { roomId, currentConnectionId, state: rtcState, reconnectAttempts });
    await setRoomState(rtcState === "failed" ? "reconnecting" : rtcState, currentConnectionId).catch(() => undefined);

    if (!isInitiator) {
      restarting = false;
      return;
    }

    if (reconnectAttempts >= 2) {
      await setRoomState("failed", currentConnectionId).catch(() => undefined);
      await teardown(false).catch(() => undefined);
      return;
    }

    reconnectAttempts += 1;
    const nextConnectionId = crypto.randomUUID();
    currentConnectionId = nextConnectionId;
    await setRoomState("reconnecting", nextConnectionId).catch(() => undefined);

    window.setTimeout(() => {
      restarting = false;
      void startPeer("offer");
    }, 700);
  };

  await ensureAudioPlayback("initial");

  if (isInitiator) {
    await startPeer("offer");
  } else {
    await startPeer("answer");
  }

  await startListening();

  return {
    stop: () => {
      void teardown();
    },
  };
}
