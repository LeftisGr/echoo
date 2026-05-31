import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUPPORT_CONFIG, type SupportLanguage } from "@/config/support";
import { openExternal } from "@/lib/open-external";
import { cn } from "@/lib/utils";

export function SupportCard({ className, language }: { className?: string; language: SupportLanguage }) {
  const activeProvider = SUPPORT_CONFIG.providers[SUPPORT_CONFIG.activeProvider];
  const supportUrl = activeProvider.url;

  if (!SUPPORT_CONFIG.enabled || !supportUrl) {
    return null;
  }

  const title = language === "en" ? "Support Echoo" : "Στήριξε το Echoo";
  const footer = language === "en" ? "Echoo will remain free for everyone." : "Το Echoo θα παραμένει δωρεάν για όλους.";
  const cta = language === "en" ? "Support the project" : "Υποστήριξε το project";
  const badge = language === "en" ? "100% optional" : "100% προαιρετικό";
  const providerLabel = activeProvider.label;
  const providerTag = "revtag" in activeProvider ? activeProvider.revtag : null;
  const tagline = SUPPORT_CONFIG.tagline[language];
  const message = SUPPORT_CONFIG.message[language];

  return (
    <section
      className={cn(
        "rounded-[28px] border border-violet-300/12 bg-[linear-gradient(180deg,rgba(149,93,255,0.07),rgba(255,255,255,0.03))] p-5 shadow-[0_18px_60px_rgba(7,10,20,0.28),0_0_24px_rgba(139,92,246,0.08)] backdrop-blur-md sm:p-6",
        className,
      )}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">{tagline}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h3>
              <Badge className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60 hover:bg-white/5">
                {badge}
              </Badge>
            </div>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-300/12 bg-violet-400/10 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.15)]">
            <Heart className="h-4 w-4" />
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-6 text-white/68">{message}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            className="h-10 rounded-full bg-violet-500 px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(124,58,237,0.22)] transition-all duration-200 hover:bg-violet-400 hover:shadow-[0_14px_34px_rgba(124,58,237,0.28)]"
            onClick={() => openExternal(supportUrl)}
          >
            <Heart className="mr-2 h-4 w-4 fill-current" />
            {cta}
          </Button>
          <div className="flex items-center gap-2 text-xs text-white/45">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{providerLabel}</span>
            {providerTag && <span className="rounded-full border border-violet-300/15 bg-violet-500/10 px-2.5 py-1 text-violet-50">{providerTag}</span>}
            <span>{footer}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
