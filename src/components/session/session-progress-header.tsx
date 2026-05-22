import { Progress } from "@/components/ui/progress";
import type { AppLanguage } from "@/lib/presence-types";
import type { SessionPhase } from "@/lib/session-progression";
import { SessionPhaseBadge } from "@/components/session/session-phase-badge";
import { cn } from "@/lib/utils";

export function SessionProgressHeader({
  phase,
  timerLabel,
  timerProgress,
  toneClassName,
  language,
}: {
  phase: SessionPhase;
  timerLabel: string;
  timerProgress: number;
  toneClassName: string;
  language: AppLanguage;
}) {
  return (
    <div className="space-y-3 text-center">
      <SessionPhaseBadge phase={phase} language={language} />
      <div className={cn("text-3xl font-semibold tracking-tight sm:text-4xl transition-all duration-300", toneClassName)}>{timerLabel}</div>
      <Progress value={timerProgress} className="h-1.5 rounded-full bg-white/10" />
    </div>
  );
}
