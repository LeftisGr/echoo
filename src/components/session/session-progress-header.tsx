import { useMemo } from "react";

import type { AppLanguage } from "@/lib/presence-types";
import { cn } from "@/lib/utils";

export function SessionProgressHeader({
  timerLabel,
  timerProgress,
  toneClassName,
  language,
  voiceUnlocked,
}: {
  timerLabel: string;
  timerProgress: number;
  toneClassName: string;
  language: AppLanguage;
  voiceUnlocked: boolean;
}) {
  const isUnlocked = voiceUnlocked || timerLabel === "00:00";

  const copy = useMemo(
    () =>
      language === "en"
        ? {
            label: "Voice opens in",
            open: "Voice is open",
          }
        : {
            label: "Η φωνή ανοίγει σε",
            open: "Η φωνή άνοιξε",
          },
    [language],
  );

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[13rem] sm:max-w-[14rem]">
        <div className="relative mx-auto min-h-[7rem] w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 text-center shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm sm:px-5 sm:py-5">
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center transition-all duration-300 ease-out sm:px-5",
              isUnlocked ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            <div className="text-[0.68rem] font-medium uppercase tracking-[0.32em] text-white/55">
              {copy.label}
            </div>

            <div
              className={cn(
                "w-full text-[clamp(2.8rem,11vw,4.4rem)] font-semibold leading-none tracking-[0.04em] tabular-nums",
                toneClassName,
              )}
            >
              {timerLabel}
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-white/35 transition-[width,opacity] duration-500 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, timerProgress))}%` }}
              />
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out",
              isUnlocked ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
            )}
          >
            <div className="flex items-center justify-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-4 py-3 text-sm font-medium text-emerald-50 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <span aria-hidden="true" className="text-base leading-none">
                🎤
              </span>
              <span>{copy.open}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
