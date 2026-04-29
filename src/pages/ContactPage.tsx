import { Mail, MapPin, Shield } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const ContactPage = () => {
  const { copy, language } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.contact.title} body={copy.contact.body} />
        <div className="grid gap-4 sm:grid-cols-3">
          <ContactCard icon={Mail} label="Email" value={copy.contact.email} />
          <ContactCard
            icon={MapPin}
            label={language === "en" ? "Market" : "Αγορά"}
            value={language === "en" ? "Greece first" : "Ελλάδα πρώτα"}
          />
          <ContactCard
            icon={Shield}
            label={language === "en" ? "Trust & Safety" : "Trust & Safety"}
            value="safety@presence.app"
          />
        </div>
      </Surface>
    </PageShell>
  );
};

function ContactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-white/45">{label}</p>
      <p className="mt-2 text-base font-medium text-white">{value}</p>
    </div>
  );
}

export default ContactPage;
