import { useEffect, useMemo, useRef, useState } from "react";

import { Check, ImagePlus, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";
import { getRoomFeedbackNote, getRoomFeedbackPrompt, getRoomFeedbackTitle, submitRoomFeedback } from "@/lib/room-feedback";
import type { AppLanguage, RatingScore } from "@/lib/presence-types";

interface RoomFeedbackCardProps {
  roomId: string;
  roomState: string;
  rating: RatingScore | null | undefined;
  language: AppLanguage;
  userType: string;
}

const ratingLabels: Record<RatingScore, { en: string; el: string }> = {
  good: { en: "Good", el: "Καλό" },
  neutral: { en: "Okay", el: "Οκ" },
  bad: { en: "Bad", el: "Κακό" },
};

export function RoomFeedbackCard({ roomId, roomState, rating, language, userType }: RoomFeedbackCardProps) {
  const [message, setMessage] = useState("");
  const [includeDebug, setIncludeDebug] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);

  const selectedRating = rating ?? null;
  const prompt = useMemo(() => (selectedRating ? getRoomFeedbackPrompt(selectedRating, language) : null), [language, selectedRating]);
  const title = useMemo(() => (selectedRating ? getRoomFeedbackTitle(selectedRating, language) : null), [language, selectedRating]);
  const note = getRoomFeedbackNote(language);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!screenshot) {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
        setScreenshotPreview(null);
      }
      return;
    }

    const previewUrl = URL.createObjectURL(screenshot);
    setScreenshotPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [screenshot]);

  useEffect(() => {
    setMessage("");
    setIncludeDebug(false);
    setScreenshot(null);
    setSubmitError(null);
    setSubmitted(false);
  }, [selectedRating]);

  const clearScreenshot = () => {
    setScreenshot(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedRating || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitRoomFeedback({
        roomId,
        rating: selectedRating,
        message,
        includeDebug,
        screenshot,
        userType,
        roomState,
      });

      if (!isMountedRef.current) {
        return;
      }

      setSubmitted(true);
      setMessage("");
      setIncludeDebug(false);
      clearScreenshot();
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setSubmitError(error instanceof Error ? error.message : language === "en" ? "Could not send feedback." : "Δεν ήταν δυνατή η αποστολή του feedback.");
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (!selectedRating) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#0d1425] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-200" />
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{language === "en" ? "Feedback" : "Feedback"}</p>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
          <p className="max-w-2xl text-sm leading-6 text-white/55">{note}</p>
        </div>

        <Badge className={cn("h-fit rounded-full border px-3 py-1 text-[11px] font-medium", selectedRating === "good" ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-50" : selectedRating === "neutral" ? "border-amber-300/20 bg-amber-500/10 text-amber-50" : "border-rose-300/20 bg-rose-500/10 text-rose-50")}>{language === "en" ? ratingLabels[selectedRating].en : ratingLabels[selectedRating].el}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={prompt ?? ""}
          className="min-h-28 rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/35"
          maxLength={1200}
        />

        <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                {language === "en" ? "Add screenshot" : "Προσθήκη screenshot"}
              </Button>
              <span className="text-xs text-white/45">{language === "en" ? "One image only" : "Μόνο μία εικόνα"}</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                setScreenshot(file);
                setSubmitError(null);
              }}
            />

            {screenshotPreview && screenshot && (
              <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#0b1220] p-2">
                <img src={screenshotPreview} alt={screenshot.name} className="h-16 w-16 rounded-[16px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{screenshot.name}</p>
                  <p className="text-xs text-white/45">{Math.max(1, Math.round(screenshot.size / 1024))} KB</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/60 hover:bg-white/10 hover:text-white" onClick={clearScreenshot}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-[#0b1220] px-3 py-3 sm:max-w-[320px]">
            <Checkbox checked={includeDebug} onCheckedChange={(checked) => setIncludeDebug(Boolean(checked))} className="mt-0.5 border-white/20 data-[state=checked]:border-violet-300/40 data-[state=checked]:bg-violet-500 data-[state=checked]:text-white" />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-white">{language === "en" ? "Include technical details" : "Συμπερίληψη τεχνικών στοιχείων"}</span>
              <span className="block text-xs leading-5 text-white/50">{language === "en" ? "Browser, device, and room state." : "Browser, συσκευή και κατάσταση room."}</span>
            </span>
          </label>
        </div>

        {submitError && <div className="rounded-[20px] border border-rose-300/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">{submitError}</div>}

        {submitted && !submitError && (
          <div className="rounded-[20px] border border-emerald-300/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
            <Check className="mr-2 inline-block h-4 w-4 align-[-0.125em]" />
            {language === "en" ? "Thanks — your feedback was saved." : "Ευχαριστούμε — το feedback αποθηκεύτηκε."}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? (language === "en" ? "Sending..." : "Αποστολή...") : (language === "en" ? "Send feedback" : "Αποστολή feedback")}
          </Button>
          <p className="text-xs leading-5 text-white/45">
            {language === "en" ? "This stays separate from leaving the room." : "Αυτό μένει ξεχωριστό από την έξοδο από το room."}
          </p>
        </div>
      </div>
    </div>
  );
}
