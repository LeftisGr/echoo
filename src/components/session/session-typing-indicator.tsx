import { cn } from "@/lib/utils";

export function SessionTypingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-violet-300/12 bg-violet-500/8 px-3 py-1.5 text-[11px] font-medium text-violet-50/88 shadow-[0_8px_18px_rgba(109,40,217,0.08)]",
        className,
      )}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-100/90 animate-[echo-typing-dots_1.05s_ease-in-out_infinite] [animation-delay:-0.18s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-violet-100/90 animate-[echo-typing-dots_1.05s_ease-in-out_infinite] [animation-delay:-0.08s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-violet-100/90 animate-[echo-typing-dots_1.05s_ease-in-out_infinite]" />
      </span>
      <span className="whitespace-nowrap text-white/72">Someone is typing...</span>
    </div>
  );
}
