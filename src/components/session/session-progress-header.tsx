import { Progress } from "@/components/ui/progress";
import type { AppLanguage } from "@/lib/presence-types";
import type { SessionPhase } from "@/lib/session-progression";
import { SessionPhaseBadge } from "@/components/session/session-phase-badge";
import { SessionFreeConversationState } from "@/components/session/session-free-conversation-state";
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
  return (
    <div className="space-y-3 text-center">
      <SessionPhaseBadge phase={phase} language={language} />
      {sessionComplete ? (
        <div className="animate-[echo-message-in_260ms_ease-out]">
          <SessionFreeConversationState language={language} />
        </div>
      ) : (
        <div className={cn("text-3xl font-semibold tracking-tight transition-all duration-300 sm:text-4xl", toneClassName)}>{timerLabel}</div>
      )}
      {!sessionComplete && <Progress value={timerProgress} className="h-1.5 rounded-full bg-white/10" />}
    </div>
  );
}
