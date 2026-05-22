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
    "Listening for someone nearby...",
    "Finding a live connection...",
    "Matching by language and energy...",
    "Your room is almost here...",

  ],
  el: [
    "Ακούμε για κάποιον κοντά σου...",
    "Βρίσκουμε μια live σύνδεση...",
    "Κάνουμε match με βάση γλώσσα και ενέργεια...",
    "Το room σου ερχεται σε λιγο...",

  ],
} as const;

export const partnerReplies = {
  en: [
    "That felt honest. What kind of conversations stay with you?",
    "I like your pace. What made you open Echoo tonight?",
    "You sound thoughtful. What are you in the mood for right now?",
    "That was a good first line. Want to go a little deeper?",
    "Soft start. I like that. What matters to you lately?",
  ],
  el: [
    "Αυτό ακούστηκε ειλικρινές. Τι είδους κουβέντες σου μένουν;",
    "Μου αρέσει ο ρυθμός σου. Τι σε έφερε στο Echoo απόψε;",
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
      tagline: "Anonymous rooms. Live text. Voice when it feels right. Everything fades.",

      waitlist: "Greece-first MVP",
    },
    nav: {
      home: "Home",
      startNow: "Open a room",

      dashboard: "Dashboard",
      safety: "Safety",
      settings: "Settings",
      support: "Support",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
      about: "About",
      faq: "FAQ",
      retention: "Retention",
      menu: "Menu",
      admin: "Admin",
    },
    landing: {
      heroEyebrow: "Anonymous live conversation",
      heroTitle: "Meet someone nearby or online, without giving away who you are.",
      heroBody:
        "Echoo is a privacy-first space for live one-to-one conversation. Start with text, hold to talk when the room opens, and share temporary media that fades with the room.",

      heroPrimary: "Open a room",

      heroSecondary: "How Echoo works",
      getApp: "Get the app",
      statUsers: "online now",
      statWait: "average wait",
      statSafety: "safety layers",
      whatIsTitle: "What Echoo is",
      whatIsBody:
        "A calm, anonymous space for live conversation. No public feed. No profile browsing. No permanent history.",
      stepsTitle: "How Echoo works",
      whyPhotosTitle: "Why there are no photos",
      whyPhotosBody:
        "Echoo keeps the first impression focused on tone, curiosity, and timing. That makes the conversation feel lighter and more real.",
      safetyTitle: "Privacy and safety",
      safetyBody:
        "Every room includes quick exits, block and report tools, and clear boundaries. Respect is the default.",
      faqTitle: "FAQ",
      contactTitle: "Support and contact",
      contactBody: "Need help, have a question, or want to reach the team?",
      ctaTitle: "Ready for a different kind of conversation?",
      ctaBody: "Open Echoo, create your anonymous profile, and step into a live room in seconds.",

      stickyMenu: "Menu",
      stickySession: "Open a room",

      sections: {
        howItWorks: "How Echoo Works",
        different: "Why Echoo Is Different",
        anonymous: "Anonymous by Design",
        temporary: "Temporary Conversations",
        voice: "Voice mode",

        privacy: "Privacy First",
        safety: "Safety & Respect",
      },
    },
    auth: {
      title: "Create your anonymous profile",
      body: "Sign in with Google or continue as a guest. Echoo keeps your identity light and your setup fast.",
      google: "Continue with Google",
      guest: "Continue as guest",
      reroll: "New name",
      profileTitle: "Your anonymous profile",
      ageRange: "Age range",
      gender: "Gender",
      lookingFor: "Looking for",
      language: "Language",
      interests: "Interests",
      helper: "No real name needed. You can change your filters any time.",
      intro: "A few details help Echoo find better rooms, not better profiles.",

      privacyNote: "Your profile stays private. Your conversations stay temporary.",
      continue: "Continue to Echoo",
    },
    dashboard: {
      title: "Your space is ready",
      body: "Your profile is anonymous, your preferences are saved, and Echoo is ready when you are.",
      startSession: "Open a room",

      profile: "Profile",
      safety: "Safety",
      settings: "Settings",
      online: "People online now",
      wait: "Average wait",
      filters: "Current filters",
      identity: "Your name tonight",
      note: "Text first. Voice later. No pressure.",
      empty: "No active room yet.",
      emptyBody: "Open a room to enter the queue and meet someone live.",

    },
    queue: {
      title: "Listening for your next connection",
      body: "We’re finding someone nearby or online who fits your current vibe and language.",
      cancel: "Leave queue",
      changeFilters: "Adjust preferences",
      found: "A room is opening...",

      relaxed: "No one is free right now. Stay in the queue?",
      offline: "You’re offline. We’ll keep listening when the connection returns.",
      loading: "Opening your space...",
      searching: "Listening...",
      matchFound: "A connection is ready.",
    },
    session: {
      title: "Private room",
      textNote: "Text first. Voice unlocks later if the room stays alive.",
      demoTimer: "This text phase lasts 10 minutes before voice becomes available.",
      leave: "Leave",
      send: "Send",
      placeholder: "Say something simple...",
      emptyChat: "Nothing shared yet. Start with one honest line.",
      voiceUnlocked: "Voice is now available.",
      mediaUnlocked: "Temporary media sharing is now available.",
      startVoice: "Hold to talk",
      keepText: "Keep it text only",
      voiceStarting: "Voice is coming online...",
      connected: "You’re live",
      listening: "Listening...",
      ended: "Room ended.",
      findNew: "Start another room",
      backHome: "Back home",
      howWasIt: "How did it feel?",
      report: "Report room",
      block: "Block connection",
      connectionLost: "The room was interrupted. Trying to reconnect...",

      partnerDisconnected: "The connection ended from the other side.",
      you: "You",
      partner: "Connection",
      countdownLabel: "Voice unlock",
      textPhase: "Text phase",
      audioPhase: "Voice phase",
      mediaPhase: "Media phase",
      liveNow: "Live now",
      noMessages: "Nothing shared yet.",
      pttIdle: "Hold to talk",
      pttActive: "You’re speaking",
      pttRelease: "Release to listen",
      mediaHint: "Share one photo or short clip when it feels earned.",
      whisper: "The room feels quiet. Say hello.",
    },
    safety: {
      title: "Safety comes before chemistry",
      body: "Echoo keeps every room anonymous, temporary, and easy to leave. Respect is the default.",
      rules: [
        "No harassment, hate speech, sexual coercion, or threats.",
        "Leave instantly if a conversation feels wrong.",
        "Report patterns, not only extreme cases.",
        "Voice stays optional after it unlocks.",
      ],
      actions: ["Report connection", "Block connection", "Leave now"],
    },
    settings: {
      title: "Settings",
      body: "Adjust language, filters, and your live experience.",
      appLanguage: "App language",
      queueLanguage: "Matching language",
      lookingFor: "Looking for",
      haptics: "Haptic feedback",
      reconnect: "Reconnect when possible",
      matchSound: "Sound feedback",

      save: "Saved",
      privacy: "Privacy and data",
      account: "Account",
      signOut: "Sign out",
    },
    contact: {
      title: "Contact",
      email: "hello@echoo.app",
      body: "For help, partnerships, trust and safety, or press questions.",
    },
    support: {
      title: "Support",
      body: "If something feels off, reach out and we’ll help as quickly as we can.",
      emailLabel: "Support email",
      responseLabel: "Typical response",
      responseValue: "Within 1-2 business days",
    },
    about: {
      title: "About Echoo",
      body: "Echoo is built around temporary human presence: less pressure than social media, more honesty than a profile feed.",
      philosophy: [
        "Presence first, profile second.",
        "Temporary by default.",
        "Private, lightweight, and human.",
      ],
    },
    retention: {
      title: "Content and data retention",
      body: "Some things disappear with the room. Some account data stays as long as it’s needed to keep Echoo working.",
      sections: [
        "Text, voice, and media in a room are temporary and may expire automatically.",
        "Profile settings and account data remain until you change or delete them.",
        "Safety reports may be retained for review and abuse prevention.",
      ],
    },
    faqPage: {
      title: "Frequently asked questions",
      body: "Short answers for the things people usually want to know first.",
    },
    legal: {
      privacyTitle: "Privacy policy",
      privacyBody:
        "Echoo is designed to keep identity minimal, rooms temporary, and personal data limited to what the service needs.",
      termsTitle: "Terms of service",
      termsBody:
        "Use Echoo respectfully. Do not harass, threaten, or pressure other people. Safety tools and moderation may be used when needed.",
      contentTitle: "Content retention",
      contentBody:
        "Live conversation is temporary by design. Some records may remain for safety, abuse prevention, and service operation.",
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
      stable: "Live and stable",
      noUsers: "No one is available right now. Stay in the queue?",
      sessionReady: "Your room is ready.",
      profileSaved: "Profile updated.",
      blocked: "Connection blocked.",
      reported: "Report sent.",
      ratingSaved: "Thanks for the feedback.",
      signedIn: "You’re signed in anonymously.",
      signedOut: "You’ve signed out.",
      signIn: "Sign in",
      guestSessionReady: "Guest session ready.",
      loading: "Loading...",
      restoring: "Restoring your room...",

      loadingProfile: "Loading your profile...",
      loadingSettings: "Loading your settings...",
      listening: "Listening...",
      reconnectingMoment: "Trying to reconnect...",
      connectionInterrupted: "The room was interrupted.",

      connectionMissing: "Couldn’t reach the other side.",
      noChatYet: "Nothing shared yet.",
      noMediaYet: "No shared content yet.",
      permissionMic: "Microphone access is needed to begin.",
      permissionAudio: "Audio playback is needed to hear the connection.",
      unsupportedFile: "That file type isn’t supported.",
      uploadFailed: "We couldn’t share that right now.",
      emptyState: "Nothing here yet.",
      privacyFirst: "Privacy first.",
    },
    faq: [
      {
        question: "Is Echoo anonymous?",
        answer: "Yes. Echoo is designed so you can meet without revealing your identity.",
      },
      {
        question: "Are conversations stored?",
        answer: "Most live conversation is temporary. Some limited records may remain for safety and service reliability.",
      },
      {
        question: "Does content disappear?",
        answer: "Yes. Text, voice, and shared media are temporary and may expire automatically.",
      },
      {
        question: "Can people see my identity?",
        answer: "No real name is required, and your profile stays minimal by design.",
      },
      {
        question: "How long do sessions last?",
        answer: "Sessions are live and temporary. The text phase unlocks voice later in the room.",
      },
      {
        question: "Is voice communication live?",
        answer: "Yes. Voice is live and only becomes available once the room unlocks it.",

      },
      {
        question: "Can I block or report users?",
        answer: "Yes. Both tools are built into every room.",
      },
      {
        question: "Is Echoo location tracking me?",
        answer: "Echoo uses privacy-first matching and does not need to expose your exact location.",
      },
      {
        question: "What happens to uploaded media?",
        answer: "Media shared in a room is temporary and follows the room’s retention rules.",
      },
      {
        question: "Can I delete my account?",
        answer: "Account controls are kept simple, and you can leave or sign out anytime.",
      },
    ],
  },
  el: {
    brand: {
      name: "Echoo",
      tagline: "Ανώνυμα rooms. Live text. Φωνη οταν ταιριαζει. Ολα σβηνουν.",

      waitlist: "MVP με προτεραιότητα στην Ελλάδα",
    },
    nav: {
      home: "Αρχική",
      startNow: "Ανοιξε ενα room",

      dashboard: "Πίνακας",
      safety: "Ασφάλεια",
      settings: "Ρυθμίσεις",
      support: "Υποστήριξη",
      contact: "Επικοινωνία",
      privacy: "Απόρρητο",
      terms: "Όροι",
      about: "Σχετικά",
      faq: "FAQ",
      retention: "Διατήρηση",
      menu: "Μενού",
      admin: "Διαχείριση",
    },
    landing: {
      heroEyebrow: "Ανώνυμες live συνομιλίες",
      heroTitle: "Γνώρισε κάποιον κοντά σου ή online, χωρίς να αποκαλύψεις ποιος είσαι.",
      heroBody:
        "Το Echoo είναι ένας privacy-first χωρος για live one-to-one κουβεντες. Ξεκινα με text, κρατα για να μιλησεις οταν ανοιγει το room και μοιρασου προσωρινο media που σβηνει μαζι με το room.",

      heroPrimary: "Ανοιξε ενα room",

      heroSecondary: "Πώς λειτουργεί το Echoo",
      getApp: "Κατέβασε την app",
      statUsers: "online τώρα",
      statWait: "μέση αναμονή",
      statSafety: "στρώματα ασφάλειας",
      whatIsTitle: "Τι είναι το Echoo",
      whatIsBody:
        "Ένας ήρεμος, ανώνυμος χώρος για live κουβέντες. Χωρίς δημόσιο feed. Χωρίς περιήγηση σε προφίλ. Χωρίς μόνιμο ιστορικό.",
      stepsTitle: "Πώς λειτουργεί το Echoo",
      whyPhotosTitle: "Γιατί δεν υπάρχουν φωτογραφίες",
      whyPhotosBody:
        "Το Echoo κρατά την πρώτη εντύπωση στο ύφος, την περιέργεια και το timing. Έτσι η κουβέντα νιώθει πιο ελαφριά και πιο αληθινή.",
      safetyTitle: "Απόρρητο και ασφάλεια",
      safetyBody:
        "Κάθε room περιλαμβάνει γρήγορη έξοδο, block/report και καθαρά όρια. Ο σεβασμός είναι ο κανόνας.",
      faqTitle: "FAQ",
      contactTitle: "Υποστήριξη και επικοινωνία",
      contactBody: "Χρειάζεσαι βοήθεια, έχεις απορία ή θέλεις να μιλήσεις με την ομάδα;",
      ctaTitle: "Έτοιμος/η για έναν διαφορετικό τύπο κουβέντας;",
      ctaBody: "Άνοιξε το Echoo, δημιούργησε το ανώνυμο προφίλ σου και μπες σε live room σε δευτερόλεπτα.",

      stickyMenu: "Μενού",
      stickySession: "Ανοιξε ενα room",

      sections: {
        howItWorks: "Πώς λειτουργεί το Echoo",
        different: "Γιατί το Echoo ξεχωρίζει",
        anonymous: "Ανώνυμα by design",
        temporary: "Προσωρινές κουβέντες",
        voice: "Voice mode",

        privacy: "Privacy first",
        safety: "Ασφάλεια και σεβασμός",
      },
    },
    auth: {
      title: "Δημιούργησε το ανώνυμο προφίλ σου",
      body: "Συνδέσου με Google ή συνέχισε ως guest. Το Echoo κρατά την ταυτότητά σου ελαφριά και το setup γρήγορο.",
      google: "Συνέχεια με Google",
      guest: "Συνέχεια ως guest",
      reroll: "Νέο όνομα",
      profileTitle: "Το ανώνυμο προφίλ σου",
      ageRange: "Ηλικιακό εύρος",
      gender: "Φύλο",
      lookingFor: "Αναζητώ",
      language: "Γλώσσα",
      interests: "Ενδιαφέροντα",
      helper: "Δεν χρειάζεται πραγματικό όνομα. Μπορείς να αλλάξεις φίλτρα οποιαδήποτε στιγμή.",
      intro: "Λίγες λεπτομέρειες βοηθούν το Echoo να βρίσκει καλύτερα rooms, όχι καλύτερα προφίλ.",

      privacyNote: "Το προφίλ σου μένει ιδιωτικό. Οι κουβέντες σου μένουν προσωρινές.",
      continue: "Συνέχεια στο Echoo",
    },
    dashboard: {
      title: "Ο χώρος σου είναι έτοιμος",
      body: "Το προφίλ σου είναι ανώνυμο, οι προτιμήσεις σου αποθηκεύονται και το Echoo είναι έτοιμο όταν είσαι κι εσύ.",
      startSession: "Ανοιξε ενα room",

      profile: "Προφίλ",
      safety: "Ασφάλεια",
      settings: "Ρυθμίσεις",
      online: "Άτομα online τώρα",
      wait: "Μέση αναμονή",
      filters: "Τρέχοντα φίλτρα",
      identity: "Το όνομά σου απόψε",
      note: "Πρώτα text. Μετά φωνή. Χωρίς πίεση.",
      empty: "Δεν υπάρχει ενεργο room ακομη.",
      emptyBody: "Ανοιξε ενα room για να μπεις στην ουρά και να γνωρίσεις κάποιον live.",

    },
    queue: {
      title: "Ακούμε για την επόμενη σύνδεσή σου",
      body: "Βρίσκουμε κάποιον κοντά σου ή online που ταιριάζει με το vibe και τη γλώσσα σου.",
      cancel: "Έξοδος από την ουρά",
      changeFilters: "Ρύθμισε προτιμήσεις",
      found: "Ενα room ανοίγει...",

      relaxed: "Δεν είναι διαθέσιμος κανείς τώρα. Να μείνεις στην ουρά;",
      offline: "Είσαι offline. Θα συνεχίσουμε όταν επιστρέψει η σύνδεση.",
      loading: "Ανοίγουμε τον χώρο σου...",
      searching: "Ακούμε...",
      matchFound: "Η σύνδεση είναι έτοιμη.",
    },
    session: {
      title: "Ιδιωτικό room",
      textNote: "Το text είναι προσωρινό. Η φωνή ανοίγει αργότερα αν το room συνεχίζει να ζει.",
      demoTimer: "Η φάση text κρατά 10 λεπτά πριν γίνει διαθέσιμη η φωνή.",
      leave: "Έξοδος",
      send: "Αποστολή",
      placeholder: "Πες κάτι απλό...",
      emptyChat: "Δεν μοιράστηκε τίποτα ακόμη. Ξεκίνα με μία μικρή, ειλικρινή φράση.",
      voiceUnlocked: "Η φωνή είναι τώρα διαθέσιμη.",
      mediaUnlocked: "Η προσωρινή κοινή χρήση media είναι τώρα διαθέσιμη.",
      startVoice: "Κράτα για να μιλήσεις",
      keepText: "Μείνε μόνο στο text",
      voiceStarting: "Η φωνή συνδέεται...",
      connected: "Είσαι live",
      listening: "Ακούμε...",
      ended: "Το room έληξε.",
      findNew: "Ξεκίνα άλλο room",
      backHome: "Πίσω στην αρχική",
      howWasIt: "Πώς σου φάνηκε;",
      report: "Αναφορά room",
      block: "Αποκλεισμός σύνδεσης",
      connectionLost: "Το room διακόπηκε. Προσπαθούμε να επανασυνδεθούμε...",

      partnerDisconnected: "Η σύνδεση έκλεισε από την άλλη πλευρά.",
      you: "Εσύ",
      partner: "Η σύνδεση",
      countdownLabel: "Ξεκλείδωμα φωνής",
      textPhase: "Φάση text",
      audioPhase: "Φάση φωνής",
      mediaPhase: "Φάση media",
      liveNow: "Live τώρα",
      noMessages: "Δεν μοιράστηκε τίποτα ακόμη.",
      pttIdle: "Κράτα για να μιλήσεις",
      pttActive: "Μιλάς τώρα",
      pttRelease: "Άφησε για να ακούσεις",
      mediaHint: "Μοίρασε μία φωτογραφία ή ένα σύντομο clip όταν το room το αξίζει.",

      whisper: "Το room είναι ήσυχο. Πες ένα γεια.",
    },
    safety: {
      title: "Η ασφάλεια προηγείται της χημείας",
      body: "Το Echoo κρατά κάθε room ανώνυμο, προσωρινό και εύκολο να το αφήσεις. Ο σεβασμός είναι ο κανόνας.",
      rules: [
        "Όχι παρενόχληση, hate speech, σεξουαλική πίεση ή απειλές.",
        "Φύγε αμέσως αν μια κουβέντα δεν σου κάθεται καλά.",
        "Κάνε report σε μοτίβα συμπεριφοράς, όχι μόνο σε ακραία περιστατικά.",
        "Η φωνή παραμένει προαιρετική αφού ξεκλειδώσει.",
      ],
      actions: ["Αναφορά σύνδεσης", "Αποκλεισμός σύνδεσης", "Έξοδος τώρα"],
    },
    settings: {
      title: "Ρυθμίσεις",
      body: "Ρύθμισε γλώσσα, φίλτρα και την live εμπειρία σου.",
      appLanguage: "Γλώσσα εφαρμογής",
      queueLanguage: "Γλώσσα matching",
      lookingFor: "Αναζητώ",
      haptics: "Δόνηση",
      reconnect: "Επανασύνδεση όταν γίνεται",
      matchSound: "Ήχοι feedback",

      save: "Αποθηκεύτηκε",
      privacy: "Απόρρητο και δεδομένα",
      account: "Λογαριασμός",
      signOut: "Έξοδος",
    },
    contact: {
      title: "Επικοινωνία",
      email: "hello@echoo.app",
      body: "Για βοήθεια, συνεργασίες, trust & safety ή ερωτήσεις από τον Τύπο.",
    },
    support: {
      title: "Υποστήριξη",
      body: "Αν κάτι δεν φαίνεται σωστό, στείλε μας μήνυμα και θα βοηθήσουμε όσο πιο γρήγορα γίνεται.",
      emailLabel: "Email υποστήριξης",
      responseLabel: "Συνήθης χρόνος απάντησης",
      responseValue: "Μέσα σε 1-2 εργάσιμες ημέρες",
    },
    about: {
      title: "Σχετικά με το Echoo",
      body: "Το Echoo χτίζεται γύρω από την προσωρινή ανθρώπινη παρουσία: λιγότερη πίεση από τα social, περισσότερη ειλικρίνεια από ένα feed προφίλ.",
      philosophy: [
        "Η παρουσία πρώτα, το προφίλ μετά.",
        "Προσωρινό by default.",
        "Ιδιωτικό, ελαφρύ και ανθρώπινο.",
      ],
    },
    retention: {
      title: "Διατήρηση περιεχομένου και δεδομένων",
      body: "Κάποια πράγματα εξαφανίζονται μαζί με το room. Κάποια δεδομένα λογαριασμού μένουν όσο χρειάζεται για να λειτουργεί το Echoo.",
      sections: [
        "Το text, η φωνή και το media μέσα σε ένα room είναι προσωρινά και μπορεί να λήγουν αυτόματα.",
        "Οι ρυθμίσεις προφίλ και τα δεδομένα λογαριασμού παραμένουν μέχρι να τα αλλάξεις ή να τα διαγράψεις.",
        "Τα reports ασφάλειας μπορεί να διατηρούνται για έλεγχο και αποτροπή κατάχρησης.",
      ],
    },
    faqPage: {
      title: "Συχνές ερωτήσεις",
      body: "Σύντομες απαντήσεις για τα πράγματα που συνήθως θέλουν να ξέρουν πρώτα οι άνθρωποι.",
    },
    legal: {
      privacyTitle: "Πολιτική απορρήτου",
      privacyBody:
        "Το Echoo σχεδιάζεται για να κρατά την ταυτότητα ελάχιστη, τα rooms προσωρινά και τα προσωπικά δεδομένα περιορισμένα σε ό,τι πραγματικά χρειάζεται η υπηρεσία.",
      termsTitle: "Όροι χρήσης",
      termsBody:
        "Χρησιμοποίησε το Echoo με σεβασμό. Μην παρενοχλείς, απειλείς ή πιέζεις άλλους ανθρώπους. Τα εργαλεία ασφάλειας και η moderation μπορεί να χρησιμοποιηθούν όταν χρειάζεται.",
      contentTitle: "Διατήρηση περιεχομένου",
      contentBody:
        "Η live κουβέντα είναι προσωρινή by design. Κάποια records μπορεί να παραμείνουν για ασφάλεια, αποτροπή κατάχρησης και λειτουργία της υπηρεσίας.",
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
      stable: "Live και σταθερό",
      noUsers: "Δεν είναι διαθέσιμος κανείς τώρα. Να μείνεις στην ουρά;",
      sessionReady: "Το room σου είναι έτοιμο.",
      profileSaved: "Το προφίλ ενημερώθηκε.",
      blocked: "Η σύνδεση μπλοκαρίστηκε.",
      reported: "Η αναφορά στάλθηκε.",
      ratingSaved: "Ευχαριστούμε για το feedback.",
      signedIn: "Έχεις συνδεθεί ανώνυμα.",
      signedOut: "Έχεις αποσυνδεθεί.",
      signIn: "Σύνδεση",
      guestSessionReady: "Η guest συνεδρία είναι έτοιμη.",
      loading: "Φορτώνουμε...",
      restoring: "Επαναφέρουμε το room σου...",

      loadingProfile: "Φορτώνουμε το προφίλ σου...",
      loadingSettings: "Φορτώνουμε τις ρυθμίσεις σου...",
      listening: "Ακούμε...",
      reconnectingMoment: "Προσπαθούμε να επανασυνδεθούμε...",
      connectionInterrupted: "Το room διακόπηκε.",

      connectionMissing: "Δεν μπορέσαμε να φτάσουμε στην άλλη πλευρά.",
      noChatYet: "Δεν μοιράστηκε τίποτα ακόμη.",
      noMediaYet: "Δεν έχει μοιραστεί περιεχόμενο ακόμη.",
      permissionMic: "Χρειάζεται άδεια μικροφώνου για να ξεκινήσεις.",
      permissionAudio: "Χρειάζεται αναπαραγωγή ήχου για να ακούσεις τη σύνδεση.",
      unsupportedFile: "Αυτός ο τύπος αρχείου δεν υποστηρίζεται.",
      uploadFailed: "Δεν μπορέσαμε να το μοιραστούμε αυτή τη στιγμή.",
      emptyState: "Δεν υπάρχει ακόμη τίποτα εδώ.",
      privacyFirst: "Το απόρρητο πρώτα.",
    },
    faq: [
      {
        question: "Είναι το Echoo ανώνυμο;",
        answer: "Ναι. Το Echoo έχει σχεδιαστεί για να γνωρίζεσαι με άλλους χωρίς να αποκαλύπτεις την ταυτότητά σου.",
      },
      {
        question: "Αποθηκεύονται οι κουβέντες;",
        answer: "Το μεγαλύτερο μέρος της live κουβέντας είναι προσωρινό. Κάποια περιορισμένα records μπορεί να μένουν για ασφάλεια και αξιοπιστία.",
      },
      {
        question: "Το περιεχόμενο εξαφανίζεται;",
        answer: "Ναι. Το text, η φωνή και τα shared media είναι προσωρινά και μπορεί να λήγουν αυτόματα.",
      },
      {
        question: "Μπορούν να δουν την ταυτότητά μου;",
        answer: "Δεν χρειάζεται πραγματικό όνομα και το προφίλ σου μένει ελάχιστο by design.",
      },
      {
        question: "Πόσο διαρκούν τα sessions;",
        answer: "Τα sessions είναι live και προσωρινά. Η text φάση ξεκλειδώνει αργότερα τη φωνή μέσα στο room.",
      },
      {
        question: "Η φωνή είναι live;",
        answer: "Ναι. Η φωνή είναι live και γίνεται διαθέσιμη μόνο όταν το room την ξεκλειδωσει.",

      },
      {
        question: "Μπορώ να μπλοκάρω ή να κάνω report;",
        answer: "Ναι. Και τα δύο εργαλεία υπάρχουν μέσα σε κάθε room.",
      },
      {
        question: "Το Echoo με παρακολουθεί τοποθεσιακά;",
        answer: "Το Echoo χρησιμοποιεί privacy-first matching και δεν χρειάζεται να αποκαλύπτει την ακριβή τοποθεσία σου.",
      },
      {
        question: "Τι γίνεται με τα media που ανεβάζω;",
        answer: "Τα media που μοιράζεσαι σε ένα room είναι προσωρινά και ακολουθούν τους κανόνες διατήρησης του room.",
      },
      {
        question: "Μπορώ να διαγράψω τον λογαριασμό μου;",
        answer: "Οι έλεγχοι του λογαριασμού είναι απλοί και μπορείς να φύγεις ή να αποσυνδεθείς οποιαδήποτε στιγμή.",
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
