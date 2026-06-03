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
          "Voice: Echoo does not record or store live voice conversations.",
          "Rooms: Rooms are temporary and not publicly accessible.",
          "Location: Nearby/Away uses approximate distance only and only when permission is granted.",
          "Reports: Reports may store minimal moderation information.",
          "Profiles: Echoo does not provide public profile browsing.",
          "What we collect: We keep the basics needed to run the app, like sign-in details, your profile settings, room activity, and simple usage data that helps us keep Echoo stable.",
          "Your rights: If you’re in the EU or UK, you can ask to access, correct, delete, or limit certain data, and you can ask us what we keep and why.",
        ]
      : [
          "Φωνή: Το Echoo δεν καταγράφει ούτε αποθηκεύει ζωντανές φωνητικές συνομιλίες.",
          "Rooms: Τα rooms είναι προσωρινά και δεν είναι δημόσια προσβάσιμα.",
          "Τοποθεσία: Το Nearby/Away χρησιμοποιεί μόνο κατά προσέγγιση απόσταση και μόνο όταν δοθεί άδεια.",
          "Reports: Τα reports μπορεί να αποθηκεύουν ελάχιστες πληροφορίες moderation.",
          "Profiles: Το Echoo δεν προσφέρει δημόσια περιήγηση προφίλ.",
          "Τι συλλέγουμε: Κρατάμε τα βασικά που χρειάζονται για να λειτουργεί η app, όπως στοιχεία σύνδεσης, ρυθμίσεις προφίλ, δραστηριότητα στα rooms και απλά usage δεδομένα που βοηθούν το Echoo να παραμένει σταθερό.",
          "Τα δικαιώματά σου: Αν βρίσκεσαι στην ΕΕ ή στο Ηνωμένο Βασίλειο, μπορείς να ζητήσεις πρόσβαση, διόρθωση, διαγραφή ή περιορισμό ορισμένων δεδομένων, και μπορείς να μας ρωτήσεις τι κρατάμε και γιατί.",
        ];

  const termsSections =
    language === "en"
      ? [
          { title: "Voice", body: "Echoo does not record or store live voice conversations." },
          { title: "Rooms", body: "Rooms are temporary and not publicly accessible." },
          { title: "Location", body: "Nearby/Away uses approximate distance only and only when permission is granted." },
          { title: "Reports", body: "Reports may store minimal moderation information." },
          { title: "Profiles", body: "Echoo does not provide public profile browsing." },
          { title: "Be respectful", body: "No harassment, intimidation, hate speech, coercion, stalking, or pressure of any kind." },
          { title: "No illegal or harmful content", body: "Do not share illegal material, threats, or anything meant to hurt another person." },
          { title: "No impersonation or spam", body: "Do not pretend to be someone else, use bots to abuse the app, or flood rooms with repeated messages." },
          { title: "Safety actions matter", body: "Reports, suspensions, and bans may be used when behaviour crosses the line or repeats after warnings." },
        ]
      : [
          { title: "Φωνή", body: "Το Echoo δεν καταγράφει ούτε αποθηκεύει ζωντανές φωνητικές συνομιλίες." },
          { title: "Rooms", body: "Τα rooms είναι προσωρινά και δεν είναι δημόσια προσβάσιμα." },
          { title: "Τοποθεσία", body: "Το Nearby/Away χρησιμοποιεί μόνο κατά προσέγγιση απόσταση και μόνο όταν δοθεί άδεια." },
          { title: "Reports", body: "Τα reports μπορεί να αποθηκεύουν ελάχιστες πληροφορίες moderation." },
          { title: "Profiles", body: "Το Echoo δεν προσφέρει δημόσια περιήγηση προφίλ." },
          { title: "Μίλα με σεβασμό", body: "Όχι παρενόχληση, εκφοβισμός, hate speech, καταναγκασμός, stalking ή πίεση οποιασδήποτε μορφής." },
          { title: "Όχι παράνομο ή επιβλαβές περιεχόμενο", body: "Μην μοιράζεσαι παράνομο υλικό, απειλές ή οτιδήποτε έχει στόχο να βλάψει άλλον άνθρωπο." },
          { title: "Όχι impersonation ή spam", body: "Μην προσποιείσαι ότι είσαι άλλος άνθρωπος, μην χρησιμοποιείς bots για κατάχρηση της app και μην γεμίζεις rooms με επαναλαμβανόμενα μηνύματα." },
          { title: "Τα μέτρα ασφάλειας έχουν σημασία", body: "Reports, αναστολές και bans μπορεί να χρησιμοποιηθούν όταν η συμπεριφορά ξεπερνά τα όρια ή επαναλαμβάνεται μετά από προειδοποιήσεις." },
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
