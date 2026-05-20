import { HandHeart, ShieldAlert, ShieldCheck, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const SafetyPage = () => {
  const { copy, language } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.safety.title} body={copy.safety.body} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: ShieldCheck, title: copy.safety.actions[0], body: copy.landing.safetyBody },
            { icon: ShieldAlert, title: copy.safety.actions[1], body: copy.session.block },
            { icon: TimerReset, title: copy.safety.actions[2], body: copy.session.leave },
            {
              icon: HandHeart,
              title: language === "en" ? "Shared rules" : "Κοινές αρχές",
              body: copy.safety.rules[0],
            },
          ].map(({ icon: Icon, title, body }) => (

            <div key={title} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
            </div>
          ))}
        </div>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface className="space-y-4 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">
            {language === "en" ? "Rules" : "Κανόνες"}
          </p>
          <div className="space-y-3">
            {copy.safety.rules.map((rule) => (
              <div key={rule} className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/70">
                {rule}
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="space-y-4 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">
            {language === "en" ? "Safety loop" : "Κύκλος ασφάλειας"}
          </p>
          {[
            language === "en"
              ? "Respect notice appears before voice unlock."
              : "Η υπενθύμιση σεβασμού εμφανίζεται πριν από το voice unlock.",
            language === "en"
              ? "Report and block actions are always inside the room."
              : "Οι ενέργειες report και block υπάρχουν πάντα μέσα στο δωμάτιο.",
            language === "en"
              ? "Sessions can end instantly if behavior crosses the line."
              : "Τα sessions μπορούν να τελειώσουν άμεσα αν η συμπεριφορά ξεπεράσει τα όρια.",
          ].map((item) => (
            <div key={item} className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-white/65">
              {item}
            </div>
          ))}
        </Surface>
      </div>
    </PageShell>
  );
};

export default SafetyPage;