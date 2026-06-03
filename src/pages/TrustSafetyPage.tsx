import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { Link } from "react-router-dom";
import { AlertTriangle, Ban, MapPin, ShieldAlert, ShieldCheck, Sparkles, TimerReset, UserRound } from "lucide-react";

const TrustSafetyPage = () => {
  const { language } = usePresence();

  const safetySections =
    language === "en"
      ? [
          { title: "Blocking", body: "Blocking keeps you out of future rooms with that account. It is immediate and private." },
          { title: "Reporting", body: "Reports go to moderation. Repeated abuse can lead to review, suspension, or bans." },
          { title: "Nearby / Away", body: "Nearby / Away only uses a coarse location signal so people understand whether they are roughly close or farther apart. No exact location is exposed to other users." },
          { title: "Temporary rooms", body: "Rooms end automatically, and content is built to fade with them." },
          { title: "Emotional safety", body: "If a conversation feels heavy, strange, or manipulative, leaving is always allowed." },
        ]
      : [
          { title: "Αποκλεισμός", body: "Ο αποκλεισμός σε κρατά έξω από μελλοντικά rooms με αυτόν τον λογαριασμό. Γίνεται αμέσως και ιδιωτικά." },
          { title: "Αναφορά", body: "Τα reports πηγαίνουν στη moderation. Η επαναλαμβανόμενη κατάχρηση μπορεί να οδηγήσει σε έλεγχο, αναστολή ή bans." },
          { title: "Προσωρινά rooms", body: "Τα rooms τελειώνουν αυτόματα και το περιεχόμενο είναι φτιαγμένο να σβήνει μαζί τους." },
          { title: "Συναισθηματική ασφάλεια", body: "Αν μια κουβέντα νιώθει βαριά, περίεργη ή χειριστική, η έξοδος είναι πάντα επιτρεπτή." },
        ];

  const privacySections =
    language === "en"
      ? [
          "We collect the basics needed to run the app: account information from email authentication or Google login, your anonymous profile settings, room activity, reports, and simple usage events that help Echoo stay stable.",
          "If you sign in with email, we use that only to authenticate the account. If you sign in with Google, we use the Google account connection to sign you in. We do not expose your email to other users.",
          "Messages, voice moments, and uploaded media are temporary by design. Rooms end automatically, shared content expires, and media is removed after it has served its purpose.",
          "When a room uses location access, Echoo only reads a coarse approximate position so it can show whether the other person is Nearby or Away. We do not show exact addresses or live location pins to other users.",
          "Reports, blocks, suspensions, and bans are stored so we can protect people and stop repeat abuse. We may keep a small moderation trail for review, abuse prevention, and platform safety.",
          "We use lightweight analytics and in-app events to understand reliability, queues, and safety signals. We also use local storage for simple app preferences like language, queue settings, and session state.",
          "If you are in the EU or UK, you can ask to access, correct, delete, or limit certain data. You can also ask questions about what we keep and why.",
        ]
      : [
          "Συλλέγουμε τα βασικά που χρειάζονται για να λειτουργεί η app: πληροφορίες λογαριασμού από email authentication ή Google login, τις ρυθμίσεις του ανώνυμου προφίλ σου, δραστηριότητα στα rooms, reports και απλά events χρήσης που βοηθούν το Echoo να παραμένει σταθερό.",
          "Αν συνδεθείς με email, το χρησιμοποιούμε μόνο για να γίνει authentication ο λογαριασμός. Αν συνδεθείς με Google, χρησιμοποιούμε τη σύνδεση του Google λογαριασμού μόνο για να σε βάλουμε μέσα. Δεν εμφανίζουμε το email σου σε άλλους ανθρώπους.",
          "Τα μηνύματα, οι φωνητικές στιγμές και τα uploaded media είναι προσωρινά by design. Τα rooms τελειώνουν αυτόματα, το shared content λήγει και τα media αφαιρούνται όταν ολοκληρώσουν τον σκοπό τους.",
          "Όταν ένα room χρησιμοποιεί πρόσβαση τοποθεσίας, το Echoo διαβάζει μόνο μια χονδρική, κατά προσέγγιση θέση ώστε να δείχνει αν ο άλλος είναι Nearby ή Away. Δεν εμφανίζουμε ακριβείς διευθύνσεις ή live pins σε άλλους χρήστες.",
          "Τα reports, τα blocks, οι αναστολές και τα bans αποθηκεύονται για να προστατεύουμε τους ανθρώπους και να σταματάμε την επαναλαμβανόμενη κατάχρηση. Μπορεί να κρατάμε ένα μικρό moderation trail για έλεγχο και ασφάλεια.",
          "Χρησιμοποιούμε ελαφριά analytics και in-app events για να καταλαβαίνουμε τη σταθερότητα, τις ουρές και τα σήματα ασφάλειας. Χρησιμοποιούμε επίσης local storage για απλές προτιμήσεις όπως γλώσσα, queue settings και κατάσταση session.",
          "Αν βρίσκεσαι στην ΕΕ ή στο Ηνωμένο Βασίλειο, μπορείς να ζητήσεις πρόσβαση, διόρθωση, διαγραφή ή περιορισμό ορισμένων δεδομένων. Μπορείς επίσης να ρωτήσεις τι κρατάμε και γιατί.",
        ];

  const termsSections =
    language === "en"
      ? [
          { title: "Be respectful", body: "No harassment, intimidation, hate speech, coercion, stalking, or pressure of any kind." },
          { title: "No illegal or harmful content", body: "Do not share illegal material, explicit sexual content that crosses boundaries, threats, or anything meant to harm another person." },
          { title: "No impersonation or spam", body: "Do not pretend to be someone else, use bots to abuse the app, or flood rooms with repeated messages." },
          { title: "Respect anonymity", body: "Echoo is anonymous, but you are still responsible for how you behave." },
          { title: "Rooms are temporary", body: "Rooms can end automatically. Media, voice, and text are temporary and may disappear." },
          { title: "Safety actions matter", body: "Reports, suspensions, and bans may be applied when behaviour crosses the line or repeats after warnings." },
        ]
      : [
          { title: "Μίλα με σεβασμό", body: "Όχι παρενόχληση, εκφοβισμός, hate speech, καταναγκασμός, stalking ή πίεση οποιασδήποτε μορφής." },
          { title: "Όχι παράνομο ή επιβλαβές περιεχόμενο", body: "Μην μοιράζεσαι παράνομο υλικό, ακραίο σεξουαλικό περιεχόμενο που ξεπερνά τα όρια, απειλές ή οτιδήποτε έχει στόχο να βλάψει άλλον άνθρωπο." },
          { title: "Όχι impersonation ή spam", body: "Μην προσποιείσαι ότι είσαι άλλος άνθρωπος, μην χρησιμοποιείς bots για κατάχρηση της app και μην γεμίζεις rooms με επαναλαμβανόμενα μηνύματα." },
          { title: "Σεβάσου την ανωνυμία", body: "Το Echoo είναι ανώνυμο, αλλά εσύ παραμένεις υπεύθυνος/η για τη συμπεριφορά σου." },
          { title: "Τα rooms είναι προσωρινά", body: "Τα rooms μπορούν να τελειώσουν αυτόματα. Media, φωνή και text είναι προσωρινά και μπορεί να εξαφανιστούν." },
          { title: "Τα μέτρα ασφάλειας έχουν σημασία", body: "Reports, αναστολές και bans μπορεί να εφαρμοστούν όταν η συμπεριφορά ξεπερνά τα όρια ή επαναλαμβάνεται μετά από προειδοποιήσεις." },
        ];

  const supportText =
    language === "en"
      ? "If something feels off, reach out and we’ll help as quickly as we can."
      : "Αν κάτι δεν φαίνεται σωστό, στείλε μας μήνυμα και θα βοηθήσουμε όσο πιο γρήγορα γίνεται.";

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow={language === "en" ? "Trust & Safety" : "Ασφάλεια και εμπιστοσύνη"}
            title={language === "en" ? "Trust & Safety" : "Ασφάλεια και εμπιστοσύνη"}
            body={
              language === "en"
                ? "Safety, privacy, and the rules that keep Echoo calm."
                : "Ασφάλεια, απόρρητο και οι κανόνες που κρατούν το Echoo ήρεμο."
            }
          />
          <div className="flex flex-wrap gap-2">
            <a href="#safety" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white">
              {language === "en" ? "Safety" : "Ασφάλεια"}
            </a>
            <a href="#privacy" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white">
              {language === "en" ? "Privacy" : "Απόρρητο"}
            </a>
            <a href="#terms" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white">
              {language === "en" ? "Terms" : "Όροι"}
            </a>
          </div>
        </div>
      </Surface>

      <div className="md:hidden">
        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem value="safety" className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5">
            <AccordionTrigger className="text-left text-lg font-medium text-white hover:no-underline">
              <span id="safety">{language === "en" ? "Safety" : "Ασφάλεια"}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-1 text-white/65">
              <div className="grid gap-3">
                {safetySections.map((section) => (
                  <div key={section.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <h3 className="text-sm font-medium text-white">{section.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/60">{section.body}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="privacy" className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5">
            <AccordionTrigger className="text-left text-lg font-medium text-white hover:no-underline">
              <span id="privacy">{language === "en" ? "Privacy" : "Απόρρητο"}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-1 text-white/65">
              <div className="grid gap-3">
                {privacySections.map((section) => (
                  <div key={section} className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/60">
                    {section}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="terms" className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5">
            <AccordionTrigger className="text-left text-lg font-medium text-white hover:no-underline">
              <span id="terms">{language === "en" ? "Terms" : "Όροι"}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-1 text-white/65">
              <div className="grid gap-3">
                {termsSections.map((section) => (
                  <div key={section.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <h3 className="text-sm font-medium text-white">{section.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/60">{section.body}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="hidden space-y-4 md:block">
        <div className="grid gap-4 md:grid-cols-2">
          <Surface id="safety" className="space-y-4 p-6">
            <SectionTitle
              title={language === "en" ? "Safety" : "Ασφάλεια"}
              body={
                language === "en"
                  ? "The goal is not to police feelings. The goal is to give people clear exits, quiet boundaries, and enough protection to speak honestly."
                  : "Ο στόχος δεν είναι να ελέγξουμε τα συναισθήματα. Ο στόχος είναι να δίνουμε καθαρές εξόδους, ήσυχα όρια και αρκετή προστασία ώστε να μιλάς αληθινά."
              }
            />
            <div className="grid gap-3">
              {safetySections.map((section) => {
                const iconMap = [ShieldCheck, ShieldAlert, MapPin, TimerReset, Ban] as const;
                const Icon = iconMap[safetySections.indexOf(section)] ?? ShieldCheck;
                return (
                  <div key={section.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-white">{section.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/65">{section.body}</p>
                  </div>
                );
              })}
            </div>
          </Surface>

          <Surface id="privacy" className="space-y-4 p-6">
            <SectionTitle
              title={language === "en" ? "Privacy" : "Απόρρητο"}
              body={
                language === "en"
                  ? "Echoo is designed to keep identity minimal, rooms temporary, and personal data limited to what the service needs."
                  : "Το Echoo σχεδιάζεται για να κρατά την ταυτότητα ελάχιστη, τα rooms προσωρινά και τα προσωπικά δεδομένα περιορισμένα σε ό,τι πραγματικά χρειάζεται η υπηρεσία."
              }
            />
            <div className="grid gap-3">
              {privacySections.map((section) => (
                <div key={section} className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/65">
                  {section}
                </div>
              ))}
            </div>
          </Surface>

          <Surface id="terms" className="space-y-4 p-6 md:col-span-2">
            <SectionTitle
              title={language === "en" ? "Terms" : "Όροι"}
              body={
                language === "en"
                  ? "Use Echoo respectfully. Do not harass, threaten, or pressure other people. Safety tools and moderation may be used when needed."
                  : "Χρησιμοποίησε το Echoo με σεβασμό. Μην παρενοχλείς, απειλείς ή πιέζεις άλλους ανθρώπους. Τα εργαλεία ασφάλειας και η moderation μπορεί να χρησιμοποιηθούν όταν χρειάζεται."
              }
            />
            <div className="grid gap-3 lg:grid-cols-2">
              {termsSections.map((section) => {
                const iconMap = [ShieldCheck, AlertTriangle, Sparkles, UserRound, TimerReset, Ban] as const;
                const Icon = iconMap[termsSections.indexOf(section)] ?? ShieldCheck;
                return (
                  <div key={section.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-white">{section.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/65">{section.body}</p>
                  </div>
                );
              })}
            </div>
          </Surface>
        </div>
      </div>

      <Surface className="space-y-4 p-6 sm:p-8">
        <SectionTitle
          title={language === "en" ? "Support" : "Υποστήριξη"}
          body={supportText}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400">
            <Link to="/support">{language === "en" ? "Open support" : "Άνοιξε την υποστήριξη"}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white">
            <Link to="/dashboard">{language === "en" ? "Back to dashboard" : "Πίσω στον πίνακα"}</Link>
          </Button>
        </div>
      </Surface>
    </PageShell>
  );
};

export default TrustSafetyPage;
