export type WhatsNextLocale = "en" | "el";

export interface WhatsNextItem {
  en: string;
  el: string;
}

export const whatsNextConfig = {
  workingOn: [
    { en: "Smoother room recovery", el: "Πιο ομαλή επαναφορά room" },
    { en: "Gentler voice fallback", el: "Πιο ήπιο fallback για voice" },
    { en: "Cleaner content sharing states", el: "Πιο καθαρές καταστάσεις για περιεχόμενο" },
    { en: "Less friction in matching", el: "Λιγότερη τριβή στο matching" },
    { en: "Sharper room handoff moments", el: "Πιο καθαρές μεταβάσεις room" },
  ] satisfies WhatsNextItem[],
  recentlyShipped: [
    { en: "Service status banner for slower moments", el: "Banner κατάστασης υπηρεσιών για πιο αργές στιγμές" },
    { en: "Room restore timeout handling", el: "Χειρισμός timeout στην επαναφορά room" },
    { en: "Safer fallback actions for failed restore", el: "Πιο ασφαλείς επιλογές όταν αποτυγχάνει η επαναφορά" },
    { en: "More stable voice and sharing flows", el: "Πιο σταθερές ροές voice και sharing" },
    { en: "Menu access to the app’s latest updates", el: "Πρόσβαση από το μενού στα τελευταία updates" },
  ] satisfies WhatsNextItem[],
  footer: {
    en: "Built in public. Things may change.",
    el: "Χτίζεται δημόσια. Τα πράγματα μπορεί να αλλάξουν.",
  },
} as const;
