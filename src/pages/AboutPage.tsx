import { MessageSquareText, ShieldCheck, Sparkles, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { SupportCard } from "@/components/support/support-card";
import { usePresence } from "@/components/presence/presence-provider";

const AboutPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "About Echoo",
          body: "Echoo was created to make online conversation feel calmer again.",
          intro:
            "A lot of apps ask people to perform. Echoo asks for something softer: a real exchange, a bit of patience, and room to leave without making a scene.",
          sections: [
            "Anonymity matters because it lowers the pressure to be polished.",
            "Slower interaction matters because trust usually appears in small steps, not in a rush.",
            "Temporary rooms matter because not every conversation should become a permanent record.",
            "Privacy matters because people should be able to meet without turning themselves inside out.",
          ],
        }
      : {
          title: "Σχετικά με το Echoo",
          body: "Το Echoo δημιουργήθηκε για να κάνει την online κουβέντα να νιώθει ξανά πιο ήρεμη.",
          intro:
            "Πολλές app ζητούν από τους ανθρώπους να κάνουν performance. Το Echoo ζητά κάτι πιο απαλό: μια αληθινή ανταλλαγή, λίγη υπομονή και χώρο για να φύγεις χωρίς φασαρία.",
          sections: [
            "Η ανωνυμία έχει σημασία γιατί μειώνει την πίεση να είσαι «τέλειος/α».",
            "Ο πιο αργός ρυθμός έχει σημασία γιατί η εμπιστοσύνη συνήθως εμφανίζεται σε μικρά βήματα, όχι βιαστικά.",
            "Τα προσωρινά rooms έχουν σημασία γιατί δεν αξίζει κάθε κουβέντα να γίνει μόνιμο αρχείο.",
            "Το απόρρητο έχει σημασία γιατί οι άνθρωποι πρέπει να μπορούν να συναντιούνται χωρίς να εκτίθενται υπερβολικά.",
          ],
        };

  const icons = [Sparkles, TimerReset, MessageSquareText, ShieldCheck] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>
        <SupportCard language={language} className="mt-2" />
        <div className="grid gap-4 md:grid-cols-2">

          {copy.sections.map((item, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={item} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm leading-7 text-white/65">{item}</p>
              </div>
            );
          })}
        </div>
      </Surface>
    </PageShell>
  );
};

export default AboutPage;
