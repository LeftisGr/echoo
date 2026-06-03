import { useEffect, useMemo, useState } from "react";

import type { AppLanguage } from "@/lib/presence-types";
import { cn } from "@/lib/utils";

export type UnlockStage = "chat" | "voice" | "content";

export function UnlockProgress({
  stage,
  timerLabel,
  timerProgress,
  language,
}: {
  stage: UnlockStage;
  timerLabel: string;
  timerProgress: number;
  language: AppLanguage;
}) {
  const [displayStage, setDisplayStage] = useState(stage);
  const [previousStage, setPreviousStage] = useState<UnlockStage | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (stage === displayStage) {
      return;
    }

    setPreviousStage(displayStage);
    setDisplayStage(stage);
    setAnimate(false);

    const frame = window.requestAnimationFrame(() => {
      setAnimate(true);
    });

    const timeout = window.setTimeout(() => {
      setPreviousStage(null);
    }, 320);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [displayStage, stage]);

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            chatOpen: "Chat is open",
            voiceOpen: "Voice is open",
            contentOpen: "Content sharing is open",
            everythingOpen: "Everything is open",
            voiceNext: "Voice opens in",
            contentNext: "Content sharing opens in",
            nextUnlock: "Next unlock",
            finalSubtitle: "Voice and content sharing are available.",
          }
        : {
            chatOpen: "Το chat είναι ανοιχτό",
            voiceOpen: "Η φωνή είναι ανοιχτή",
            contentOpen: "Η κοινοποίηση περιεχομένου είναι ανοιχτή",
            everythingOpen: "Όλα είναι ανοιχτά",
            voiceNext: "Η φωνή ανοίγει σε",
            contentNext: "Η κοινοποίηση περιεχομένου ανοίγει σε",
            nextUnlock: "Επόμενο άνοιγμα",
            finalSubtitle: "Η φωνή και η κοινοποίηση περιεχομένου είναι διαθέσιμες.",
          },
    [language],
  );

  const renderStage = (viewStage: UnlockStage, active: boolean) => {
    const isChat = viewStage === "chat";
    const isVoice = viewStage === "voice";
    const isFinal = viewStage === "content";

    const statusLabel = isChat ? copy.chatOpen : isVoice ? copy.voiceOpen : copy.everythingOpen;
    const emoji = isChat ? "💬" : isVoice ? "🎤" : "✨";
    const badgeClass = isChat
      ? "border-white/10 bg-white/5 text-white/80"
      : isVoice
        ? "border-emerald-300/15 bg-emerald-300/10 text-emerald-50"
        : "border-violet-300/15 bg-violet-300/10 text-violet-50";

    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center transition-all duration-300 ease-out sm:px-5",
          active ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <div
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
            badgeClass,
          )}
        >
          <span aria-hidden="true" className="text-base leading-none">
            {emoji}
          </span>
          <span>{statusLabel}</span>
        </div>

        {isFinal ? (
          <p className="max-w-[16rem] text-xs leading-5 text-white/52 sm:text-[0.82rem]">{copy.finalSubtitle}</p>
        ) : (
          <div className="w-full space-y-2">
            <div className="text-[0.66rem] font-medium uppercase tracking-[0.3em] text-white/45">{copy.nextUnlock}</div>

            <div className="flex items-center justify-center gap-2 text-[0.78rem] font-medium text-white/75">
              <span aria-hidden="true" className="text-sm leading-none">
                {isChat ? "🎤" : "🖼"}
              </span>
              <span>{isChat ? copy.voiceNext : copy.contentNext}</span>
            </div>

            <div
              className={cn(
                "w-full text-[clamp(2.6rem,11vw,4.1rem)] font-semibold leading-none tracking-[0.04em] tabular-nums",
                isChat ? "text-white" : "text-emerald-50",
              )}
            >
              {timerLabel}
            </div>

            <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/7">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-[width,opacity] duration-500 ease-out",
                  isChat ? "bg-white/28" : "bg-emerald-300/55",
                )}
                style={{ width: `${Math.max(0, Math.min(100, timerProgress))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[16rem] sm:max-w-[17rem]">
        <div className="relative mx-auto min-h-[7.25rem] w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 text-center shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm sm:px-5 sm:py-5">
          {previousStage && renderStage(previousStage, animate)}
          {renderStage(displayStage, !previousStage || animate)}
        </div>
      </div>
    </div>
  );
}
