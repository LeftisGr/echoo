import { useCallback, useEffect, useRef, useState } from "react";

import { Heart, Mic, MicOff, Phone, Play, SkipForward, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import {
  extendBrokenTelephone,
  fetchActiveBrokenTelephone,
  getPlaybackUrl,
  submitBrokenTelephone,
  type BrokenTelephoneMessage,
} from "@/lib/broken-telephone";
import { cn } from "@/lib/utils";
import type { AppLanguage } from "@/lib/presence-types";

interface BrokenTelephoneModalProps {
  userId: string;
  language: AppLanguage;
  onClose: () => void;
}

export function BrokenTelephoneModal({ userId, language, onClose }: BrokenTelephoneModalProps) {
  const [activeMessage, setActiveMessage] = useState<BrokenTelephoneMessage | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recorder = useAudioRecorder();

  // Φόρτωσε active μήνυμα
  useEffect(() => {
    void fetchActiveBrokenTelephone().then(async (msg) => {
      
      
      if (!msg) return;
      setActiveMessage(msg);
      // Restore "already liked" state for this specific message.
      try {
        if (window.localStorage.getItem(`echoo-bt-liked-${msg.id}`) === "1") {
          setHearted(true);
        }
      } catch {
        // Ignore storage access issues (private mode, etc.)
      }
      const url = await getPlaybackUrl(msg.audioPath, msg.audioBucket);

      setPlaybackUrl(url);
    });
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      recorder.reset();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (!playbackUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(playbackUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    await audio.play();
  }, [playbackUrl]);

  // ❤️ Δώσε +24h ζωής στο μήνυμα (μία φορά ανά μήνυμα)
  const handleLike = useCallback(async () => {
    if (!activeMessage || hearted || isLiking) return;
    setIsLiking(true);
    const success = await extendBrokenTelephone(activeMessage.id);
    setIsLiking(false);
    if (success) {
      setHearted(true);
      try {
        window.localStorage.setItem(`echoo-bt-liked-${activeMessage.id}`, "1");
      } catch {
        // Ignore storage access issues.
      }
      toast.success(
        language === "en"
          ? "You gave this message +24 more hours 💜"
          : "Έδωσες +24 ώρες ζωής σε αυτό το μήνυμα 💜",
      );
    }
  }, [activeMessage, hearted, isLiking, language]);

  const handleSubmit = useCallback(async () => {
    if (!recorder.audioBlob) return;
    setIsSubmitting(true);
    const success = await submitBrokenTelephone(
      recorder.audioBlob,
      (15 - recorder.secondsLeft),
      userId,
    );
    setIsSubmitting(false);
    if (success) {
      setSubmitted(true);
      setTimeout(() => onClose(), 1500);
    }
  }, [recorder.audioBlob, recorder.secondsLeft, userId, onClose]);

  const copy = {
    title: language === "en" ? "Broken Telephone" : "Σπασμένο Τηλέφωνο",
    subtitle: language === "en"
      ? "Leave a short voice message for the next person waiting alone."
      : "Άφησε ένα σύντομο φωνητικό για τον επόμενο που περιμένει μόνος.",
    hasMessage: language === "en"
      ? "Someone left a message before you"
      : "Κάποιος άφησε μήνυμα πριν από σένα",
    record: language === "en" ? "Hold to record" : "Πάτα για ηχογράφηση",
    recording: language === "en" ? "Recording..." : "Ηχογράφηση...",
    recorded: language === "en" ? "Message ready" : "Μήνυμα έτοιμο",
    send: language === "en" ? "Send & Leave" : "Στείλε & Φύγε",
    skip: language === "en" ? "Skip" : "Παράλειψη",
    sending: language === "en" ? "Sending..." : "Αποστολή...",
    sent: language === "en" ? "Message sent ✓" : "Εστάλη ✓",
    noMic: language === "en" ? "Microphone not available" : "Το μικρόφωνο δεν είναι διαθέσιμο",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050814]/88 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.22),transparent_55%)] opacity-90" />

      <div className="relative mx-auto w-full max-w-md px-6 text-center">

        {/* Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(168,85,247,0.2)]">
          <Phone className="h-8 w-8 text-violet-200" />
        </div>

        {/* Title */}
        <p className="text-xs uppercase tracking-[0.32em] text-white/45">Echoo</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/65">
          {copy.subtitle}
        </p>

        {/* Play previous message */}
        {activeMessage && playbackUrl && !submitted && (
          <div className="mt-5 flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => { void handlePlay(); }}
              disabled={isPlaying}
              className="flex-1 rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-left transition hover:bg-violet-500/15"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-violet-200/60">
                {copy.hasMessage}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border",
                  isPlaying
                    ? "border-violet-300/30 bg-violet-500/20 text-violet-200"
                    : "border-white/15 bg-white/5 text-white/60"
                )}>
                  <Play className="h-4 w-4" />
                </div>
                <div className="text-sm text-white/70">
                  {activeMessage.durationSeconds}s · {isPlaying
                    ? (language === "en" ? "Playing..." : "Παίζει...")
                    : (language === "en" ? "Tap to listen" : "Πάτα για ακρόαση")}
                </div>
              </div>
            </button>

            {/* ❤️ Extend message life by 24h */}
            <button
              type="button"
              onClick={() => { void handleLike(); }}
              disabled={hearted || isLiking}
              aria-label={language === "en" ? "Give this message 24 more hours" : "Δώσε 24 ώρες ζωής ακόμα σε αυτό το μήνυμα"}
              title={language === "en" ? "Give +24 hours" : "Δώσε +24 ώρες"}
              className={cn(
                "flex w-14 shrink-0 items-center justify-center rounded-2xl border transition",
                hearted
                  ? "border-rose-400/30 bg-rose-500/20 text-rose-300"
                  : "border-rose-300/20 bg-rose-500/10 text-rose-200/80 hover:bg-rose-500/20 disabled:opacity-60",
              )}
            >
              <Heart className="h-5 w-5" fill={hearted ? "currentColor" : "none"} />
            </button>
          </div>
        )}

        {/* Recording area */}
        {!submitted && (
          <div className="mt-6 space-y-4">
            {!recorder.isSupported ? (
              <div className="flex items-center justify-center gap-2 text-sm text-white/45">
                <MicOff className="h-4 w-4" />
                {copy.noMic}
              </div>
            ) : (
              <>
                {/* Record button */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (recorder.state === "recording") {
                        recorder.stopRecording();
                      } else if (recorder.state === "idle") {
                        void recorder.startRecording();
                      } else if (recorder.state === "stopped") {
                        recorder.reset();
                      }
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-200",
                      recorder.state === "recording"
                        ? "border-rose-400/30 bg-rose-500/20 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                        : recorder.state === "stopped"
                          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                          : "border-violet-300/25 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                    )}
                  >
                    {recorder.state === "recording"
                      ? <Square className="h-6 w-6" />
                      : <Mic className="h-6 w-6" />}
                  </button>

                  <p className="text-xs text-white/45">
                    {recorder.state === "recording"
                      ? `${recorder.secondsLeft}s — ${copy.recording}`
                      : recorder.state === "stopped"
                        ? copy.recorded
                        : copy.record}
                  </p>
                </div>

                {/* Send / Skip buttons */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    {copy.skip}
                  </Button>

                  {recorder.state === "stopped" && (
                    <Button
                      type="button"
                      className="h-11 flex-1 rounded-full bg-violet-500 text-white hover:bg-violet-400"
                      onClick={() => { void handleSubmit(); }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? copy.sending : copy.send}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Success state */}
        {submitted && (
          <div className="mt-6 text-sm font-medium text-emerald-300">
            {copy.sent}
          </div>
        )}
      </div>
    </div>
  );
}