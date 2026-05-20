import { Camera, Check, ImagePlus, Film, X } from "lucide-react";
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
  const { language } = usePresence();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
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

  const canSend = Boolean(selectedMedia) && !busy;

  const helperText = useMemo(() => {
    if (!selectedMedia) {
      return language === "en"
        ? `Images are compressed locally. Videos are capped at ${MAX_VIDEO_DURATION_SECONDS}s and ${formatBytes(MAX_VIDEO_SIZE_BYTES)}.`
        : `Οι εικόνες συμπιέζονται τοπικά. Τα βίντεο περιορίζονται στα ${MAX_VIDEO_DURATION_SECONDS}s και ${formatBytes(MAX_VIDEO_SIZE_BYTES)}.`;
    }

    if (selectedMedia.kind === "image") {
      return language === "en"
        ? `Images are compressed locally and limited to ${formatBytes(MAX_IMAGE_SIZE_BYTES)} before sending.`
        : `Οι εικόνες συμπιέζονται τοπικά και περιορίζονται στα ${formatBytes(MAX_IMAGE_SIZE_BYTES)} πριν σταλούν.`;
    }

    return language === "en"
      ? `Short videos only, up to ${MAX_VIDEO_DURATION_SECONDS}s and ${formatBytes(MAX_VIDEO_SIZE_BYTES)}.`
      : `Μόνο σύντομα βίντεο, έως ${MAX_VIDEO_DURATION_SECONDS}s και ${formatBytes(MAX_VIDEO_SIZE_BYTES)}.`;
  }, [language, selectedMedia]);

  const handleFileSelected = async (file: File) => {
    setError(null);

    if (!enabled) {
      return;
    }

    if (!file) {
      return;
    }

    if (!file.type) {
      setError(language === "en" ? "Unsupported file type." : "Μη υποστηριζόμενος τύπος αρχείου.");
      return;
    }

    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(language === "en" ? "Image is too large." : "Η εικόνα είναι πολύ μεγάλη.");
      return;
    }

    if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE_BYTES) {
      setError(language === "en" ? "Video is too large." : "Το βίντεο είναι πολύ μεγάλο.");
      return;
    }

    try {
      const prepared = await prepareMediaUpload(file);

      if (prepared.kind === "video" && (prepared.durationSeconds ?? 0) > MAX_VIDEO_DURATION_SECONDS) {
        setError(language === "en" ? "Video is longer than the allowed limit." : "Το βίντεο ξεπερνά το επιτρεπτό όριο.");
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

    } catch (mediaError) {
      setError(mediaError instanceof Error ? mediaError.message : language === "en" ? "Could not read the file." : "Δεν ήταν δυνατή η ανάγνωση του αρχείου.");
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
      setError(language === "en" ? "Please wait a moment before sending another media item." : "Περίμενε λίγο πριν στείλεις άλλο media.");
      return;
    }

    if (sendCountRef.current >= MAX_MEDIA_MESSAGES_PER_SESSION) {
      setError(language === "en" ? "Media sharing limit reached for this session." : "Έφτασες το όριο media για αυτό το session.");
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
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : language === "en" ? "Upload failed." : "Η αποστολή απέτυχε.");
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
            {language === "en" ? "Media sharing unlocked" : "Το media sharing ξεκλείδωσε"}
          </p>
          <p className="mt-1 text-sm leading-6 text-white/70">
            {language === "en"
              ? "Share one photo or a short clip when the conversation feels earned."
              : "Στείλε μία φωτογραφία ή ένα σύντομο βίντεο όταν η κουβέντα το έχει κερδίσει."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {language === "en" ? "Photo" : "Φωτο"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white"
            onClick={() => videoInputRef.current?.click()}
          >
            <Film className="mr-2 h-4 w-4" />
            {language === "en" ? "Video" : "Βίντεο"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white"
            onClick={() => imageInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            {language === "en" ? "Camera" : "Κάμερα"}
          </Button>
        </div>
      </div>

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
            await handleFileSelected(file);
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
            await handleFileSelected(file);
          }
        }}
      />

      {selectedMedia ? (
        <div className="space-y-3 rounded-[22px] border border-white/10 bg-[#0d1425] p-3">
          <div className="flex items-start gap-3">
            <div className="relative min-h-[96px] w-24 overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:w-28">
              {selectedMedia.kind === "image" ? (
                <img src={selectedMedia.previewUrl} alt={selectedMedia.displayName} className="h-full w-full object-cover" />
              ) : (
                <video src={selectedMedia.previewUrl} controls playsInline controlsList="nodownload noplaybackrate" className="h-full w-full object-cover" />
              )}

            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{selectedMedia.displayName}</p>
                  <p className="text-xs text-white/45">
                    {selectedMedia.kind === "image"
                      ? `${formatBytes(selectedMedia.size)} · ${selectedMedia.width ?? 0}×${selectedMedia.height ?? 0}`
                      : `${formatBytes(selectedMedia.size)} · ${selectedMedia.durationSeconds ?? 0}s`}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/60 hover:bg-white/10 hover:text-white" onClick={resetSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder={language === "en" ? "Add a short caption (optional)" : "Πρόσθεσε λεζάντα (προαιρετικό)"}
                className="h-11 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/35"
                maxLength={180}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400"
              disabled={!canSend}
              onClick={() => {
                void sendSelectedMedia();
              }}
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-white/80" />
                  {language === "en" ? "Sending..." : "Αποστολή..."}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {language === "en" ? "Send media" : "Αποστολή media"}
                </span>
              )}
            </Button>
            <div className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-white/50">
              {helperText}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/55">
          <p>{language === "en" ? "Choose a photo or short video to send after the conversation has warmed up." : "Επίλεξε μια φωτογραφία ή ένα σύντομο βίντεο για να το στείλεις όταν η κουβέντα έχει ζεστάνει."}</p>
        </div>
      )}

      {error && <p className="text-sm text-rose-200">{error}</p>}
    </div>
  );
}
