import { cn } from "@/lib/utils";
import type { SessionPhase } from "@/lib/session-progression";

export function SessionPhaseBadge({ phase }: { phase: SessionPhase }) {
  const styles =
    phase === "TEXT_PHASE"
      ? "border-white/10 bg-white/5 text-white/65"
      : phase === "AUDIO_PHASE"
        ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-50"
        : "border-amber-300/20 bg-amber-400/10 text-amber-50";

  const label =
    phase === "TEXT_PHASE"
      ? "Text phase"
      : phase === "AUDIO_PHASE"
        ? "Audio phase"
        : "Media phase";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.24em]", styles)}>
      {label}
    </span>
  );
}
