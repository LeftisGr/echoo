import { Clock3, Sparkles, TimerReset, Trash2 } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const RetentionPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Temporary Content",
          body: "Echoo is built around impermanence. What happens in the room is meant to stay light.",
          intro:
            "Temporary sharing lowers pressure. You can speak, respond, and move on without carrying everything into a permanent feed.",
          sections: [
            "Text in rooms is temporary and may disappear when the room ends or when retention rules apply.",
            "Voice unlocks gradually, and the room does not store a public replay.",
            "Photos, audio, and short clips are designed to auto-delete after a short retention window.",
            "Shared moments are not meant to become social media history.",
          ],
        }
      : {
          title: "Προσωρινό περιεχόμενο",
          body: "Το Echoo χτίζεται γύρω από την παροδικότητα. Ό,τι συμβαίνει στο room πρέπει να μένει ελαφρύ.",
          intro:
            "Η προσωρινή κοινή χρήση μειώνει την πίεση. Μπορείς να μιλήσεις, να απαντήσεις και να προχωρήσεις χωρίς να κουβαλάς τα πάντα σε ένα μόνιμο feed.",
          sections: [
            "Το text μέσα στα rooms είναι προσωρινό και μπορεί να εξαφανιστεί όταν το room τελειώσει ή όταν ισχύουν οι κανόνες διατήρησης.",
            "Η φωνή ξεκλειδώνει σταδιακά και το room δεν αποθηκεύει δημόσιο replay.",
            "Οι φωτογραφίες, ο ήχος και τα σύντομα clips είναι σχεδιασμένα να διαγράφονται αυτόματα μετά από σύντομο retention window.",
            "Οι κοινές στιγμές δεν προορίζονται να γίνουν μόνιμο social media history.",
          ],
        };

  const icons = [Clock3, TimerReset, Trash2, Sparkles] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {copy.sections.map((section, index) => {
            const Icon = icons[index] ?? TimerReset;
            return (
              <div key={section} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm leading-7 text-white/65">{section}</p>
              </div>
            );
          })}
        </div>
      </Surface>
    </PageShell>
  );
};

export default RetentionPage;
