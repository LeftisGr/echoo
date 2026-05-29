import { useEffect, useRef } from "react";

import { Progress } from "@/components/ui/progress";
import type { AppLanguage } from "@/lib/presence-types";
import type { SessionPhase } from "@/lib/session-progression";
import { SessionPhaseBadge } from "@/components/session/session-phase-badge";
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
    <div className="relative min-h-[6.5rem] text-center">
      <div
        className={cn(
          "space-y-2 transition-all duration-300 ease-out",
          sessionComplete ? "pointer-events-none absolute inset-0 translate-y-1 opacity-0" : "opacity-100",
        )}
      >
        <SessionPhaseBadge phase={phase} language={language} />
        <div className={cn("text-2xl font-semibold tracking-tight transition-all duration-300 sm:text-[2rem]", toneClassName)}>{visibleTimerLabel}</div>
        <Progress value={timerProgress} className="h-1 rounded-full bg-white/10" />
      </div>

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out",
          sessionComplete ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <SessionFreeConversationState language={language} className="w-full" />
      </div>
    </div>
  );
}
