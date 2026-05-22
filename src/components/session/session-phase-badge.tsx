import { cn } from "@/lib/utils";
import type { SessionPhase } from "@/lib/session-progression";
import { getSessionPhaseCopy } from "@/lib/session-progression";
import type { AppLanguage } from "@/lib/presence-types";

export function SessionPhaseBadge({ phase, language }: { phase: SessionPhase; language: AppLanguage }) {
  const styles =
    phase === "TEXT_PHASE"
      ? "border-white/10 bg-white/5 text-white/70"
      : phase === "AUDIO_PHASE"
        ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-50"
        : "border-amber-300/20 bg-amber-400/10 text-amber-50";

  const label = getSessionPhaseCopy(phase, language).badgeLabel;

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.14em] transition-all duration-300 animate-[echo-message-in_220ms_ease-out]", styles)}>
      {label}
    </span>
  );
}
