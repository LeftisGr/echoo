import { Clock3, Shield, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const RetentionPage = () => {
  const { copy } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.retention.title} body={copy.retention.body} />
        <div className="grid gap-4 lg:grid-cols-3">
          {copy.retention.sections.map((section, index) => {
            const icons = [TimerReset, Clock3, Shield] as const;
            const Icon = icons[index] ?? Shield;

            return (
              <div key={section} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm leading-6 text-white/70">{section}</p>
              </div>
            );
          })}
        </div>
      </Surface>
    </PageShell>
  );
};

export default RetentionPage;
