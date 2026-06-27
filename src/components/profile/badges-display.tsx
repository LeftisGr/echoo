import { cn } from "@/lib/utils";
import { getBadges, type BadgeProfileInput } from "@/lib/badges";
import type { AppLanguage } from "@/lib/presence-types";

interface BadgesDisplayProps {
  profile: BadgeProfileInput;
  language: AppLanguage;
}

export function BadgesDisplay({ profile, language }: BadgesDisplayProps) {
  const badges = getBadges(profile);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {badges.map((badge) => {
        const label = language === "en" ? badge.labelEN : badge.labelEL;
        const description = language === "en" ? badge.descriptionEN : badge.descriptionEL;

        return (
          <div
            key={badge.id}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-[22px] border p-4 text-center transition",
              badge.earned
                ? "border-violet-300/20 bg-violet-500/15 text-violet-50"
                : "border-white/10 bg-white/5 text-white/40",
            )}
          >
            <span className={cn("text-2xl", !badge.earned && "opacity-40 grayscale")}>{badge.emoji}</span>
            <p className={cn("text-sm font-medium", badge.earned ? "text-violet-50" : "text-white/55")}>{label}</p>
            {!badge.earned && (
              <p className="text-[11px] leading-4 text-white/35">{description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default BadgesDisplay;
