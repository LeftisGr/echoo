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
        <div className="mx-auto inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium tracking-[0.12em] text-white/75 shadow-sm">
          {language === "en" ? "Enjoy" : "Απόλαυσε το"}
        </div>
      ) : (
        <div className={cn("text-3xl font-semibold tracking-tight transition-all duration-300 sm:text-4xl", toneClassName)}>{timerLabel}</div>
      )}
      {!sessionComplete && <Progress value={timerProgress} className="h-1.5 rounded-full bg-white/10" />}
    </div>
  );
}
