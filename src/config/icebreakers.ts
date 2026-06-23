export const icebreakers = {
  en: [
    "Out of ideas? Tell me about your last trip.",
    "What's something you've been thinking about lately?",
    "If you could learn one skill overnight, what would it be?",
    "What's the last thing that genuinely made you laugh?",
    "What's a small thing that made your day better recently?",
    "If you had a free afternoon tomorrow, how would you spend it?",
    "What's something most people don't know about you?",
    "What's the best advice you've ever received?",
    "What are you looking forward to this week?",
    "What's a movie or show you'd recommend right now?",
  ],
  el: [
    "Έχεις μείνει από ιδέες; Πες μου για το τελευταίο σου ταξίδι.",
    "Τι έχεις στο μυαλό σου τελευταία;",
    "Αν μπορούσες να μάθεις μια δεξιότητα μέσα σε μια νύχτα, ποια θα ήταν;",
    "Ποιο είναι το τελευταίο πράγμα που σε έκανε να γελάσεις αληθινά;",
    "Τι μικρό πράγμα σου έφτιαξε τη διάθεση πρόσφατα;",
    "Αν είχες ελεύθερο απόγευμα αύριο, πώς θα το περνούσες;",
    "Τι δεν ξέρουν οι περισσότεροι για σένα;",
    "Ποια είναι η καλύτερη συμβουλή που έχεις πάρει ποτέ;",
    "Τι περιμένεις με ανυπομονησία αυτή την εβδομάδα;",
    "Ποια ταινία ή σειρά θα πρότεινες τώρα;",
  ],
};

export function getRandomIcebreaker(language: "en" | "el"): string {
  const list = icebreakers[language] ?? icebreakers.en;
  return list[Math.floor(Math.random() * list.length)];
}