import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { presenceSchemaSql } from "@/lib/presence-backend";
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
              language === "en"
                ? "Anonymous usernames are the default public identity."
                : "Τα ανώνυμα usernames είναι η προεπιλεγμένη δημόσια ταυτότητα.",
              language === "en"
                ? "Photos are not part of the MVP."
                : "Οι φωτογραφίες δεν αποτελούν μέρος του MVP.",
              language === "en"
                ? "Reports and ratings are stored for trust & safety operations."
                : "Τα reports και οι αξιολογήσεις αποθηκεύονται για λειτουργίες trust & safety.",
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/65">
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-[24px] border border-white/10 bg-[#090d17] p-4">
            <p className="mb-3 text-sm uppercase tracking-[0.18em] text-white/40">MVP schema</p>
            <pre className="overflow-x-auto text-xs leading-6 text-white/55">{presenceSchemaSql}</pre>
          </div>
        </div>
      </Surface>
    </PageShell>
  );
};

export default PrivacyPage;