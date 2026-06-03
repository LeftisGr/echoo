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
    }, 280);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [stage, visibleStage]);

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            voiceOpen: "Voice is open",
            everythingOpen: "Everything is open",
            voiceNext: "Voice opens in",
            contentNext: "Content sharing opens in",
            finalSubtitle: "Voice and content sharing are available.",
          }
        : {
            voiceOpen: "Η φωνή είναι ανοιχτή",
            everythingOpen: "Όλα είναι ανοιχτά",
            voiceNext: "Η φωνή ανοίγει σε",
            contentNext: "Η κοινοποίηση περιεχομένου ανοίγει σε",
            finalSubtitle: "Η φωνή και η κοινοποίηση περιεχομένου είναι διαθέσιμες.",
          },
    [language],
  );

  const renderStage = (viewStage: UnlockStage, isActive: boolean) => {
    const isVoice = viewStage === "voice";
    const isFinal = viewStage === "content";
    const title = isVoice ? copy.voiceOpen : copy.everythingOpen;
    const nextLabel = isVoice ? copy.contentNext : null;
    const timerTone = isVoice ? "text-emerald-50" : "text-white";

    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center transition-all duration-300 ease-out sm:px-5",
          isActive ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        {isVoice ? (
          <div className="flex items-center gap-2 text-sm font-medium text-white/88 sm:text-base">
            <span aria-hidden="true" className="text-base leading-none">
              🎤
            </span>
            <span>{title}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-violet-50 sm:text-base">
            <span aria-hidden="true" className="text-base leading-none">
              ✨
            </span>
            <span>{title}</span>
          </div>
        )}

        {isFinal ? (
          <p className="max-w-[18rem] text-sm leading-6 text-white/60 sm:text-[0.95rem]">{copy.finalSubtitle}</p>
        ) : (
          <div className="w-full space-y-2.5 pt-1">
            <div className={cn("w-full text-[clamp(2.4rem,10vw,3.6rem)] font-semibold leading-none tracking-[0.02em] tabular-nums", timerTone)}>
              {timerLabel}
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-[width,opacity] duration-500 ease-out",
                  isVoice ? "bg-emerald-300/70" : "bg-violet-300/70",
                )}
                style={{ width: `${Math.max(0, Math.min(100, timerProgress))}%` }}
              />
            </div>

            {nextLabel && (
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-white/62 sm:text-sm">
                <span aria-hidden="true" className="text-sm leading-none">
                  🖼
                </span>
                <span>{nextLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-full justify-center">
      <div className="shrink-0" style={{ width: "min(20rem, calc(100vw - 1.5rem))" }}>
        <div className="relative mx-auto min-h-[8.5rem] w-full overflow-visible px-2 py-2 text-center">
          {previousStage && renderStage(previousStage, !animateIn)}
          {renderStage(visibleStage, animateIn)}
        </div>
      </div>
    </div>
  );
}
