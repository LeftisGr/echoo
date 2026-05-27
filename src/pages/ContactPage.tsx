import { Mail, Shield, MessageCircleHeart } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const ContactPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Contact",
          body: "If something feels off, or you simply want to reach a human, we’re here.",
          intro: "Keep it simple. Tell us what happened, which room it was in, and how we can help.",
          support: "Support: support@echoo.app",
          privacy: "Privacy: privacy@echoo.app",
          moderation: "Moderation: safety@echoo.app",
          reassurance: "We read these inboxes with care. No ticket maze, no automated wall when a real answer is needed.",
        }
      : {
          title: "Επικοινωνία",
          body: "Αν κάτι δεν φαίνεται σωστό ή απλώς θέλεις να μιλήσεις με άνθρωπο, είμαστε εδώ.",
          intro: "Κράτα το απλό. Πες μας τι συνέβη, σε ποιο room και πώς μπορούμε να βοηθήσουμε.",
          support: "Υποστήριξη: support@echoo.app",
          privacy: "Απόρρητο: privacy@echoo.app",
          moderation: "Moderation: safety@echoo.app",
          reassurance: "Διαβάζουμε αυτά τα inbox με φροντίδα. Χωρίς λαβύρινθο tickets, χωρίς ψυχρό αυτοματισμό όταν χρειάζεται αληθινή απάντηση.",
        };

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>

        <div className="grid gap-4 md:grid-cols-3">
          <ContactCard icon={Mail} label={language === "en" ? "Support" : "Υποστήριξη"} value={copy.support} />
          <ContactCard icon={Shield} label={language === "en" ? "Privacy" : "Απόρρητο"} value={copy.privacy} />
          <ContactCard icon={MessageCircleHeart} label={language === "en" ? "Moderation" : "Moderation"} value={copy.moderation} />
        </div>

        <div className="rounded-[24px] border border-violet-300/15 bg-violet-500/10 p-5 text-sm leading-7 text-violet-50">
          {copy.reassurance}
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
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-white/45">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-white">{value}</p>
    </div>
  );
}

export default ContactPage;
