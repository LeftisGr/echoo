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
            {
              icon: ShieldCheck,
              title: copy.safety.actions[0],
              body:
                language === "en"
                  ? "Reporting is always a tap away inside the room."
                  : "Η αναφορά είναι πάντα ένα tap μακριά μέσα στο room.",
            },
            {
              icon: ShieldAlert,
              title: copy.safety.actions[1],
              body:
                language === "en"
                  ? "Block instantly if the moment turns wrong."
                  : "Μπλόκαρε αμέσως αν το moment στραβώσει.",
            },
            {
              icon: TimerReset,
              title: copy.safety.actions[2],
              body:
                language === "en"
                  ? "Leave without friction. No awkward steps."
                  : "Φεύγεις χωρίς τριβή. Χωρίς άβολα βήματα.",
            },

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
            {language === "en" ? "What Echoo protects" : "Τι προστατεύει το Echoo"}
          </p>
          {[
            language === "en"
              ? "Privacy stays high and identity stays light."
              : "Το απόρρητο μένει υψηλό και η ταυτότητα ελαφριά.",
            language === "en"
              ? "Voice stays optional after it unlocks."
              : "Η φωνή παραμένει προαιρετική αφού ξεκλειδώσει.",
            language === "en"
              ? "Rooms can end instantly if behavior crosses the line."
              : "Τα rooms μπορούν να κλείσουν αμέσως αν η συμπεριφορά ξεπεράσει τα όρια.",
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
