import { Ban, MapPin, ShieldAlert, ShieldCheck, Sparkles, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const SafetyPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Safety & Privacy",
          body: "Echoo keeps the room small, private, and easy to leave. That helps conversations stay human.",
          intro:
            "The goal is not to police feelings. The goal is to give people clear exits, quiet boundaries, and enough protection to speak honestly.",
          sections: [
            { title: "Blocking", body: "Blocking stops future rematching between two people. It is immediate and private." },
            { title: "Reporting", body: "Reports go to moderation. Repeated abuse can lead to review, suspension, or bans." },
            { title: "Nearby / Away", body: "Nearby / Away only uses a coarse location signal so people understand whether they are roughly close or farther apart. No exact location is exposed to other users." },
            { title: "Temporary rooms", body: "Rooms end automatically, and content is built to fade with them." },
            { title: "Emotional safety", body: "If a conversation feels heavy, strange, or manipulative, leaving is always allowed." },
          ],

        }
      : {
          title: "Ασφάλεια & Απόρρητο",
          body: "Το Echoo κρατά το room μικρό, ιδιωτικό και εύκολο να το αφήσεις. Έτσι οι κουβέντες μένουν πιο ανθρώπινες.",
          intro:
            "Ο στόχος δεν είναι να ελέγξουμε τα συναισθήματα. Ο στόχος είναι να δίνουμε καθαρές εξόδους, ήσυχα όρια και αρκετή προστασία ώστε να μιλάς αληθινά.",
          sections: [
            { title: "Αποκλεισμός", body: "Ο αποκλεισμός σταματά τα μελλοντικά rematches μεταξύ δύο ανθρώπων. Γίνεται αμέσως και ιδιωτικά." },
            { title: "Αναφορά", body: "Τα reports πηγαίνουν στη moderation. Η επαναλαμβανόμενη κατάχρηση μπορεί να οδηγήσει σε έλεγχο, αναστολή ή bans." },
            { title: "Προσωρινά rooms", body: "Τα rooms τελειώνουν αυτόματα και το περιεχόμενο είναι φτιαγμένο να σβήνει μαζί τους." },
            { title: "Συναισθηματική ασφάλεια", body: "Αν μια κουβέντα νιώθει βαριά, περίεργη ή χειριστική, η έξοδος είναι πάντα επιτρεπτή." },
          ],
        };

  const cards = [ShieldCheck, ShieldAlert, MapPin, TimerReset, Ban] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {copy.sections.map((section, index) => {
            const Icon = cards[index] ?? Sparkles;
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
      </Surface>
    </PageShell>
  );
};

export default SafetyPage;
