import { Camera, Check, ImagePlus, Play, X } from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface MediaComposerProps {
  enabled: boolean;
  onSendMedia: (input: { file: File; caption: string; preview: MediaPreviewData }) => Promise<void>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaComposer({ enabled, onSendMedia }: MediaComposerProps) {
  const { language, copy } = usePresence();

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const cooldownRef = useRef(0);
  const sendCountRef = useRef(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaPreviewData | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSelectedMedia(null);
      setCaption("");
      setError(null);
      setBusy(false);
    }
  }, [enabled]);

  const helperText = useMemo(() => {
    if (!selectedMedia) {
      return language === "en"
        ? `Photos are compressed locally. Audio clips are limited to ${formatBytes(12 * 1024 * 1024)}.`
        : `Οι φωτογραφίες συμπιέζονται τοπικά. Τα ηχητικά περιορίζονται στα ${formatBytes(12 * 1024 * 1024)}.`;

    }

    if (selectedMedia.kind === "image") {
      return language === "en"
        ? `Photos are compressed locally and limited to ${formatBytes(MAX_IMAGE_SIZE_BYTES)} before sending.`
        : `Οι φωτογραφίες συμπιέζονται τοπικά και περιορίζονται στα ${formatBytes(MAX_IMAGE_SIZE_BYTES)} πριν σταλούν.`;
    }

    return selectedMedia.kind === "audio"
      ? language === "en"
        ? `Short audio only, up to ${formatBytes(12 * 1024 * 1024)}.`
        : `Μόνο σύντομα ηχητικά, έως ${formatBytes(12 * 1024 * 1024)}.`
      : language === "en"
        ? `Short videos only, up to ${MAX_VIDEO_DURATION_SECONDS}s and ${formatBytes(MAX_VIDEO_SIZE_BYTES)}.`
        : `Μόνο σύντομα βίντεο, έως ${MAX_VIDEO_DURATION_SECONDS}s και ${formatBytes(MAX_VIDEO_SIZE_BYTES)}.`;

  }, [language, selectedMedia]);

  const handleFileSelected = async (file: File) => {
    setError(null);

    if (!enabled || !file) {
      return;
    }

    if (!file.type) {
      setError(copyError("unsupported"));
      return;
    }

    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(language === "en" ? "That photo is too large." : "Η φωτογραφία είναι πολύ μεγάλη.");
      return;
    }

    if (file.type.startsWith("audio/") && file.size > 12 * 1024 * 1024) {
      setError(language === "en" ? "That audio is too large." : "Το ηχητικό είναι πολύ μεγάλο.");
      return;
    }

    if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE_BYTES) {
      setError(language === "en" ? "That video is too large." : "Το βίντεο είναι πολύ μεγάλο.");
      return;
    }

    try {
      const prepared = await prepareMediaUpload(file);

      if (prepared.kind === "video" && (prepared.durationSeconds ?? 0) > MAX_VIDEO_DURATION_SECONDS) {
        setError(language === "en" ? "That video is longer than the limit." : "Το βίντεο ξεπερνά το επιτρεπτό όριο.");
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
    } catch {
      setError(language === "en" ? "We couldn’t read that file." : "Δεν ήταν δυνατή η ανάγνωση του αρχείου.");
    }
  };

  const resetSelection = () => {
    if (selectedMedia?.previewUrl) {
      URL.revokeObjectURL(selectedMedia.previewUrl);
    }

    setSelectedMedia(null);
    setCaption("");
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (selectedMedia?.previewUrl) {
        URL.revokeObjectURL(selectedMedia.previewUrl);
      }
    };
  }, [selectedMedia?.previewUrl]);

  const sendSelectedMedia = async () => {
    if (!selectedMedia || busy) {
      return;
    }

    const now = Date.now();
    if (cooldownRef.current && now - cooldownRef.current < MEDIA_UPLOAD_COOLDOWN_MS) {
      setError(language === "en" ? "Please wait a moment before sharing again." : "Περίμενε λίγο πριν μοιραστείς ξανά.");
      return;
    }

    if (sendCountRef.current >= MAX_MEDIA_MESSAGES_PER_SESSION) {
      setError(language === "en" ? "You’ve reached the media limit for this moment." : "Έφτασες το όριο media για αυτό το moment.");
      return;
    }

    setBusy(true);
    try {
      await onSendMedia({
        file: selectedMedia.file,
        caption: caption.trim(),
        preview: selectedMedia,
      });
      cooldownRef.current = Date.now();
      sendCountRef.current += 1;
      resetSelection();
    } catch {
      setError(language === "en" ? copyError("upload") : "Η αποστολή απέτυχε.");
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[24px] border border-amber-300/15 bg-amber-500/8 p-4 shadow-[0_16px_45px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-amber-100/65">
            {language === "en" ? "Share a moment" : "Μοιράσου ένα moment"}
          </p>
          <p className="mt-1 text-sm leading-6 text-white/70">{copy.session.mediaHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white" onClick={() => imageInputRef.current?.click()}>
            <ImagePlus className="mr-2 h-4 w-4" />
            {language === "en" ? "Photo" : "Φωτο"}
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white" onClick={() => audioInputRef.current?.click()}>
            <Play className="mr-2 h-4 w-4" />
            {language === "en" ? "Audio" : "Ήχος"}
          </Button>

          <Button type="button" variant="outline" className="h-10 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white" onClick={() => imageInputRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            {language === "en" ? "Camera" : "Κάμερα"}
          </Button>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
          await handleFileSelected(file);
        }
      }} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
          await handleFileSelected(file);
        }
      }} />

      <p className="text-xs leading-6 text-white/45">{helperText}</p>

      {error && <p className="rounded-[18px] border border-rose-400/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">{error}</p>}

      {selectedMedia && (
        <div className="space-y-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <div className="relative min-h-[96px] w-24 overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:w-28">
              {selectedMedia.kind === "image" ? (
                <img src={selectedMedia.previewUrl} alt={selectedMedia.displayName} className="h-full w-full object-cover" />
              ) : selectedMedia.kind === "audio" ? (
                <div className="flex h-full w-full items-center justify-center bg-sky-500/10 text-sky-100">
                  <Play className="h-6 w-6" />
                </div>
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
                      : selectedMedia.kind === "audio"
                        ? `${formatBytes(selectedMedia.size)} · ${selectedMedia.durationSeconds ?? 0}s audio`
                        : `${formatBytes(selectedMedia.size)} · ${selectedMedia.durationSeconds ?? 0}s`}
                  </p>

                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full text-white/60 hover:bg-white/10 hover:text-white" onClick={resetSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder={language === "en" ? "Add a short note (optional)" : "Πρόσθεσε μια σύντομη σημείωση (προαιρετικό)"} className="h-11 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/35" maxLength={180} />

            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-11 rounded-full bg-violet-500 px-5 text-white transition-transform duration-150 active:scale-95 hover:bg-violet-400"
              disabled={busy}
              onClick={() => {
                void sendSelectedMedia();
              }}
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-white/80" />
                  {language === "en" ? "Sharing..." : "Μοιράζεται..."}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {language === "en" ? "Share a moment" : "Μοιράσου ένα moment"}
                </span>
              )}

            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function copyError(kind: "unsupported" | "upload") {
  return kind === "unsupported" ? "That file type isn’t supported." : "We couldn’t share that right now.";
}
