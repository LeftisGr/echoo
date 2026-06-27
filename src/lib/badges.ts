// Decorative profile badges for Echoo.
// Pure presentation — no connection to matchmaking, providers, or any other system.

export interface Badge {
  id: string;
  emoji: string;
  labelEN: string;
  labelEL: string;
  descriptionEN: string;
  descriptionEL: string;
  earned: boolean;
}

// Minimal shape of the fields we read from a profile.
// Kept loose on purpose so we never depend on profile internals beyond these.
export interface BadgeProfileInput {
  conversationsCompleted?: number;
  streakDays?: number;
  supporterBadge?: boolean;
  interests?: string[];
}

export function getBadges(profile: BadgeProfileInput): Badge[] {
  const conversations = profile.conversationsCompleted ?? 0;
  const streak = profile.streakDays ?? 0;
  const interestsCount = profile.interests?.length ?? 0;
  const supporter = profile.supporterBadge ?? false;

  return [
    {
      id: "first-echo",
      emoji: "🌱",
      labelEN: "First Echo",
      labelEL: "Πρώτο Echo",
      descriptionEN: "Complete your first conversation",
      descriptionEL: "Ολοκλήρωσε την πρώτη σου συνομιλία",
      earned: conversations >= 1,
    },
    {
      id: "talker",
      emoji: "💬",
      labelEN: "Talker",
      labelEL: "Ομιλητής",
      descriptionEN: "Complete 5 conversations",
      descriptionEL: "Ολοκλήρωσε 5 συνομιλίες",
      earned: conversations >= 5,
    },
    {
      id: "echo-veteran",
      emoji: "🏅",
      labelEN: "Echo Veteran",
      labelEL: "Echo Βετεράνος",
      descriptionEN: "Complete 20 conversations",
      descriptionEL: "Ολοκλήρωσε 20 συνομιλίες",
      earned: conversations >= 20,
    },
    {
      id: "streak-keeper",
      emoji: "🔥",
      labelEN: "Streak Keeper",
      labelEL: "Streak Keeper",
      descriptionEN: "Reach a 3-day streak",
      descriptionEL: "Φτάσε σε streak 3 ημερών",
      earned: streak >= 3,
    },
    {
      id: "explorer",
      emoji: "🧭",
      labelEN: "Explorer",
      labelEL: "Εξερευνητής",
      descriptionEN: "Add 5 interests",
      descriptionEL: "Πρόσθεσε 5 ενδιαφέροντα",
      earned: interestsCount >= 5,
    },
    {
      id: "supporter",
      emoji: "❤️",
      labelEN: "Supporter",
      labelEL: "Supporter",
      descriptionEN: "Support Echoo",
      descriptionEL: "Στήριξε το Echoo",
      earned: supporter === true,
    },
  ];
}
