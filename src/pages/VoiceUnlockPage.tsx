import { Mic, Sparkles, TimerReset, Users } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const VoiceUnlockPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Voice becomes available later",
          body: "Voice becomes available later so the room can build trust before it asks for more presence.",
          intro:
            "Echoo does not rush people into talking. The text phase gives the room time to settle, and the voice phase arrives only when the pace feels natural.",
          sections: [
            { title: "Less pressure", body: "You do not have to speak immediately. A slower start helps people relax." },
            { title: "More natural pacing", body: "Voice unlocks after the room has had time to breathe." },
            { title: "Safer first steps", body: "Text creates a softer first impression before voice becomes available." },
            { title: "Still your choice", body: "Even after unlock, voice remains optional." },
          ],
        }
      : {
          title: "Η φωνή ανοίγει αργότερα",
          body: "Η φωνή ανοίγει αργότερα ώστε το room να χτίζει εμπιστοσύνη πριν ζητήσει περισσότερη παρουσία.",
          intro:
            "Το Echoo δεν σπρώχνει τους ανθρώπους να μιλήσουν γρήγορα. Η text φάση δίνει χρόνο στο room να ηρεμήσει και η φωνητική φάση έρχεται μόνο όταν ο ρυθμός νιώθει φυσικός.",
          sections: [
            { title: "Λιγότερη πίεση", body: "Δεν χρειάζεται να μιλήσεις αμέσως. Το πιο αργό ξεκίνημα βοηθά τους ανθρώπους να χαλαρώσουν." },
            { title: "Πιο φυσικός ρυθμός", body: "Η φωνή ξεκλειδώνει αφού το room πάρει λίγο χρόνο να αναπνεύσει." },
            { title: "Πιο ασφαλή πρώτα βήματα", body: "Το text δημιουργεί πιο ήπια πρώτη εντύπωση πριν η φωνή γίνει διαθέσιμη." },
            { title: "Παραμένει δική σου επιλογή", body: "Ακόμη και μετά το unlock, η φωνή παραμένει προαιρετική." },
          ],
        };

  const icons = [Mic, TimerReset, Users, Sparkles] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {copy.sections.map((section, index) => {
            const Icon = icons[index] ?? Sparkles;
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

export default VoiceUnlockPage;
