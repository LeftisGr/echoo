import { ExternalLink } from "lucide-react";

import { socialLinks } from "@/config/social-links";
import { cn } from "@/lib/utils";

export function SocialLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2") }>
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">Stay connected</p>
      <div className="grid gap-2">
        {socialLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              "group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white",
              compact && "px-3 py-2.5 text-xs",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] text-white/70 transition group-hover:bg-white/10">
                ↗
              </span>
              <span>{link.label}</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/30 transition group-hover:text-white/55" />
          </a>
        ))}
      </div>
      <p className="text-[10px] leading-tight text-white/38">Building Echoo in public.</p>
    </div>
  );
}
