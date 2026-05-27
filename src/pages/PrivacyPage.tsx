import { Bell, Mail, ShieldCheck, Sparkles, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const PrivacyPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Privacy Policy",
          body: "Echoo is built to keep identity light, rooms private, and data limited to what the app truly needs.",
          intro:
            "This is the short version: we try to know as little about you as possible, and we do not turn your conversations into a permanent record.",
          sections: [
            {
              title: "What we collect",
              body:
                "We collect the basics needed to run the app: account information from email authentication or Google login, your anonymous profile settings, room activity, reports, and simple usage events that help Echoo stay stable.",
            },
            {
              title: "Authentication",
              body:
                "If you sign in with email, we use that only to authenticate the account. If you sign in with Google, we use the Google account connection to sign you in. We do not expose your email to other users.",
            },
            {
              title: "Temporary content",
              body:
                "Messages, voice moments, and uploaded media are temporary by design. Rooms end automatically, shared content expires, and media is removed after it has served its purpose.",
            },
            {
              title: "Moderation and safety",
              body:
                "Reports, blocks, suspensions, and bans are stored so we can protect people and stop repeat abuse. We may keep a small moderation trail for review, abuse prevention, and platform safety.",
            },
            {
              title: "Analytics and local storage",
              body:
                "We use lightweight analytics and in-app events to understand reliability, queues, and safety signals. We also use local storage for simple app preferences like language, queue settings, and session state.",
            },
            {
              title: "Your rights",
              body:
                "If you are in the EU or UK, you can ask to access, correct, delete, or limit certain data. You can also ask questions about what we keep and why.",
            },
          ],
          contact: "For privacy requests, email privacy@echoo.app.",
        }
      : {
          title: "Πολιτική απορρήτου",
          body: "Το Echoo χτίζεται για να κρατά την ταυτότητα ελαφριά, τα rooms ιδιωτικά και τα δεδομένα περιορισμένα σε ό,τι πραγματικά χρειάζεται η app.",
          intro:
            "Η σύντομη εκδοχή: προσπαθούμε να γνωρίζουμε όσο το δυνατόν λιγότερα για εσένα και δεν μετατρέπουμε τις κουβέντες σου σε μόνιμο αρχείο.",
          sections: [
            {
              title: "Τι συλλέγουμε",
              body:
                "Συλλέγουμε τα βασικά που χρειάζονται για να λειτουργεί η app: πληροφορίες λογαριασμού από email authentication ή Google login, τις ρυθμίσεις του ανώνυμου προφίλ σου, δραστηριότητα στα rooms, reports και απλά events χρήσης που βοηθούν το Echoo να παραμένει σταθερό.",
            },
            {
              title: "Σύνδεση",
              body:
                "Αν συνδεθείς με email, το χρησιμοποιούμε μόνο για να γίνει authentication ο λογαριασμός. Αν συνδεθείς με Google, χρησιμοποιούμε τη σύνδεση του Google λογαριασμού μόνο για να σε βάλουμε μέσα. Δεν εμφανίζουμε το email σου σε άλλους ανθρώπους.",
            },
            {
              title: "Προσωρινό περιεχόμενο",
              body:
                "Τα μηνύματα, οι φωνητικές στιγμές και τα uploaded media είναι προσωρινά by design. Τα rooms τελειώνουν αυτόματα, το shared content λήγει και τα media αφαιρούνται όταν ολοκληρώσουν τον σκοπό τους.",
            },
            {
              title: "Moderation και ασφάλεια",
              body:
                "Τα reports, τα blocks, οι αναστολές και τα bans αποθηκεύονται για να προστατεύουμε τους ανθρώπους και να σταματάμε την επαναλαμβανόμενη κατάχρηση. Μπορεί να κρατάμε ένα μικρό moderation trail για έλεγχο και ασφάλεια.",
            },
            {
              title: "Analytics και τοπική αποθήκευση",
              body:
                "Χρησιμοποιούμε ελαφριά analytics και in-app events για να καταλαβαίνουμε τη σταθερότητα, τις ουρές και τα σήματα ασφάλειας. Χρησιμοποιούμε επίσης local storage για απλές προτιμήσεις όπως γλώσσα, queue settings και κατάσταση session.",
            },
            {
              title: "Τα δικαιώματά σου",
              body:
                "Αν βρίσκεσαι στην ΕΕ ή στο Ηνωμένο Βασίλειο, μπορείς να ζητήσεις πρόσβαση, διόρθωση, διαγραφή ή περιορισμό ορισμένων δεδομένων. Μπορείς επίσης να ρωτήσεις τι κρατάμε και γιατί.",
            },
          ],
          contact: "Για privacy requests, στείλε email στο privacy@echoo.app.",
        };

  const icons = [Sparkles, ShieldCheck, TimerReset, Bell, Mail, ShieldCheck] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>

        <div className="grid gap-4 lg:grid-cols-2">
          {copy.sections.map((section, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={section.title} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">{section.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{section.body}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-violet-300/15 bg-violet-500/10 p-5 text-sm leading-7 text-violet-50">
          {copy.contact}
        </div>
      </Surface>
    </PageShell>
  );
};

export default PrivacyPage;
