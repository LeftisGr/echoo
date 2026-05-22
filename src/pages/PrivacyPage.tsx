import { Shield, Sparkles, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const PrivacyPage = () => {
  const { copy, language } = usePresence();

  const items = [
    {
      icon: Sparkles,
      text:
        language === "en"
          ? "Anonymous names are the default."
          : "Τα ανώνυμα ονόματα είναι η προεπιλογή.",
    },
    {
      icon: Shield,
      text:
        language === "en"
          ? "Rooms are temporary and designed to reveal as little as possible."
          : "Τα rooms είναι προσωρινά και σχεδιασμένα να αποκαλύπτουν όσο το δυνατόν λιγότερα.",
    },
    {
      icon: TimerReset,
      text:
        language === "en"
          ? "Reports and safety signals help protect the experience."
          : "Τα reports και τα σήματα ασφάλειας βοηθούν να προστατεύεται η εμπειρία.",
    },
  ];

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.legal.privacyTitle} body={copy.legal.privacyBody} />
        <div className="grid gap-3 lg:grid-cols-3">
          {items.map(({ icon: Icon, text }) => (
            <div key={text} className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/70">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                <Icon className="h-4 w-4" />
              </div>
              {text}
            </div>
          ))}
        </div>
      </Surface>
    </PageShell>
  );
};

export default PrivacyPage;
