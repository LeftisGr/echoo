import { Coffee, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buyMeACoffeeUrl } from "@/lib/support";
import { cn } from "@/lib/utils";

export function SupportEchooCard({
  className,
  language,
  supporter,
  onToggleSupporter,
}: {
  className?: string;
  language: "en" | "el";
  supporter: boolean;
  onToggleSupporter?: () => void;
}) {
  return (
    <div className={cn("space-y-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(5,8,18,0.28)] backdrop-blur-sm sm:p-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">Support Echoo</p>
          <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            {language === "en" ? "Echoo is free, but we still need to eat :P" : "Το Echoo είναι δωρεάν, αλλά πρέπει κι εμείς να φάμε :P"}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-white/65">
            {language === "en"
              ? "If Echoo helped, a coffee keeps it running for the next calm conversation."
              : "Αν το Echoo βοήθησε, ένας καφές το κρατά σε λειτουργία για την επόμενη ήρεμη κουβέντα."}
          </p>

        </div>

        {supporter && (
          <Badge className="w-fit rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-50 hover:bg-amber-400/10">
            {language === "en" ? "Early supporter" : "Early supporter"}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild className="h-11 rounded-full bg-violet-500 px-4 text-white hover:bg-violet-400">
          <a href={buyMeACoffeeUrl} target="_blank" rel="noreferrer noopener">
            <Coffee className="mr-2 h-4 w-4" />
            {language === "en" ? "Buy me a coffee" : "Buy me a coffee"}
          </a>
        </Button>
        {onToggleSupporter && (
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-11 rounded-full border-white/15 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white",
              supporter && "border-amber-300/20 bg-amber-400/10 text-amber-50 hover:bg-amber-400/15 hover:text-amber-50",
            )}
            onClick={onToggleSupporter}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {supporter
              ? language === "en"
                ? "Hide supporter badge"
                : "Απόκρυψη badge υποστηρικτή"
              : language === "en"
                ? "I already supported Echoo"
                : "Έχω ήδη στηρίξει το Echoo"}
          </Button>
        )}
      </div>
    </div>
  );
}
