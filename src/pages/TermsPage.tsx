import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const TermsPage = () => {
  const { copy, language } = usePresence();

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.legal.termsTitle} body={copy.legal.termsBody} />
        <div className="grid gap-3">
          {[
            language === "en"
              ? "Be respectful. No harassment, coercion, or threats."
              : "Να είσαι με σεβασμό. Όχι παρενόχληση, πίεση ή απειλές.",
            language === "en"
              ? "Rooms may be moderated when reports or safety signals appear."
              : "Τα rooms μπορεί να εποπτεύονται όταν εμφανίζονται reports ή σήματα ασφάλειας.",
            language === "en"
              ? "You can leave anytime."
              : "Μπορείς να φύγεις οποιαδήποτε στιγμή.",
            language === "en"
              ? "Voice stays optional after unlock."
              : "Η φωνή παραμένει προαιρετική και μετά το unlock.",
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
