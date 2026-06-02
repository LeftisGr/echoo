import { useEffect, useRef } from "react";

import { Progress } from "@/components/ui/progress";
import type { AppLanguage } from "@/lib/presence-types";
import type { SessionPhase } from "@/lib/session-progression";
import SessionFreeConversationState from "@/components/session/session-free-conversation-state";
import { cn } from "@/lib/utils";

export function SessionProgressHeader({
  phase,
  timerLabel,
  timerProgress,
  toneClassName,
  language,
  sessionComplete,
}: {
  phase: SessionPhase;
  timerLabel: string;
  timerProgress: number;
  toneClassName: string;
  language: AppLanguage;
  sessionComplete: boolean;
}) {
  const lastVisibleTimerLabelRef = useRef(timerLabel);

  useEffect(() => {
    if (!sessionComplete && timerLabel !== "00:00") {
      lastVisibleTimerLabelRef.current = timerLabel;
    }
  }, [sessionComplete, timerLabel]);

  const visibleTimerLabel = lastVisibleTimerLabelRef.current;

  return (
    <div className="relative z-20 flex min-h-[5.75rem] w-full items-center justify-start text-left">
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-start transition-all duration-300 ease-out",
          sessionComplete ? "pointer-events-none translate-y-1 opacity-0" : "opacity-100",
        )}
      >
        <div className="flex w-full max-w-[12rem] flex-col items-start gap-3 sm:max-w-[13rem] lg:max-w-[14rem]">
          <div
            className={cn(
              "w-full text-3xl font-semibold leading-none tracking-[0.08em] tabular-nums transition-all duration-300 sm:text-4xl lg:text-5xl",
              toneClassName,
            )}
          >
            {visibleTimerLabel}
          </div>
          <Progress value={timerProgress} className="h-2 w-full rounded-full bg-white/10" />
        </div>
      </div>

      <div
        className={cn(
          "relative z-20 transition-all duration-300 ease-out",
          sessionComplete ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <SessionFreeConversationState />
      </div>
    </div>
  );

}
