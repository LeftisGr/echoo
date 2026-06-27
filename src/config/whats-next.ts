export type WhatsNextLocale = "en" | "el";

export interface WhatsNextItem {
  en: string;
  el: string;
}

export const whatsNextConfig = {
  workingOn: [
    { en: "Queue heatmap — see when people are online", el: "Queue heatmap — δες πότε υπάρχει κόσμος online" },
    { en: "Heart a Broken Telephone message to keep it alive", el: "Κάνε like σε φωνητικό του Σπασμένου Τηλεφώνου για να το κρατήσεις ζωντανό" },
    { en: "Performance improvements", el: "Βελτιώσεις απόδοσης" },
    { en: "Light theme", el: "Light theme" },
  ] satisfies WhatsNextItem[],
  recentlyShipped: [
    { en: "Push notifications for matches and events", el: "Ειδοποιήσεις για matches και events" },
    { en: "Badges and conversation milestones", el: "Badges και milestones συνομιλιών" },
    { en: "Sunday Nights weekly event", el: "Εβδομαδιαία εκδήλωση Sunday Nights" },
    { en: "Broken Telephone — voice messages for solo waiters", el: "Σπασμένο Τηλέφωνο — φωνητικά για όσους περιμένουν μόνοι" },
    { en: "Guest to registered account upgrade", el: "Αναβάθμιση από guest σε εγγεγραμμένο λογαριασμό" },
  ] satisfies WhatsNextItem[],
  footer: {
    en: "Built in public. Things may change.",
    el: "Χτίζεται δημόσια. Τα πράγματα μπορεί να αλλάξουν.",
  },
} as const;