export type WhatsNextLocale = "en" | "el";

export interface WhatsNextItem {
  en: string;
  el: string;
}

export const whatsNextConfig = {
  workingOn: [
    { en: "Smoother first-time experience while you wait", el: "Πιο ομαλή πρώτη εμπειρία όσο περιμένεις" },
    { en: "Better community protection & moderation", el: "Καλύτερη προστασία & moderation της κοινότητας" },
    { en: "Queue heatmap — see when people are online", el: "Queue heatmap — δες πότε υπάρχει κόσμος online" },
    { en: "Performance improvements", el: "Βελτιώσεις απόδοσης" },
    { en: "Light theme", el: "Light theme" },
  ] satisfies WhatsNextItem[],
  recentlyShipped: [
    { en: "Pick photos from your gallery to share", el: "Επιλογή φωτογραφιών από τη συλλογή σου" },
    { en: "Collapsible header for more chat space on mobile", el: "Αναδιπλούμενο header για περισσότερο χώρο στο κινητό" },
    { en: "Smoother typing indicator and auto-scroll", el: "Πιο ομαλός δείκτης πληκτρολόγησης και auto-scroll" },
    { en: "Heart a Broken Telephone message to keep it alive", el: "Κάνε like σε φωνητικό του Σπασμένου Τηλεφώνου για να το κρατήσεις ζωντανό" },
    { en: "Push notifications for matches and events", el: "Ειδοποιήσεις για matches και events" },
  ] satisfies WhatsNextItem[],
  footer: {
    en: "Built in public. Things may change.",
    el: "Χτίζεται δημόσια. Τα πράγματα μπορεί να αλλάξουν.",
  },
} as const;