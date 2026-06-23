export type WhatsNextLocale = "en" | "el";

export interface WhatsNextItem {
  en: string;
  el: string;
}

export const whatsNextConfig = {
  workingOn: [
    { en: "Icebreaker prompts during quiet moments", el: "Ερωτήσεις για να σπάσει ο πάγος στις ήσυχες στιγμές" },
    { en: "Push notifications when a match is found", el: "Ειδοποιήσεις όταν βρεθεί match" },
    { en: "Interest-based conversation starters", el: "Εκκίνηση συνομιλίας βάσει κοινών ενδιαφερόντων" },
    { en: "Smoother voice reconnection", el: "Πιο ομαλή επανασύνδεση φωνής" },
    { en: "Queue activity during wait", el: "Δραστηριότητα κατά την αναμονή στην ουρά" },
  ] satisfies WhatsNextItem[],
  recentlyShipped: [
    { en: "Interest-based matchmaking", el: "Matching βάσει κοινών ενδιαφερόντων" },
    { en: "Voice reconnection improvements", el: "Βελτιώσεις στην επανασύνδεση φωνής" },
    { en: "Faster abandoned room cleanup", el: "Γρηγορότερος καθαρισμός εγκαταλελειμμένων rooms" },
    { en: "Improved admin metrics", el: "Βελτιωμένα metrics στο admin" },
    { en: "Account deletion option", el: "Επιλογή διαγραφής λογαριασμού" },
  ] satisfies WhatsNextItem[],
  footer: {
    en: "Built in public. Things may change.",
    el: "Χτίζεται δημόσια. Τα πράγματα μπορεί να αλλάξουν.",
  },
} as const;