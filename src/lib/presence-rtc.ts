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

function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  });
}

export async function createPeerToPeerVoiceSession({
  audioElement,
  roomId,
  currentUserId,
  userA,
  userB,
}: {
  audioElement: HTMLAudioElement;
  roomId: string;
  currentUserId: string;
  userA: string;
  userB: string;
}): Promise<VoiceSessionController> {
  const startedAt = new Date().toISOString();
  const connectionId = crypto.randomUUID();
  const remoteUserId = currentUserId === userA ? userB : userA;
  const isInitiator = currentUserId < remoteUserId;
  let activeConnectionId: string | null = isInitiator ? connectionId : null;

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  const pc = createPeerConnection();
  const remoteStream = new MediaStream();
  const seenSignalIds = new Set<string>();
  const pendingCandidates: RTCIceCandidateInit[] = [];
  let remoteDescriptionReady = false;
  let stopped = false;
  let pollingTimer: number | null = null;

  const stopPolling = () => {
    if (pollingTimer !== null) {
      window.clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };

  const cleanup = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    stopPolling();
    audioElement.pause();
    audioElement.srcObject = null;
    localStream.getTracks().forEach((track) => track.stop());
    remoteStream.getTracks().forEach((track) => track.stop());
    pc.close();
  };

  const flushPendingCandidates = async () => {
    while (pendingCandidates.length) {
      const candidate = pendingCandidates.shift();
      if (candidate) {
        await pc.addIceCandidate(candidate);
      }
    }
  };

  const sendSignal = async (signalType: VoiceSignalType, payload: VoiceSignalRow["signal_payload"]) => {
    if (!activeConnectionId) {
      return;
    }

    const { error } = await supabase.from("voice_signals").insert({
      room_id: roomId,
      sender_id: currentUserId,
      target_id: remoteUserId,
      signal_type: signalType,
      signal_payload: payload,
    });

    if (error) {
      throw error;
    }
  };

  const handleSignal = async (signal: VoiceSignalRow) => {
    if (stopped || seenSignalIds.has(signal.id)) {
      return;
    }

    if (signal.created_at <= startedAt) {
      seenSignalIds.add(signal.id);
      return;
    }

    if (signal.room_id !== roomId || signal.sender_id === currentUserId) {
      seenSignalIds.add(signal.id);
      return;
    }

    seenSignalIds.add(signal.id);

    if (signal.signal_type === "offer" && !isInitiator) {
      activeConnectionId = signal.signal_payload.connectionId;
      await pc.setRemoteDescription(signal.signal_payload.description as RTCSessionDescriptionInit);
      remoteDescriptionReady = true;
      await flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal("answer", {
        connectionId: activeConnectionId,
        description: answer,
      });

      return;
    }

    if (!activeConnectionId || signal.signal_payload.connectionId !== activeConnectionId) {
      return;
    }

    if (signal.signal_type === "answer" && isInitiator) {
      await pc.setRemoteDescription(signal.signal_payload.description as RTCSessionDescriptionInit);
      remoteDescriptionReady = true;
      await flushPendingCandidates();
      return;
    }

    if (signal.signal_type === "ice") {
      const candidate = signal.signal_payload.candidate as RTCIceCandidateInit | undefined;
      if (!candidate) {
        return;
      }

      if (!remoteDescriptionReady) {
        pendingCandidates.push(candidate);
        return;
      }

      await pc.addIceCandidate(candidate);
    }

  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      void sendSignal("ice", {
        connectionId: activeConnectionId ?? connectionId,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  pc.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "closed" || pc.connectionState === "disconnected") {
      cleanup();
    }
  };

  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  audioElement.srcObject = remoteStream;
  audioElement.muted = false;
  audioElement.autoplay = true;
  audioElement.setAttribute("playsinline", "true");
  await audioElement.play().catch(() => undefined);

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal("offer", {
      connectionId,
      description: offer,
    });

  }

  pollingTimer = window.setInterval(async () => {
    if (stopped) {
      return;
    }

    const { data, error } = await supabase
      .from("voice_signals")
      .select("id, room_id, sender_id, target_id, signal_type, signal_payload, created_at")
      .eq("room_id", roomId)
      .or(`target_id.eq.${currentUserId},sender_id.eq.${currentUserId}`)
      .gt("created_at", startedAt)
      .order("created_at", { ascending: true });

    if (error || !data?.length) {
      return;
    }

    for (const row of data as VoiceSignalRow[]) {
      await handleSignal(row);
    }
  }, 500);

  return {
    stop: cleanup,
  };
}
