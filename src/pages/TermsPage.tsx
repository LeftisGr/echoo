import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const TermsPage = () => {
  const { copy } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.legal.termsTitle} body={copy.legal.termsBody} />
        <div className="grid gap-3">
          {[
            copy.safety.rules[0],
            copy.safety.rules[1],
            copy.safety.rules[2],
            copy.safety.rules[3],
          ].map((item) => (
            <div key={item} className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/70">
              {item}
            </div>
          ))}
        </div>
      </Surface>
    </PageShell>
  );
};

export default TermsPage;
