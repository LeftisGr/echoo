import { Shield, Sparkles, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const PrivacyPage = () => {
  const { copy, language } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.legal.privacyTitle} body={copy.legal.privacyBody} />
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {[
              {
                icon: Sparkles,
                text:
                  language === "en"
                    ? "Anonymous usernames are the default identity."
                    : "Τα ανώνυμα usernames είναι η βασική ταυτότητα.",

              },
              {
                icon: Shield,
                text:
                  language === "en"
                    ? "Photos stay out of the MVP on purpose."
                    : "Οι φωτογραφίες μένουν συνειδητά εκτός του MVP.",
              },
              {
                icon: TimerReset,
                text:
                  language === "en"
                    ? "Reports and ratings help keep the room safer."
                    : "Τα reports και οι αξιολογήσεις βοηθούν να μένουν τα rooms πιο ασφαλή.",
              },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/65">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-4 w-4" />
                </div>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[24px] border border-white/10 bg-[#090d17] p-4">
            <p className="mb-3 text-sm uppercase tracking-[0.18em] text-white/40">Data model</p>
            <pre className="overflow-x-auto text-xs leading-6 text-white/55">{`Minimal public profile data.
Private rooms.
Reports for safety review.
No unnecessary identity baggage.`}</pre>
          </div>
        </div>
      </Surface>
    </PageShell>
  );
};

export default PrivacyPage;
