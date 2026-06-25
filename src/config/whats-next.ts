export type WhatsNextLocale = "en" | "el";

export interface WhatsNextItem {
  en: string;
  el: string;
}

export const whatsNextConfig = {
  workingOn: [
    { en: "Push notifications when a match is found", el: "Ειδοποιήσεις όταν βρεθεί match" },
    { en: "Queue trivia while waiting", el: "Trivia ερωτήσεις κατά την αναμονή" },
    { en: "Badges and conversation milestones", el: "Badges και milestones συνομιλιών" },
    { en: "Light theme", el: "Light theme" },
    { en: "Sunday Nights weekly event", el: "Εβδομαδιαία εκδήλωση Sunday Nights" },
  ] satisfies WhatsNextItem[],
  recentlyShipped: [
    { en: "Broken Telephone — voice messages for solo waiters", el: "Σπασμένο Τηλέφωνο — φωνητικά για όσους περιμένουν μόνοι" },
    { en: "Guest to registered account upgrade", el: "Αναβάθμιση από guest σε εγγεγραμμένο λογαριασμό" },
    { en: "Icebreaker prompts in chat history", el: "Ερωτήσεις για να σπάσει ο πάγος στο ιστορικό chat" },
    { en: "Interest-based matchmaking", el: "Matching βάσει κοινών ενδιαφερόντων" },
    { en: "Voice reconnection improvements", el: "Βελτιώσεις στην επανασύνδεση φωνής" },
  ] satisfies WhatsNextItem[],
  footer: {
    en: "Built in public. Things may change.",
    el: "Χτίζεται δημόσια. Τα πράγματα μπορεί να αλλάξουν.",
  },
} as const;