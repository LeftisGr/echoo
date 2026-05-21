import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SessionPhase } from "@/lib/session-progression";
import { SessionPhaseBadge } from "@/components/session/session-phase-badge";

export function SessionProgressHeader({
  phase,
  timerLabel,
  timerProgress,
  toneClassName,
}: {
  phase: SessionPhase;
  timerLabel: string;
  timerProgress: number;
  toneClassName: string;
}) {
  return (
    <div className="space-y-3 text-center">
      <SessionPhaseBadge phase={phase} />
      <div className={cn("text-3xl font-semibold tracking-tight sm:text-4xl", toneClassName)}>{timerLabel}</div>
      <Progress value={timerProgress} className="h-1.5 rounded-full bg-white/10" />
    </div>
  );
}
