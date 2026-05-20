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

type VoiceSessionState = "idle" | "requesting-microphone" | "connecting" | "connected" | "reconnecting" | "failed" | "error";

function rtcLog(message: string, data?: Record<string, unknown>) {
  if (data) {
    console.info("[rtc]", message, data);
    return;
  }

  console.info("[rtc]", message);
}

function trackSnapshot(track: MediaStreamTrack) {
  return {
    id: track.id,
    kind: track.kind,
    label: track.label,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
  };
}

function streamSnapshot(stream: MediaStream) {
  return {
    id: stream.id,
    tracks: stream.getTracks().map(trackSnapshot),
  };
}

function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    iceCandidatePoolSize: 0,
  });
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
    rtcLog("signal publish failed", { roomId, signalType, targetId, error: error.message });
    throw error;
  }

  rtcLog("signal sent", {
    roomId,
    signalType,
    targetId,
    connectionId: payload.connectionId,
  });
}

export async function createPeerToPeerVoiceSession({
  audioElement,
  roomId,
  currentUserId,
  userA,
  userB,
  connectionId: initialConnectionId,
  onStateChange,
  isCurrentSession,
}: {
  audioElement: HTMLAudioElement;
  roomId: string;
  currentUserId: string;
  userA: string;
  userB: string;
  connectionId?: string | null;
  onStateChange?: (state: VoiceSessionState) => void;
  isCurrentSession?: () => boolean;
}): Promise<VoiceSessionController> {
  const sessionId = crypto.randomUUID();
  const remoteUserId = currentUserId === userA ? userB : userA;
  const isInitiator = currentUserId < remoteUserId;
  const canContinue = () => (isCurrentSession ? isCurrentSession() : true);

  rtcLog("session created", {
    roomId,
    sessionId,
    currentUserId,
    remoteUserId,
    isInitiator,
    initialConnectionId,
  });

  const emitState = (state: VoiceSessionState) => {
    if (!canContinue()) {
      rtcLog("state skipped for stale session", { roomId, sessionId, state });
      return;
    }

    rtcLog("voice state", { roomId, sessionId, state });
    onStateChange?.(state);
  };

  const audioEventHandlers = {
    canplay: () => rtcLog("audio element canplay", { roomId, sessionId }),
    playing: () => rtcLog("audio element playing", { roomId, sessionId, muted: audioElement.muted, paused: audioElement.paused }),
    pause: () => rtcLog("audio element paused", { roomId, sessionId }),
    waiting: () => rtcLog("audio element waiting", { roomId, sessionId }),
    stalled: () => rtcLog("audio element stalled", { roomId, sessionId }),
    ended: () => rtcLog("audio element ended", { roomId, sessionId }),
    error: () =>
      rtcLog("audio element error", {
        roomId,
        sessionId,
        error: audioElement.error ? { code: audioElement.error.code, message: audioElement.error.message } : null,
      }),
  } as const;

  Object.entries(audioEventHandlers).forEach(([eventName, handler]) => {
    audioElement.addEventListener(eventName, handler);
  });

  audioElement.autoplay = true;
  audioElement.muted = true;
  audioElement.setAttribute("playsinline", "true");
  audioElement.setAttribute("autoplay", "true");
  void audioElement.play().catch((error) => {
    rtcLog("audio element priming failed", {
      roomId,
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  emitState("requesting-microphone");
  rtcLog("requesting microphone", {
    roomId,
    sessionId,
    constraints: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    },
  });

  let localStream: MediaStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    rtcLog("microphone permission granted", { roomId, sessionId });
  } catch (error) {
    rtcLog("microphone permission denied", {
      roomId,
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    emitState("error");
    throw error;
  }

  const localAudioTracks = localStream.getAudioTracks();
  rtcLog("local stream created", {
    roomId,
    sessionId,
    stream: streamSnapshot(localStream),
    trackCount: localAudioTracks.length,
    active: localStream.active,
  });

  if (!localAudioTracks.length) {
    const error = new Error("No audio tracks returned from getUserMedia");
    rtcLog("local audio capture failed", { roomId, sessionId, error: error.message });
    emitState("error");
    throw error;
  }

  localAudioTracks.forEach((track) => {
    rtcLog("local audio track state", {
      roomId,
      sessionId,
      ...trackSnapshot(track),
    });

    track.onmute = () => rtcLog("local track muted", { roomId, sessionId, ...trackSnapshot(track) });
    track.onunmute = () => rtcLog("local track unmuted", { roomId, sessionId, ...trackSnapshot(track) });
    track.onended = () => rtcLog("local track ended", { roomId, sessionId, ...trackSnapshot(track) });
  });

  let stopped = false;
  let reconnectAttempts = 0;
  let currentConnectionId = isInitiator ? crypto.randomUUID() : initialConnectionId ?? null;
  let activePeer: RTCPeerConnection | null = null;
  let remoteStream = new MediaStream();
  let signalChannel: ReturnType<typeof supabase.channel> | null = null;
  let pollTimer: number | null = null;
  let reconnectTimer: number | null = null;
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

  const stopReconnectTimer = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
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

    if (stopped || !canContinue()) {
      return;
    }

    audioElement.srcObject = remoteStream;
    audioElement.autoplay = true;
    audioElement.muted = false;
    audioElement.volume = 1;
    audioElement.setAttribute("playsinline", "true");
    audioElement.setAttribute("autoplay", "true");
    rtcLog("audio element attachment", {
      roomId,
      sessionId,
      reason,
      srcObject: remoteStream.id,
      stream: streamSnapshot(remoteStream),
    });

    try {
      await audioElement.play();
      rtcLog("audio playback success", {
        roomId,
        sessionId,
        reason,
        muted: audioElement.muted,
        paused: audioElement.paused,
      });
      return;
    } catch (error) {
      rtcLog("audio playback failure", {
        roomId,
        sessionId,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      audioElement.muted = true;
      await audioElement.play();
      rtcLog("audio playback success with muted fallback", {
        roomId,
        sessionId,
        reason,
        muted: audioElement.muted,
      });
      audioElement.muted = false;
      return;
    } catch (error) {
      rtcLog("autoplay fallback failed", {
        roomId,
        sessionId,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      emitState("error");
    }
  };

  const emitRoomState = (state: "idle" | "connecting" | "connected" | "reconnecting" | "failed") => {
    emitState(state);
  };

  const setRoomState = async (
    rtcState: "idle" | "connecting" | "connected" | "reconnecting" | "failed",
    connectionId: string | null = currentConnectionId,
  ) => {
    if (stopped || !canContinue()) {
      rtcLog("room state skipped for stale session", { roomId, sessionId, rtcState, connectionId });
      return;
    }

    emitRoomState(rtcState);
    await updateRoomRtcState(roomId, rtcState, connectionId);
  };

  const cleanupPeer = () => {
    if (!activePeer) {
      return;
    }

    rtcLog("peer cleanup", {
      roomId,
      sessionId,
      connectionId: currentConnectionId,
      signalingState: activePeer.signalingState,
      connectionState: activePeer.connectionState,
      iceConnectionState: activePeer.iceConnectionState,
    });

    activePeer.ontrack = null;
    activePeer.onicecandidate = null;
    activePeer.onicecandidateerror = null;
    activePeer.onconnectionstatechange = null;
    activePeer.oniceconnectionstatechange = null;
    activePeer.onicegatheringstatechange = null;
    activePeer.onsignalingstatechange = null;
    activePeer.onnegotiationneeded = null;
    activePeer.close();
    activePeer = null;
  };

  const resetRemoteStream = () => {
    remoteStream.getTracks().forEach((track) => {
      rtcLog("remote track stopped during reset", { roomId, sessionId, ...trackSnapshot(track) });
      track.stop();
    });
    remoteStream = new MediaStream();
    rtcLog("remote stream reset", { roomId, sessionId });
  };

  const teardown = async (markIdle = true) => {
    if (stopped) {
      return;
    }

    stopped = true;
    rtcLog("teardown requested", { roomId, sessionId, markIdle, connectionId: currentConnectionId });
    stopPolling();
    stopReconnectTimer();
    stopChannel();
    cleanupPeer();
    audioElement.pause();
    audioElement.srcObject = null;
    Object.entries(audioEventHandlers).forEach(([eventName, handler]) => {
      audioElement.removeEventListener(eventName, handler);
    });

    localStream.getTracks().forEach((track) => {
      rtcLog("local track stopped during teardown", { roomId, sessionId, ...trackSnapshot(track) });
      track.stop();
    });
    remoteStream.getTracks().forEach((track) => {
      rtcLog("remote track stopped during teardown", { roomId, sessionId, ...trackSnapshot(track) });
      track.stop();
    });

    if (markIdle && canContinue()) {
      await setRoomState("idle", null).catch(() => undefined);
    }
  };

  const bindRemoteTrackDebug = (track: MediaStreamTrack) => {
    track.onmute = () => rtcLog("remote track muted", { roomId, sessionId, ...trackSnapshot(track) });
    track.onunmute = () => rtcLog("remote track unmuted", { roomId, sessionId, ...trackSnapshot(track) });
    track.onended = () => rtcLog("remote track ended", { roomId, sessionId, ...trackSnapshot(track) });
  };

  const attachPeerHandlers = (peer: RTCPeerConnection) => {
    peer.onnegotiationneeded = () => {
      rtcLog("negotiation needed", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
      });
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate || !currentConnectionId || stopped || !canContinue()) {
        if (!event.candidate) {
          rtcLog("ice candidate gathering complete", { roomId, sessionId, connectionId: currentConnectionId });
        }
        return;
      }

      rtcLog("ice candidate gathered", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        candidate: event.candidate.candidate,
      });
      void publishSignal(roomId, currentUserId, remoteUserId, "ice", {
        connectionId: currentConnectionId,
        candidate: event.candidate.toJSON(),
      });
    };

    peer.onicecandidateerror = (event) => {
      rtcLog("ice candidate error", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        errorCode: event.errorCode,
        errorText: event.errorText,
        url: event.url,
      });
    };

    peer.onsignalingstatechange = () => {
      rtcLog("signaling state", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        state: peer.signalingState,
      });
    };

    peer.onicegatheringstatechange = () => {
      rtcLog("ice gathering state", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        state: peer.iceGatheringState,
      });
    };

    peer.onconnectionstatechange = () => {
      rtcLog("peer connection state", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        state: peer.connectionState,
      });

      if (peer.connectionState === "connected") {
        reconnectAttempts = 0;
        stopReconnectTimer();
        void setRoomState("connected").catch(() => undefined);
        return;
      }

      if (peer.connectionState === "disconnected") {
        void handleReconnect(peer.connectionState);
      }

      if (peer.connectionState === "failed") {
        void handleReconnect(peer.connectionState);
      }
    };

    peer.oniceconnectionstatechange = () => {
      rtcLog("ice connection state", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        state: peer.iceConnectionState,
      });

      if (peer.iceConnectionState === "connected") {
        reconnectAttempts = 0;
        stopReconnectTimer();
        void setRoomState("connected").catch(() => undefined);
        return;
      }

      if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
        void handleReconnect(peer.iceConnectionState);
      }
    };

    peer.ontrack = (event) => {
      rtcLog("remote track received", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        track: trackSnapshot(event.track),
        streams: event.streams.map((stream) => streamSnapshot(stream)),
      });

      bindRemoteTrackDebug(event.track);

      const receivedStream = event.streams[0] ?? new MediaStream([event.track]);
      if (!receivedStream.getTracks().some((track) => track.id === event.track.id)) {
        receivedStream.addTrack(event.track);
      }

      remoteStream = receivedStream;

      rtcLog("remote stream received", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        stream: streamSnapshot(remoteStream),
      });

      void ensureAudioPlayback("track");

    };
  };

  const startPeer = async (mode: "offer" | "answer") => {
    if (stopped || !canContinue()) {
      rtcLog("startPeer skipped for stale session", { roomId, sessionId, mode });
      return;
    }

    cleanupPeer();
    resetRemoteStream();

    const peer = createPeerConnection();
    activePeer = peer;
    remoteDescriptionReady = false;
    pendingCandidates.length = 0;

    rtcLog("peer created", {
      roomId,
      sessionId,
      connectionId: currentConnectionId,
      mode,
      localTrackCount: localAudioTracks.length,
      signalingState: peer.signalingState,
    });

    localAudioTracks.forEach((track) => {
      rtcLog("local track attached to peer", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        ...trackSnapshot(track),
      });
      peer.addTrack(track, localStream);
    });

    attachPeerHandlers(peer);

    if (mode === "offer") {
      if (!currentConnectionId) {
        currentConnectionId = crypto.randomUUID();
      }

      await setRoomState(restarting ? "reconnecting" : "connecting", currentConnectionId).catch(() => undefined);
      const offer = await peer.createOffer();
      rtcLog("offer created", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        sdpType: offer.type,
        sdpLength: offer.sdp?.length ?? 0,
      });
      await peer.setLocalDescription(offer);
      rtcLog("local description set", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        state: peer.signalingState,
      });
      await publishSignal(roomId, currentUserId, remoteUserId, "offer", {
        connectionId: currentConnectionId,
        description: offer,
      });
      return;
    }

    await setRoomState(restarting ? "reconnecting" : "connecting", currentConnectionId).catch(() => undefined);
  };

  const flushPendingCandidates = async () => {
    if (!activePeer || !remoteDescriptionReady || !canContinue()) {
      return;
    }

    while (pendingCandidates.length) {
      const candidate = pendingCandidates.shift();
      if (!candidate) {
        continue;
      }

      rtcLog("flushing pending ice candidate", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
      });
      try {
        await activePeer.addIceCandidate(candidate);
      } catch (error) {
        rtcLog("pending ice candidate failed", {
          roomId,
          sessionId,
          connectionId: currentConnectionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const handleOffer = async (signal: VoiceSignalRow) => {
    if (signal.target_id !== currentUserId) {
      return;
    }

    const connectionId = signal.signal_payload.connectionId;
    if (currentConnectionId === connectionId && remoteDescriptionReady) {
      rtcLog("stale offer ignored", { roomId, sessionId, connectionId });
      return;
    }

    const needsFreshPeer =
      !activePeer ||
      activePeer.connectionState === "failed" ||
      activePeer.connectionState === "disconnected" ||
      activePeer.connectionState === "closed" ||
      currentConnectionId !== connectionId;

    currentConnectionId = connectionId;
    rtcLog("offer received", {
      roomId,
      sessionId,
      connectionId,
      from: signal.sender_id,
    });

    if (needsFreshPeer) {
      cleanupPeer();
      resetRemoteStream();
      await startPeer("answer");
    }

    if (!activePeer) {
      return;
    }

    await activePeer.setRemoteDescription(signal.signal_payload.description as RTCSessionDescriptionInit);
    rtcLog("remote description set from offer", {
      roomId,
      sessionId,
      connectionId,
      state: activePeer.signalingState,
    });

    remoteDescriptionReady = true;
    await flushPendingCandidates();

    const answer = await activePeer.createAnswer();
    rtcLog("answer created", {
      roomId,
      sessionId,
      connectionId,
      sdpType: answer.type,
      sdpLength: answer.sdp?.length ?? 0,
    });
    await activePeer.setLocalDescription(answer);
    rtcLog("local description set", {
      roomId,
      sessionId,
      connectionId,
      state: activePeer.signalingState,
    });
    await publishSignal(roomId, currentUserId, remoteUserId, "answer", {
      connectionId,
      description: answer,
    });
    await setRoomState("connected", connectionId).catch(() => undefined);
  };

  const handleAnswer = async (signal: VoiceSignalRow) => {
    if (signal.target_id !== currentUserId) {
      return;
    }

    if (!activePeer || !currentConnectionId || signal.signal_payload.connectionId !== currentConnectionId) {
      rtcLog("answer ignored", {
        roomId,
        sessionId,
        currentConnectionId,
        incomingConnectionId: signal.signal_payload.connectionId,
      });
      return;
    }

    rtcLog("answer received", { roomId, sessionId, connectionId: currentConnectionId });
    await activePeer.setRemoteDescription(signal.signal_payload.description as RTCSessionDescriptionInit);
    rtcLog("remote description set from answer", {
      roomId,
      sessionId,
      connectionId: currentConnectionId,
      state: activePeer.signalingState,
    });
    remoteDescriptionReady = true;
    await flushPendingCandidates();
    await setRoomState("connected", currentConnectionId).catch(() => undefined);
  };

  const handleIce = async (signal: VoiceSignalRow) => {
    if (signal.target_id !== currentUserId) {
      return;
    }

    if (!activePeer || !currentConnectionId || signal.signal_payload.connectionId !== currentConnectionId) {
      rtcLog("ice candidate ignored", {
        roomId,
        sessionId,
        currentConnectionId,
        incomingConnectionId: signal.signal_payload.connectionId,
      });
      return;
    }

    const candidate = signal.signal_payload.candidate;
    if (!candidate) {
      return;
    }

    rtcLog("ice candidate received", {
      roomId,
      sessionId,
      connectionId: currentConnectionId,
      candidate: candidate.candidate,
    });

    if (!remoteDescriptionReady) {
      pendingCandidates.push(candidate);
      rtcLog("ice candidate queued", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        queued: pendingCandidates.length,
      });
      return;
    }

    try {
      await activePeer.addIceCandidate(candidate);
    } catch (error) {
      rtcLog("ice candidate add failed", {
        roomId,
        sessionId,
        connectionId: currentConnectionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSignal = async (signal: VoiceSignalRow) => {
    if (stopped || !canContinue()) {
      return;
    }

    if (processedSignalIds.has(signal.id)) {
      return;
    }

    processedSignalIds.add(signal.id);

    if (signal.room_id !== roomId) {
      return;
    }

    rtcLog("signal received", {
      roomId,
      sessionId,
      signalId: signal.id,
      type: signal.signal_type,
      senderId: signal.sender_id,
      targetId: signal.target_id,
      connectionId: signal.signal_payload.connectionId,
    });

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
      .eq("target_id", currentUserId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      rtcLog("signal fetch failed", { roomId, sessionId, error: error.message });
      return;
    }

    rtcLog("signal fetch complete", {
      roomId,
      sessionId,
      count: data?.length ?? 0,
      connectionId: currentConnectionId,
    });

    for (const row of (data ?? []) as VoiceSignalRow[]) {
      await handleSignal(row);
    }
  };

  const startListening = async () => {
    stopChannel();
    signalChannel = supabase
      .channel(`voice-signals-${roomId}-${currentUserId}-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "voice_signals", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const nextSignal = payload.new as VoiceSignalRow;
          rtcLog("realtime signal payload", {
            roomId,
            sessionId,
            signalId: nextSignal.id,
            type: nextSignal.signal_type,
            senderId: nextSignal.sender_id,
            targetId: nextSignal.target_id,
            connectionId: nextSignal.signal_payload.connectionId,
          });
          void handleSignal(nextSignal);
        },
      )
      .subscribe((status) => {
        rtcLog("signal channel status", { roomId, sessionId, status });
      });

    await fetchPendingSignals();

    stopPolling();
    pollTimer = window.setInterval(() => {
      void fetchPendingSignals();
    }, 1200);
  };

  const handleReconnect = async (state: RTCPeerConnectionState | RTCIceConnectionState) => {
    if (stopped || restarting || !canContinue()) {
      return;
    }

    restarting = true;
    const rtcState = describeRtcState(state);
    rtcLog("reconnect requested", {
      roomId,
      sessionId,
      connectionId: currentConnectionId,
      state: rtcState,
      reconnectAttempts,
    });

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

    stopReconnectTimer();
    reconnectTimer = window.setTimeout(() => {
      restarting = false;
      if (stopped || !canContinue()) {
        return;
      }
      void startPeer("offer");
    }, 1000);
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
