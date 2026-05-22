import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const toneMap = {
  violet: "border-violet-300/15 bg-violet-500/10 text-violet-50 shadow-[0_24px_90px_rgba(108,58,224,0.16)]",
  amber: "border-amber-300/15 bg-amber-500/10 text-amber-50 shadow-[0_24px_90px_rgba(245,158,11,0.14)]",
  rose: "border-rose-300/15 bg-rose-500/10 text-rose-50 shadow-[0_24px_90px_rgba(244,63,94,0.14)]",
  sky: "border-sky-300/15 bg-sky-500/10 text-sky-50 shadow-[0_24px_90px_rgba(56,189,248,0.14)]",
  emerald: "border-emerald-300/15 bg-emerald-500/10 text-emerald-50 shadow-[0_24px_90px_rgba(16,185,129,0.14)]",
} as const;

export function CalmStateCard({
  eyebrow,
  title,
  body,
  status,
  tone = "violet",
  action,
  secondaryAction,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  status?: string;
  tone?: keyof typeof toneMap;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border p-6 sm:p-8", toneMap[tone], className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)] opacity-90" />
      <div className="absolute -right-8 top-0 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="relative mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
          <div className="absolute inset-0 animate-ping rounded-full bg-white/20 opacity-40 [animation-duration:2.2s]" />
          <div className="relative flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current [animation-delay:-0.16s]" />
            <span className="h-1.5 w-1.5 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current [animation-delay:-0.08s]" />
            <span className="h-1.5 w-1.5 animate-[echo-typing-dots_1s_ease-in-out_infinite] rounded-full bg-current" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {eyebrow && <p className="text-[10px] uppercase tracking-[0.34em] text-white/55">{eyebrow}</p>}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          {body && <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">{body}</p>}

          {status && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/75">

              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              <span className="tracking-[0.16em] uppercase">{status}</span>
            </div>
          )}

          {(action || secondaryAction) && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {action}
              {secondaryAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
