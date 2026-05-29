export const SUPPORT_CONFIG = {
  enabled: true,
  activeProvider: "revolut",
  providers: {
    revolut: {
      label: "Revolut",
      url: "https://revolut.me/REPLACE_ME",
    },
    buymeacoffee: {
      label: "Buy Me a Coffee",
      url: "",
    },
  },
  tagline: {
    en: "Help keep Echoo alive.",
    el: "Βοήθησε το Echoo να συνεχίσει να ζει.",
  },
  message: {
    en: "Echoo is built and maintained by an independent developer. Your support helps cover servers, audio infrastructure, moderation tools, and future improvements.",
    el: "Το Echoo δημιουργείται και συντηρείται από ανεξάρτητο δημιουργό. Η υποστήριξή σου βοηθά στα servers, στον ήχο, στην ασφάλεια και στις μελλοντικές βελτιώσεις.",
  },
} as const;

export type SupportLanguage = keyof typeof SUPPORT_CONFIG.tagline;
export type SupportProviderKey = keyof typeof SUPPORT_CONFIG.providers;
