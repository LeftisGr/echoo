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
  const [previousStage, setPreviousStage] = useState<UnlockStage | null>(null);
  const [visibleStage, setVisibleStage] = useState(stage);
  const [animateIn, setAnimateIn] = useState(true);

  useEffect(() => {
    if (stage === visibleStage) {
      return;
    }

    setPreviousStage(visibleStage);
    setVisibleStage(stage);
    setAnimateIn(false);

    const frame = window.requestAnimationFrame(() => {
      setAnimateIn(true);
    });

    const timeout = window.setTimeout(() => {
      setPreviousStage(null);
    }, 320);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [stage, visibleStage]);

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            chatOpen: "Chat is open",
            voiceOpen: "Voice is open",
            everythingOpen: "Everything is open",
            voiceNext: "Voice opens in",
            contentNext: "Content sharing opens in",
            nextUnlock: "Next unlock",
            finalSubtitle: "Voice and content sharing are available.",
          }
        : {
            chatOpen: "Το chat είναι ανοιχτό",
            voiceOpen: "Η φωνή είναι ανοιχτή",
            everythingOpen: "Όλα είναι ανοιχτά",
            voiceNext: "Η φωνή ανοίγει σε",
            contentNext: "Η κοινοποίηση περιεχομένου ανοίγει σε",
            nextUnlock: "Επόμενο άνοιγμα",
            finalSubtitle: "Η φωνή και η κοινοποίηση περιεχομένου είναι διαθέσιμες.",
          },
    [language],
  );

  const renderStage = (viewStage: UnlockStage, isActive: boolean) => {
    const isChat = viewStage === "chat";
    const isVoice = viewStage === "voice";
    const isFinal = viewStage === "content";

    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center transition-all duration-300 ease-out sm:px-5",
          isActive ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white/85">
          <span aria-hidden="true" className="text-base leading-none">
            {isChat ? "💬" : isVoice ? "🎤" : "✨"}
          </span>
          <span>{isChat ? copy.chatOpen : isVoice ? copy.voiceOpen : copy.everythingOpen}</span>
        </div>

        {isFinal ? (
          <p className="max-w-[17rem] text-xs leading-5 text-white/55 sm:text-sm">{copy.finalSubtitle}</p>
        ) : (
          <div className="w-full space-y-2.5">
            <div className="text-[0.66rem] font-medium uppercase tracking-[0.3em] text-white/45">
              {copy.nextUnlock}
            </div>

            <div className="flex items-center justify-center gap-2 text-sm font-medium text-white/70">
              <span aria-hidden="true" className="text-sm leading-none">
                {isChat ? "🎤" : "🖼"}
              </span>
              <span>{isChat ? copy.voiceNext : copy.contentNext}</span>
            </div>

            <div className="w-full text-[clamp(2.7rem,11vw,4.4rem)] font-semibold leading-none tracking-[0.04em] tabular-nums text-white">
              {timerLabel}
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-[width,opacity] duration-500 ease-out",
                  isChat ? "bg-white/35" : "bg-emerald-300/60",
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
      <div className="w-full max-w-[18rem] sm:max-w-[19rem]">
        <div className="relative mx-auto min-h-[8rem] w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 text-center shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm sm:px-5 sm:py-5">
          {previousStage && renderStage(previousStage, !animateIn)}
          {renderStage(visibleStage, animateIn)}
        </div>
      </div>
    </div>
  );
}
