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
export const genderOptions: GenderOption[] = [
  "male",
  "female",
  "nonbinary",
  "prefer-not",
];
export const preferenceOptions: PreferenceOption[] = ["male", "female", "anyone"];
export const languageOptions: LanguagePreference[] = ["greek", "english", "both"];
export const ratingOptions: RatingScore[] = ["good", "neutral", "bad"];

export const queueMessages = {
  en: [
    "Searching for someone...",
    "Matching your vibe...",
    "Someone just joined...",
    "Almost ready...",
  ],
  el: [
    "Ψάχνουμε κάποιον...",
    "Ταιριάζουμε το vibe σου...",
    "Κάποιος μόλις μπήκε...",
    "Σχεδόν έτοιμο...",
  ],
} as const;

export const partnerReplies = {
  en: [
    "I like that energy. What made you start a session tonight?",
    "That feels honest. What do you usually avoid saying out loud?",
    "You sound thoughtful. Athens or island energy?",
    "I love that. What kind of conversations stay with you?",
    "That was a good first line. Want to go deeper?",
  ],
  el: [
    "Μου αρέσει αυτή η ενέργεια. Τι σε έκανε να μπεις απόψε;",
    "Ακούγεται ειλικρινές. Τι αποφεύγεις συνήθως να πεις δυνατά;",
    "Ακούγεσαι σκεπτικός. Αθήνα ή νησί για mood;",
    "Μου άρεσε αυτό. Ποιες κουβέντες σου μένουν περισσότερο;",
    "Ωραία πρώτη γραμμή. Πάμε λίγο πιο βαθιά;",
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
      tagline: "First words. Then voice. No photos. No swipes. Just connection.",
      waitlist: "Launch-ready MVP for Greece",
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
      heroEyebrow: "Anonymous real-time conversations",
      heroTitle: "Meet a stranger through words before anything else.",
      heroBody:
        "Echoo is a mobile-first anonymous conversation app for instant 1-to-1 sessions. Start with text, unlock voice after time, and keep the focus on emotional chemistry instead of appearances.",
      heroPrimary: "Start now",
      heroSecondary: "See how it works",
      getApp: "Get the app",
      statUsers: "online now",

      statWait: "avg wait",
      statSafety: "moderated layers",
      whatIsTitle: "What is Echoo",
      whatIsBody:
        "A premium-feeling space for honest, anonymous one-to-one conversations. No profile photos. No public feed. No swiping loop.",
      stepsTitle: "How it works",
      whyPhotosTitle: "Why no photos",
      whyPhotosBody:
        "By removing photos, Echoo moves attention to tone, curiosity, timing, and emotional safety. The first impression becomes language, not looks.",
      safetyTitle: "Safety first",
      safetyBody:
        "Block, report, respectful behavior reminders, and fast exits are built into every session. Abuse gets disconnected quickly.",
      faqTitle: "FAQ",
      contactTitle: "Contact",
      contactBody: "Questions, partnerships, or early pilot interest? Reach the Echoo team.",
      ctaTitle: "Ready for a different kind of conversation?",
      ctaBody: "Open the app, create an anonymous profile, and get matched in seconds.",
      stickyMenu: "Menu",
      stickySession: "Start session",
    },
    auth: {
      title: "Create your anonymous account",
      body: "Use Google or a guest session. Echoo keeps the profile anonymous by default.",
      google: "Continue with Google",
      guest: "Continue as guest",

      reroll: "Reroll username",
      profileTitle: "Anonymous profile",
      ageRange: "Age range",
      gender: "Gender",
      lookingFor: "Looking for",
      language: "Language",
      interests: "Interests",
      helper: "No real names required. You can update filters later in settings.",
    },
    dashboard: {
      title: "You are ready to connect",
      body: "Your profile is anonymous, your filters are saved, and Echoo is ready when you are.",
      startSession: "Start session",
      profile: "Profile",
      safety: "Safety",
      settings: "Settings",
      online: "Users online now",
      wait: "Avg wait time",
      filters: "Current filters",
      identity: "Your nickname tonight",
      note: "Text first, voice later. No pressure, no swipes.",
    },
    queue: {
      title: "Finding your next conversation",
      body: "We match you with the next available Echoer. Simple, fast, and vibe-first.",
      cancel: "Cancel",
      changeFilters: "Change preferences",
      found: "Connection found",
      relaxed: "No one available right now. Stay in queue?",
      offline: "Connection lost. Reconnecting...",

    },
    session: {
      title: "Private room",
      textNote: "Voice unlocks after the timer ends.",
      demoTimer: "The text phase lasts 10 minutes before voice unlocks.",
      leave: "Leave",
      send: "Send",
      placeholder: "Write your first message...",
      voiceUnlocked: "Voice is now available",
      mediaUnlocked: "You’ve spent some time together. Media sharing is now available.",
      startVoice: "Start voice chat",

      keepText: "Keep text only",
      voiceStarting: "Voice connection starting...",

      connected: "Voice is live",

      ended: "Connection ended.",
      findNew: "Find new person",
      backHome: "Back home",
      howWasIt: "How was it?",
      report: "Report user",
      block: "Block user",
      connectionLost: "Connection lost. Reconnecting...",
      partnerDisconnected: "The other user left the session.",
      you: "You",
      partner: "Echoer",
      countdownLabel: "Voice unlock",
    },

    safety: {
      title: "Safety comes before chemistry",
      body: "Echoo keeps every room lightweight, anonymous, and easy to leave. Respect is the default rule.",
      rules: [
        "No harassment, hate speech, sexual coercion, or threats.",
        "Leave instantly if a conversation feels wrong.",
        "Report patterns, not just extreme cases.",
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
        "Echoo is built around minimal identity, private rooms, and clear user controls. Personal data should stay limited to what is necessary to run the service.",
      termsTitle: "Terms",
      termsBody:
        "Use Echoo respectfully, do not abuse others, and understand that anonymous rooms may be moderated through reports and safety systems.",
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
      noUsers: "No one available right now. Stay in queue?",

      sessionReady: "Your room is ready.",

      profileSaved: "Profile updated.",
      blocked: "User blocked.",
      reported: "Report submitted.",
      ratingSaved: "Thanks for the feedback.",
      signedIn: "You are signed in anonymously.",
      signedOut: "You have signed out.",
    },
    faq: [
      {
        question: "Is this a dating app?",
        answer: "No. Echoo is designed around anonymous conversation and human connection, not profile browsing or swiping.",
      },
      {
        question: "When does voice become available?",
        answer: "Voice unlocks only after the text phase timer ends, and both people can still stay text-only.",
      },
      {
        question: "Do I need to upload photos?",
        answer: "No. Echoo intentionally removes photos to reduce superficial matching.",
      },
    ],
  },
  el: {
    brand: {
      name: "Echoo",
      tagline: "Πρώτες λέξεις. Μετά φωνή. Χωρίς φωτογραφίες. Χωρίς swipes. Μόνο σύνδεση.",
      waitlist: "MVP έτοιμο για launch στην Ελλάδα",
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
      heroEyebrow: "Ανώνυμες συνομιλίες σε πραγματικό χρόνο",
      heroTitle: "Γνώρισε έναν άγνωστο μέσα από λέξεις πριν από οτιδήποτε άλλο.",
      heroBody:
        "Το Echoo είναι μια mobile-first ανώνυμη εφαρμογή για άμεσες 1-to-1 συνομιλίες. Ξεκινάς με κείμενο, ξεκλειδώνεις φωνή μετά από χρόνο και η χημεία χτίζεται χωρίς εικόνες.",
      heroPrimary: "Ξεκίνα τώρα",
      heroSecondary: "Δες πώς δουλεύει",
      getApp: "Κατέβασε την app",
      statUsers: "online τώρα",

      statWait: "μέση αναμονή",
      statSafety: "στρώματα ασφάλειας",
      whatIsTitle: "Τι είναι το Echoo",
      whatIsBody:
        "Ένας premium χώρος για ειλικρινείς, ανώνυμες one-to-one συνομιλίες. Χωρίς φωτογραφίες προφίλ. Χωρίς δημόσιο feed. Χωρίς ατελείωτα swipes.",
      stepsTitle: "Πώς λειτουργεί",
      whyPhotosTitle: "Γιατί χωρίς φωτογραφίες",
      whyPhotosBody:
        "Αφαιρώντας τις φωτογραφίες, το Presence μεταφέρει την προσοχή στον τόνο, την περιέργεια, τον χρόνο και την συναισθηματική ασφάλεια. Η πρώτη εντύπωση γίνεται η γλώσσα, όχι η εμφάνιση.",
      safetyTitle: "Πρώτα η ασφάλεια",
      safetyBody:
        "Block, report, υπενθυμίσεις σεβασμού και άμεση έξοδος υπάρχουν σε κάθε session. Η κακοποιητική συμπεριφορά κόβεται γρήγορα.",
      faqTitle: "FAQ",
      contactTitle: "Επικοινωνία",
      contactBody: "Ερωτήσεις, συνεργασίες ή ενδιαφέρον για early pilot; Μίλησε με την ομάδα του Presence.",
      ctaTitle: "Έτοιμος για ένα διαφορετικό είδος συνομιλίας;",
      ctaBody: "Άνοιξε την εφαρμογή, δημιούργησε ανώνυμο προφίλ και κάνε match μέσα σε δευτερόλεπτα.",
      stickyMenu: "Μενού",
      stickySession: "Έναρξη session",
    },
    auth: {
      title: "Δημιούργησε τον ανώνυμο λογαριασμό σου",
      body: "Συνδέσου με Google ή ως guest. Το Presence κρατά το προφίλ ανώνυμο από προεπιλογή.",
      google: "Συνέχεια με Google",
      guest: "Συνέχεια ως guest",

      reroll: "Νέο username",
      profileTitle: "Ανώνυμο προφίλ",
      ageRange: "Ηλικιακό εύρος",
      gender: "Φύλο",
      lookingFor: "Αναζητώ",
      language: "Γλώσσα",
      interests: "Ενδιαφέροντα",
      helper: "Δεν χρειάζονται πραγματικά ονόματα. Μπορείς να αλλάξεις φίλτρα αργότερα στις ρυθμίσεις.",
    },
    dashboard: {
      title: "Είσαι έτοιμος να συνδεθείς",
      body: "Το προφίλ σου είναι ανώνυμο, τα φίλτρα σου είναι αποθηκευμένα και το Presence είναι έτοιμο όταν είσαι κι εσύ.",
      startSession: "Έναρξη session",
      profile: "Προφίλ",
      safety: "Ασφάλεια",
      settings: "Ρυθμίσεις",
      online: "Χρήστες online τώρα",
      wait: "Μέσος χρόνος αναμονής",
      filters: "Τρέχοντα φίλτρα",
      identity: "Το ψευδώνυμό σου απόψε",
      note: "Πρώτα κείμενο, μετά φωνή. Χωρίς πίεση, χωρίς swipes.",
    },
    queue: {
      title: "Βρίσκουμε την επόμενη συνομιλία σου",
      body: "Σε συνδέουμε με τον επόμενο διαθέσιμο Echoer. Απλό, γρήγορο και με vibe.",
      cancel: "Ακύρωση",
      changeFilters: "Αλλαγή προτιμήσεων",
      found: "Βρέθηκε σύνδεση",
      relaxed: "Δεν βρέθηκε ακριβές match ακόμα, ανοίγουμε λίγο περισσότερο την αναζήτηση.",
      offline: "Είσαι offline. Το matching θα συνεχιστεί μόλις επανέλθει η σύνδεση.",
    },
    session: {
      title: "Ιδιωτικό δωμάτιο",
      textNote: "Η φωνή ξεκλειδώνει όταν τελειώσει ο χρονοδιακόπτης.",
      demoTimer: "Η φάση κειμένου κρατά 10 λεπτά πριν ξεκλειδώσει η φωνή.",
      leave: "Αποχώρηση",
      send: "Αποστολή",
      placeholder: "Γράψε το πρώτο σου μήνυμα...",
      voiceUnlocked: "Η φωνή είναι τώρα διαθέσιμη",
      mediaUnlocked: "Έχετε περάσει λίγο χρόνο μαζί. Το media sharing είναι τώρα διαθέσιμο.",
      startVoice: "Έναρξη voice chat",

      keepText: "Μόνο κείμενο",
      voiceStarting: "Ξεκινά η φωνητική σύνδεση...",

      connected: "Η φωνή συνδέθηκε",
      ended: "Η σύνδεση ολοκληρώθηκε.",
      findNew: "Βρες νέο άτομο",
      backHome: "Πίσω στην αρχική",
      howWasIt: "Πώς ήταν η συζήτηση;",

      report: "Αναφορά χρήστη",
      block: "Αποκλεισμός χρήστη",
      connectionLost: "Connection lost. Reconnecting...",
      partnerDisconnected: "Ο άλλος χρήστης έφυγε από το session.",
      you: "Εσύ",

      partner: "Echoer",
      countdownLabel: "Ξεκλείδωμα φωνής",
    },
    safety: {
      title: "Η ασφάλεια έρχεται πριν από τη χημεία",
      body: "Το Presence κρατά κάθε δωμάτιο ελαφρύ, ανώνυμο και εύκολο να το αφήσεις. Ο σεβασμός είναι ο βασικός κανόνας.",
      rules: [
        "Όχι παρενόχληση, hate speech, σεξουαλική πίεση ή απειλές.",
        "Φύγε αμέσως αν μια συζήτηση σε κάνει να νιώσεις άσχημα.",
        "Κάνε report σε μοτίβα συμπεριφοράς, όχι μόνο στα ακραία περιστατικά.",
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
        "Το Echoo σχεδιάζεται γύρω από την ελάχιστη ταυτότητα, τα ιδιωτικά δωμάτια και τον σαφή έλεγχο του χρήστη. Τα προσωπικά δεδομένα πρέπει να περιορίζονται μόνο σε όσα χρειάζονται για τη λειτουργία της υπηρεσίας.",
      termsTitle: "Όροι",
      termsBody:
        "Χρησιμοποίησε το Echoo με σεβασμό, μην κακομεταχειρίζεσαι άλλους χρήστες και να γνωρίζεις ότι τα ανώνυμα δωμάτια μπορούν να εποπτεύονται μέσω reports και μηχανισμών ασφάλειας.",
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
      reconnecting: "Επανασύνδεση",
      stable: "Realtime σταθερό",
      noUsers: "Κανείς δεν είναι διαθέσιμος τώρα. Δοκίμασε ξανά σε λίγα λεπτά.",

      sessionReady: "Το δωμάτιό σου είναι έτοιμο.",
      profileSaved: "Το προφίλ ενημερώθηκε.",
      blocked: "Ο χρήστης μπλοκαρίστηκε.",
      reported: "Η αναφορά στάλθηκε.",
      ratingSaved: "Ευχαριστούμε για το feedback.",
      signedIn: "Έχεις συνδεθεί ανώνυμα.",
      signedOut: "Έχεις αποσυνδεθεί.",
    },
    faq: [
      {
        question: "Είναι dating app;",
        answer: "Όχι. Το Presence είναι σχεδιασμένο γύρω από την ανώνυμη συνομιλία και την ανθρώπινη σύνδεση, όχι την περιήγηση σε προφίλ ή τα swipes.",
      },
      {
        question: "Πότε ανοίγει η φωνή;",
        answer: "Η φωνή ξεκλειδώνει μόνο αφού ολοκληρωθεί η φάση του κειμένου και οι δύο πλευρές μπορούν να παραμείνουν μόνο στο text.",
      },
      {
        question: "Χρειάζονται φωτογραφίες;",
        answer: "Όχι. Το Presence αφαιρεί συνειδητά τις φωτογραφίες για να μειώσει το superficial matching.",
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
