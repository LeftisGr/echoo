import { Mail, ShieldCheck, TimerReset } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { SupportCard } from "@/components/support/support-card";
import { usePresence } from "@/components/presence/presence-provider";

const SupportPage = () => {
  const { copy, language } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.support.title} body={copy.support.body} />
        <SupportCard language={language} />
        <div className="grid gap-4 md:grid-cols-3">

          <InfoCard icon={Mail} label={copy.support.emailLabel} value={copy.contact.email} />
          <InfoCard icon={TimerReset} label={copy.support.responseLabel} value={copy.support.responseValue} />
          <InfoCard icon={ShieldCheck} label={copy.nav.safety} value={copy.safety.actions[0]} />
        </div>
      </Surface>

    </PageShell>
  );
};

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-white/45">{label}</p>
      <p className="mt-2 text-base font-medium leading-6 text-white">{value}</p>
    </div>
  );
}

export default SupportPage;
