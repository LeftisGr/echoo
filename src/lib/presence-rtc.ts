export interface VoiceSessionController {
  stop: () => void;
}

export async function createVoiceLoopback(
  audioElement: HTMLAudioElement,
): Promise<VoiceSessionController> {
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  const caller = new RTCPeerConnection();
  const callee = new RTCPeerConnection();
  const remoteStream = new MediaStream();

  caller.onicecandidate = (event) => {
    if (event.candidate) {
      void callee.addIceCandidate(event.candidate);
    }
  };

  callee.onicecandidate = (event) => {
    if (event.candidate) {
      void caller.addIceCandidate(event.candidate);
    }
  };

  callee.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
  };

  localStream.getTracks().forEach((track) => caller.addTrack(track, localStream));

  const offer = await caller.createOffer();
  await caller.setLocalDescription(offer);
  await callee.setRemoteDescription(offer);

  const answer = await callee.createAnswer();
  await callee.setLocalDescription(answer);
  await caller.setRemoteDescription(answer);

  audioElement.srcObject = remoteStream;
  audioElement.muted = false;
  audioElement.autoplay = true;
  audioElement.setAttribute("playsinline", "true");
  await audioElement.play().catch(() => undefined);

  return {
    stop: () => {
      audioElement.pause();
      audioElement.srcObject = null;
      localStream.getTracks().forEach((track) => track.stop());
      remoteStream.getTracks().forEach((track) => track.stop());
      caller.close();
      callee.close();
    },
  };
}