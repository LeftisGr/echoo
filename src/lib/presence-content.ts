import type {
  AgeRange,
  AppLanguage,
  GenderOption,
  LanguagePreference,
  PreferenceOption,
  RatingScore,
} from "@/lib/presence-types";

export const interestTags = [
  "music",
  "cinema",
  "late walks",
  "philosophy",
  "travel",
  "gaming",
  "books",
  "deep talks",
  "startup life",
  "poetry",
  "night drives",
  "wellness",
] as const;

export const usernamePrefixes = [
  "Echo",
  "Nova",
  "Atlas",
  "Velvet",
  "Luna",
  "Drift",
  "Halo",
  "Aster",
  "Signal",
  "Pulse",
] as const;

export const usernameSuffixes = [
  "17",
  "Blue",
  "9",
  "Wave",
  "Glow",
  "Muse",
  "Cloud",
  "Delta",
  "Thread",
  "One",
] as const;

export const ageRangeOptions: AgeRange[] = ["18-24", "25-34", "35-44", "45+"];
export const genderOptions: GenderOption[] = ["male", "female", "nonbinary", "prefer-not"];
export const preferenceOptions: PreferenceOption[] = ["male", "female", "anyone"];
export const languageOptions: LanguagePreference[] = ["greek", "english", "both"];
export const ratingOptions: RatingScore[] = ["good", "neutral", "bad"];

export const queueMessages = {
  en: [
    "Finding someone with the same energy...",
    "Checking the next available room...",
    "Matching by language and vibe...",
    "Almost there...",
  ],
  el: [
    "Βρίσκουμε κάποιον με το ίδιο energy...",
    "Ελέγχουμε το επόμενο διαθέσιμο room...",
    "Κάνουμε match με βάση γλώσσα και vibe...",
    "Σχεδόν έτοιμο...",
  ],
} as const;

export const partnerReplies = {
  en: [
    "That felt honest. What kind of conversations stay with you?",
    "I like your pace. What made you open the app tonight?",
    "You sound thoughtful. What are you in the mood for right now?",
    "That was a good first line. Want to go a little deeper?",
    "Soft start. I like that. What matters to you lately?",
  ],
  el: [
    "Αυτό ακούστηκε ειλικρινές. Τι είδους κουβέντες σου μένουν;",
    "Μου αρέσει ο ρυθμός σου. Τι σε έφερε απόψε εδώ;",
    "Ακούγεσαι σκεπτικός/ή. Τι διάθεση έχεις αυτή τη στιγμή;",
    "Καλή πρώτη ατάκα. Θες να πάμε λίγο πιο βαθιά;",
    "Ήρεμο ξεκίνημα. Μου αρέσει. Τι σε νοιάζει τελευταία;",
  ],
} as const;

export const adminChartData = [
  { day: "Mon", sessions: 42, reports: 3, signups: 18 },
  { day: "Tue", sessions: 56, reports: 4, signups: 24 },
  { day: "Wed", sessions: 63, reports: 5, signups: 28 },
  { day: "Thu", sessions: 71, reports: 4, signups: 31 },
  { day: "Fri", sessions: 88, reports: 7, signups: 40 },
  { day: "Sat", sessions: 102, reports: 8, signups: 51 },
  { day: "Sun", sessions: 79, reports: 5, signups: 34 },
];

export const copy = {
  en: {
    brand: {
      name: "Echoo",
      tagline: "First words first. Voice later. No photos. No swipes. Just a real conversation.",
      waitlist: "Greece-first MVP",
    },
    nav: {
      home: "Home",
      startNow: "Start now",
      dashboard: "Dashboard",
      safety: "Safety",
      settings: "Settings",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
      menu: "Menu",
      admin: "Admin",
    },
    landing: {
      heroEyebrow: "Anonymous live conversation",
      heroTitle: "Meet someone through words before anything else.",
      heroBody:
        "Echoo is a mobile-first anonymous 1-to-1 app. Start with text, unlock voice after time, and keep the focus on chemistry instead of appearances.",
      heroPrimary: "Start now",
      heroSecondary: "How it works",
      getApp: "Get the app",
      statUsers: "online now",
      statWait: "avg wait",
      statSafety: "safety layers",
      whatIsTitle: "What is Echoo",
      whatIsBody:
        "A premium-feeling space for honest anonymous conversations. No profile photos. No public feed. No swiping loop.",
      stepsTitle: "How it works",
      whyPhotosTitle: "Why no photos",
      whyPhotosBody:
        "Without photos, attention shifts to tone, curiosity, and emotional timing. The first impression becomes language.",
      safetyTitle: "Safety first",
      safetyBody:
        "Block, report, respectful prompts, and fast exits are built into every room. Abuse gets disconnected quickly.",
      faqTitle: "FAQ",
      contactTitle: "Contact",
      contactBody: "Questions, partnerships, or pilot interest? Reach the Echoo team.",
      ctaTitle: "Ready for a different kind of conversation?",
      ctaBody: "Open the app, make your anonymous profile, and get matched in seconds.",
      stickyMenu: "Menu",
      stickySession: "Start session",
    },
    auth: {
      title: "Create your anonymous profile",
      body: "Use Google or continue as a guest. Echoo keeps your identity light by default.",
      google: "Continue with Google",
      guest: "Continue as guest",
      reroll: "New username",
      profileTitle: "Anonymous profile",
      ageRange: "Age range",
      gender: "Gender",
      lookingFor: "Looking for",
      language: "Language",
      interests: "Interests",
      helper: "No real name needed. You can adjust your filters later in settings.",
    },
    dashboard: {
      title: "You’re ready to connect",
      body: "Your profile is anonymous, your filters are saved, and Echoo is ready when you are.",
      startSession: "Start session",
      profile: "Profile",
      safety: "Safety",
      settings: "Settings",
      online: "Users online now",
      wait: "Avg wait time",
      filters: "Current filters",
      identity: "Your nickname tonight",
      note: "Text first. Voice later. No pressure.",
    },
    queue: {
      title: "Finding your next conversation",
      body: "We’re matching you with the next available person. Simple, fast, and vibe-first.",
      cancel: "Cancel",
      changeFilters: "Change preferences",
      found: "A room is opening...",

      relaxed: "No one is available right now. Stay in queue?",
      offline: "You’re offline. We’ll keep trying when the connection returns.",
    },
    session: {
      title: "Private room",
      textNote: "Voice unlocks after the timer ends.",
      demoTimer: "The text phase lasts 10 minutes before voice unlocks.",
      leave: "Leave",
      send: "Send",
      placeholder: "Write your first message...",
      voiceUnlocked: "Voice is now available",
      mediaUnlocked: "Media sharing is now available.",
      startVoice: "Start voice chat",
      keepText: "Keep text only",
      voiceStarting: "Voice is starting...",
      connected: "Voice is live",
      ended: "Connection ended.",
      findNew: "Find someone new",
      backHome: "Back home",
      howWasIt: "How did it feel?",
      report: "Report user",
      block: "Block user",
      connectionLost: "Connection lost. Reconnecting...",
      partnerDisconnected: "The other person left the room.",
      you: "You",
      partner: "Other person",
      countdownLabel: "Voice unlock",
    },
    safety: {
      title: "Safety comes before chemistry",
      body: "Echoo keeps every room lightweight, anonymous, and easy to leave. Respect is the default.",
      rules: [
        "No harassment, hate speech, sexual coercion, or threats.",
        "Leave instantly if a conversation feels wrong.",
        "Report patterns, not only extreme cases.",
        "Voice stays optional even after unlock.",
      ],
      actions: ["Report user", "Block user", "Immediate exit"],
    },
    settings: {
      title: "Settings",
      body: "Adjust language, filters, and mobile-friendly preferences.",
      appLanguage: "App language",
      queueLanguage: "Matching language",
      lookingFor: "Looking for",
      haptics: "Haptic feedback",
      reconnect: "Reconnect to realtime when possible",
      save: "Saved",
    },
    contact: {
      title: "Contact",
      email: "hello@presence.app",
      body: "For pilots in Greece, partnerships, or trust & safety requests.",
    },
    legal: {
      privacyTitle: "Privacy",
      privacyBody:
        "Echoo is built around minimal identity, private rooms, and clear user control. Personal data should stay limited to what the service truly needs.",
      termsTitle: "Terms",
      termsBody:
        "Use Echoo respectfully. Do not abuse others. Anonymous rooms may be moderated through reports and safety systems.",
    },
    misc: {
      both: "Both",
      greek: "Greek",
      english: "English",
      male: "Male",
      female: "Female",
      anyone: "Anyone",
      nonbinary: "Non-binary",
      preferNot: "Prefer not to say",
      online: "Online",
      reconnecting: "Reconnecting...",
      stable: "Realtime stable",
      noUsers: "No one is available right now. Stay in queue?",
      sessionReady: "Your room is ready.",
      profileSaved: "Profile updated.",
      blocked: "User blocked.",
      reported: "Report submitted.",
      ratingSaved: "Thanks for the feedback.",
      signedIn: "You’re signed in anonymously.",
      signedOut: "You’ve signed out.",
      signIn: "Sign in",
      guestSessionReady: "Guest session ready.",

      loading: "Loading...",
      restoring: "Restoring your session...",
      loadingProfile: "Loading your profile...",
      loadingSettings: "Loading your settings...",
    },
    faq: [
      {
        question: "Is this a dating app?",
        answer: "No. Echoo is built around anonymous conversation and human connection, not profile browsing or swiping.",
      },
      {
        question: "When does voice become available?",
        answer: "Voice unlocks after the text timer ends. You can still stay text-only.",
      },
      {
        question: "Do I need to upload photos?",
        answer: "No. Photos are intentionally out of the MVP to keep the first impression calmer and more honest.",
      },
    ],
  },
  el: {
    brand: {
      name: "Echoo",
      tagline: "Πρώτα οι λέξεις. Μετά η φωνή. Χωρίς φωτογραφίες. Χωρίς swipes. Μόνο κουβέντα.",
      waitlist: "MVP με προτεραιότητα στην Ελλάδα",
    },
    nav: {
      home: "Αρχική",
      startNow: "Ξεκίνα τώρα",
      dashboard: "Πίνακας",
      safety: "Ασφάλεια",
      settings: "Ρυθμίσεις",
      contact: "Επικοινωνία",
      privacy: "Απόρρητο",
      terms: "Όροι",
      menu: "Μενού",
      admin: "Διαχείριση",
    },
    landing: {
      heroEyebrow: "Ανώνυμες live συνομιλίες",
      heroTitle: "Γνώρισε κάποιον μέσα από λέξεις πριν από οτιδήποτε άλλο.",
      heroBody:
        "Το Echoo είναι μια mobile-first ανώνυμη app για 1-to-1 συνομιλίες. Ξεκινάς με κείμενο, ξεκλειδώνεις φωνή μετά από λίγο και η χημεία μετράει περισσότερο από την εμφάνιση.",
      heroPrimary: "Ξεκίνα τώρα",
      heroSecondary: "Πώς δουλεύει",
      getApp: "Κατέβασε την app",
      statUsers: "online τώρα",
      statWait: "μέση αναμονή",
      statSafety: "στρώματα ασφάλειας",
      whatIsTitle: "Τι είναι το Echoo",
      whatIsBody:
        "Ένας premium χώρος για ειλικρινείς ανώνυμες συνομιλίες. Χωρίς φωτογραφίες προφίλ. Χωρίς δημόσιο feed. Χωρίς ατελείωτα swipes.",
      stepsTitle: "Πώς λειτουργεί",
      whyPhotosTitle: "Γιατί χωρίς φωτογραφίες",
      whyPhotosBody:
        "Χωρίς φωτογραφίες, η προσοχή πάει στον τόνο, την περιέργεια και τον συναισθηματικό ρυθμό. Η πρώτη εντύπωση γίνεται η γλώσσα.",
      safetyTitle: "Πρώτα η ασφάλεια",
      safetyBody:
        "Block, report, υπενθυμίσεις σεβασμού και γρήγορη έξοδος υπάρχουν σε κάθε room. Η κακοποιητική συμπεριφορά κόβεται άμεσα.",
      faqTitle: "FAQ",
      contactTitle: "Επικοινωνία",
      contactBody: "Ερωτήσεις, συνεργασίες ή ενδιαφέρον για pilot; Επικοινώνησε με την ομάδα του Echoo.",
      ctaTitle: "Έτοιμος/η για έναν διαφορετικό τύπο κουβέντας;",
      ctaBody: "Άνοιξε την app, φτιάξε το ανώνυμο προφίλ σου και κάνε match σε δευτερόλεπτα.",
      stickyMenu: "Μενού",
      stickySession: "Έναρξη session",
    },
    auth: {
      title: "Δημιούργησε το ανώνυμο προφίλ σου",
      body: "Συνδέσου με Google ή συνέχισε ως guest. Το Echoo κρατά την ταυτότητά σου ελαφριά από προεπιλογή.",
      google: "Συνέχεια με Google",
      guest: "Συνέχεια ως guest",
      reroll: "Νέο username",
      profileTitle: "Ανώνυμο προφίλ",
      ageRange: "Ηλικιακό εύρος",
      gender: "Φύλο",
      lookingFor: "Αναζητώ",
      language: "Γλώσσα",
      interests: "Ενδιαφέροντα",
      helper: "Δεν χρειάζεται πραγματικό όνομα. Μπορείς να αλλάξεις φίλτρα αργότερα στις ρυθμίσεις.",
    },
    dashboard: {
      title: "Είσαι έτοιμος/η να συνδεθείς",
      body: "Το προφίλ σου είναι ανώνυμο, τα φίλτρα σου αποθηκεύονται και το Echoo είναι έτοιμο όταν είσαι κι εσύ.",
      startSession: "Έναρξη session",
      profile: "Προφίλ",
      safety: "Ασφάλεια",
      settings: "Ρυθμίσεις",
      online: "Χρήστες online τώρα",
      wait: "Μέσος χρόνος αναμονής",
      filters: "Τρέχοντα φίλτρα",
      identity: "Το ψευδώνυμό σου απόψε",
      note: "Πρώτα κείμενο. Μετά φωνή. Χωρίς πίεση.",
    },
    queue: {
      title: "Βρίσκουμε την επόμενη κουβέντα σου",
      body: "Σε ταιριάζουμε με το επόμενο διαθέσιμο άτομο. Απλά, γρήγορα και με vibe.",
      cancel: "Ακύρωση",
      changeFilters: "Αλλαγή προτιμήσεων",
      found: "Ένα room ανοίγει...",

      relaxed: "Κανείς δεν είναι διαθέσιμος τώρα. Να μείνεις στην ουρά;",
      offline: "Είσαι offline. Θα συνεχίσουμε μόλις επιστρέψει η σύνδεση.",
    },
    session: {
      title: "Ιδιωτικό δωμάτιο",
      textNote: "Η φωνή ξεκλειδώνει όταν τελειώσει ο χρονοδιακόπτης.",
      demoTimer: "Η φάση κειμένου κρατά 10 λεπτά πριν ανοίξει η φωνή.",
      leave: "Αποχώρηση",
      send: "Αποστολή",
      placeholder: "Γράψε το πρώτο σου μήνυμα...",
      voiceUnlocked: "Η φωνή είναι τώρα διαθέσιμη",
      mediaUnlocked: "Το media sharing είναι τώρα διαθέσιμο.",
      startVoice: "Έναρξη voice chat",
      keepText: "Μόνο κείμενο",
      voiceStarting: "Η φωνητική σύνδεση ξεκινά...",
      connected: "Η φωνή είναι live",
      ended: "Η σύνδεση ολοκληρώθηκε.",
      findNew: "Βρες κάποιον νέο",
      backHome: "Πίσω στην αρχική",
      howWasIt: "Πώς σου φάνηκε;",
      report: "Αναφορά χρήστη",
      block: "Αποκλεισμός χρήστη",
      connectionLost: "Η σύνδεση χάθηκε. Επανασύνδεση...",
      partnerDisconnected: "Το άλλο άτομο έφυγε από το room.",
      you: "Εσύ",
      partner: "Το άλλο άτομο",
      countdownLabel: "Ξεκλείδωμα φωνής",
    },
    safety: {
      title: "Η ασφάλεια προηγείται της χημείας",
      body: "Το Echoo κρατά κάθε room ελαφρύ, ανώνυμο και εύκολο να το αφήσεις. Ο σεβασμός είναι ο κανόνας από προεπιλογή.",
      rules: [
        "Όχι παρενόχληση, hate speech, σεξουαλική πίεση ή απειλές.",
        "Φύγε αμέσως αν μια κουβέντα δεν σου κάθεται καλά.",
        "Κάνε report σε μοτίβα συμπεριφοράς, όχι μόνο σε ακραία περιστατικά.",
        "Η φωνή παραμένει προαιρετική ακόμα και μετά το unlock.",
      ],
      actions: ["Report χρήστη", "Block χρήστη", "Άμεση έξοδος"],
    },
    settings: {
      title: "Ρυθμίσεις",
      body: "Ρύθμισε γλώσσα, φίλτρα και mobile-friendly προτιμήσεις.",
      appLanguage: "Γλώσσα εφαρμογής",
      queueLanguage: "Γλώσσα matching",
      lookingFor: "Αναζητώ",
      haptics: "Δόνηση / haptics",
      reconnect: "Επανασύνδεση στο realtime όταν είναι δυνατό",
      save: "Αποθηκεύτηκε",
    },
    contact: {
      title: "Επικοινωνία",
      email: "hello@presence.app",
      body: "Για pilots στην Ελλάδα, συνεργασίες ή θέματα trust & safety.",
    },
    legal: {
      privacyTitle: "Απόρρητο",
      privacyBody:
        "Το Echoo σχεδιάζεται γύρω από την ελάχιστη ταυτότητα, τα ιδιωτικά rooms και τον καθαρό έλεγχο του χρήστη. Τα προσωπικά δεδομένα πρέπει να μένουν όσο πιο λίγα γίνεται.",
      termsTitle: "Όροι",
      termsBody:
        "Χρησιμοποίησε το Echoo με σεβασμό. Μην κακομεταχειρίζεσαι άλλους χρήστες. Τα ανώνυμα rooms μπορούν να εποπτεύονται μέσω reports και συστημάτων ασφάλειας.",
    },
    misc: {
      both: "Και τα δύο",
      greek: "Ελληνικά",
      english: "Αγγλικά",
      male: "Άνδρας",
      female: "Γυναίκα",
      anyone: "Οποιοσδήποτε",
      nonbinary: "Μη δυαδικό",
      preferNot: "Δεν θέλω να πω",
      online: "Online",
      reconnecting: "Επανασύνδεση...",
      stable: "Realtime σταθερό",
      noUsers: "Κανείς δεν είναι διαθέσιμος τώρα. Να μείνεις στην ουρά;",
      sessionReady: "Το δωμάτιό σου είναι έτοιμο.",
      profileSaved: "Το προφίλ ενημερώθηκε.",
      blocked: "Ο χρήστης μπλοκαρίστηκε.",
      reported: "Η αναφορά στάλθηκε.",
      ratingSaved: "Ευχαριστούμε για το feedback.",
      signedIn: "Έχεις συνδεθεί ανώνυμα.",
      signedOut: "Έχεις αποσυνδεθεί.",
      signIn: "Σύνδεση",
      guestSessionReady: "Η guest συνεδρία είναι έτοιμη.",

      loading: "Φορτώνουμε...",
      restoring: "Επαναφέρουμε το session σου...",
      loadingProfile: "Φορτώνουμε το προφίλ σου...",
      loadingSettings: "Φορτώνουμε τις ρυθμίσεις σου...",
    },
    faq: [
      {
        question: "Είναι dating app;",
        answer: "Όχι. Το Echoo χτίζεται γύρω από την ανώνυμη κουβέντα και την ανθρώπινη σύνδεση, όχι από περιήγηση σε προφίλ ή swipes.",
      },
      {
        question: "Πότε ανοίγει η φωνή;",
        answer: "Η φωνή ξεκλειδώνει αφού τελειώσει ο χρονοδιακόπτης του κειμένου. Μπορείς όμως να μείνεις μόνο στο text.",
      },
      {
        question: "Χρειάζεται να ανεβάσω φωτογραφίες;",
        answer: "Όχι. Οι φωτογραφίες μένουν συνειδητά εκτός του MVP για να είναι πιο ήρεμη και πιο ειλικρινής η πρώτη εντύπωση.",
      },
    ],
  },
} as const;

export const labels = {
  ageRange: {
    en: {
      "18-24": "18-24",
      "25-34": "25-34",
      "35-44": "35-44",
      "45+": "45+",
    },
    el: {
      "18-24": "18-24",
      "25-34": "25-34",
      "35-44": "35-44",
      "45+": "45+",
    },
  },
  gender: {
    en: {
      male: "Male",
      female: "Female",
      nonbinary: "Non-binary",
      "prefer-not": "Prefer not to say",
    },
    el: {
      male: "Άνδρας",
      female: "Γυναίκα",
      nonbinary: "Μη δυαδικό",
      "prefer-not": "Δεν θέλω να πω",
    },
  },
  preference: {
    en: {
      male: "Male",
      female: "Female",
      anyone: "Anyone",
    },
    el: {
      male: "Άνδρας",
      female: "Γυναίκα",
      anyone: "Οποιοσδήποτε",
    },
  },
  language: {
    en: {
      greek: "Greek",
      english: "English",
      both: "Both",
    },
    el: {
      greek: "Ελληνικά",
      english: "Αγγλικά",
      both: "Και τα δύο",
    },
  },
  rating: {
    en: {
      good: "Good",
      neutral: "Neutral",
      bad: "Bad",
    },
    el: {
      good: "Καλό",
      neutral: "Ουδέτερο",
      bad: "Κακό",
    },
  },
} as const;

export function getCopy(language: AppLanguage) {
  return copy[language];
}

export function localizeAgeRange(language: AppLanguage, value: AgeRange) {
  return labels.ageRange[language][value];
}

export function localizeGender(language: AppLanguage, value: GenderOption) {
  return labels.gender[language][value];
}

export function localizePreference(language: AppLanguage, value: PreferenceOption) {
  return labels.preference[language][value];
}

export function localizeLanguagePreference(language: AppLanguage, value: LanguagePreference) {
  return labels.language[language][value];
}

export function localizeRating(language: AppLanguage, value: RatingScore) {
  return labels.rating[language][value];
}
