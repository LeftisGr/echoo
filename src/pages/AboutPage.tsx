import { MessageSquareText, ShieldCheck, Sparkles, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const AboutPage = () => {
  const { copy } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.about.title} body={copy.about.body} />
        <div className="grid gap-3 md:grid-cols-3">
          {copy.about.philosophy.map((item, index) => {
            const icons = [Sparkles, TimerReset, MessageSquareText] as const;
            const Icon = icons[index] ?? ShieldCheck;

            return (
              <div key={item} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm leading-6 text-white/70">{item}</p>
              </div>
            );
          })}
        </div>
      </Surface>
    </PageShell>
  );
};

export default AboutPage;
