import { Sparkles } from "lucide-react";

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
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/70 shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 text-violet-100">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>{language === "en" ? "Session complete" : "Το session ολοκληρώθηκε"}</span>
        </div>
      ) : (
        <div className={cn("text-3xl font-semibold tracking-tight transition-all duration-300 sm:text-4xl", toneClassName)}>{timerLabel}</div>
      )}
      {!sessionComplete && <Progress value={timerProgress} className="h-1.5 rounded-full bg-white/10" />}
    </div>
  );
}
