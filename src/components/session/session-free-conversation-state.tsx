import { cn } from "@/lib/utils";

export const SessionFreeConversationState = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative flex items-center justify-center py-1", className)} aria-hidden="true">
      <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.35)]">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200/30 [animation-duration:2.2s]" />
        <div className="absolute inset-[-0.35rem] rounded-full bg-emerald-300/10 blur-md" />
      </div>
    </div>
  );
};

export default SessionFreeConversationState;
