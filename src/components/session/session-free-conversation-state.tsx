import { cn } from "@/lib/utils";

export const SessionFreeConversationState = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative flex items-center justify-center py-1", className)} aria-hidden="true">
      <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200/20 bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,0.42)]">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200/25 [animation-duration:2.2s]" />
        <div className="absolute inset-[-0.45rem] rounded-full bg-emerald-300/12 blur-md" />
      </div>
    </div>
  );
};

export default SessionFreeConversationState;
