import { useMemo } from "react";

import { cn } from "@/lib/utils";

const orbThemes = [
  {
    orb: "bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,0.42)]",
    ping: "bg-emerald-200/25",
    glow: "bg-emerald-300/12",
  },
  {
    orb: "bg-sky-300 shadow-[0_0_22px_rgba(125,211,252,0.42)]",
    ping: "bg-sky-200/25",
    glow: "bg-sky-300/12",
  },
  {
    orb: "bg-violet-300 shadow-[0_0_22px_rgba(196,181,253,0.42)]",
    ping: "bg-violet-200/25",
    glow: "bg-violet-300/12",
  },
  {
    orb: "bg-rose-300 shadow-[0_0_22px_rgba(253,164,175,0.42)]",
    ping: "bg-rose-200/25",
    glow: "bg-rose-300/12",
  },
  {
    orb: "bg-amber-300 shadow-[0_0_22px_rgba(253,224,71,0.42)]",
    ping: "bg-amber-200/25",
    glow: "bg-amber-300/12",
  },
  {
    orb: "bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,0.42)]",
    ping: "bg-cyan-200/25",
    glow: "bg-cyan-300/12",
  },
] as const;

export const SessionFreeConversationState = ({ className }: { className?: string }) => {
  const theme = useMemo(() => orbThemes[Math.floor(Math.random() * orbThemes.length)], []);

  return (
    <div className={cn("relative flex items-center justify-center py-1", className)} aria-hidden="true">
      <div className={cn("relative flex h-6 w-6 items-center justify-center rounded-full border border-white/20", theme.orb)}>
        <div className={cn("absolute inset-0 animate-ping rounded-full [animation-duration:2.2s]", theme.ping)} />
        <div className={cn("absolute inset-[-0.45rem] rounded-full blur-md", theme.glow)} />
      </div>
    </div>
  );
};

export default SessionFreeConversationState;
