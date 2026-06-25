import { useCallback, useEffect, useRef, useState } from "react";

export type AudioRecorderState = "idle" | "recording" | "stopped" | "error";

export interface AudioRecorderResult {
  state: AudioRecorderState;
  secondsLeft: number;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
  isSupported: boolean;
}

const MAX_DURATION_SECONDS = 15;

export function useAudioRecorder(): AudioRecorderResult {
  const [state, setState] = useState<AudioRecorderState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION_SECONDS);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof window !== "undefined" && 
    "MediaRecorder" in window && 
    "getUserMedia" in (navigator.mediaDevices ?? {});

  const cleanup = useCallback(() => {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setState("stopped");
        cleanup();
      };

      recorder.start(100);
      setState("recording");
      setSecondsLeft(MAX_DURATION_SECONDS);

      // Countdown
      countdownRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch {
      setState("error");
      cleanup();
    }
  }, [isSupported, stopRecording, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState("idle");
    setSecondsLeft(MAX_DURATION_SECONDS);
    setAudioBlob(null);
  }, [cleanup]);

  return {
    state,
    secondsLeft,
    audioBlob,
    startRecording,
    stopRecording,
    reset,
    isSupported,
  };
}