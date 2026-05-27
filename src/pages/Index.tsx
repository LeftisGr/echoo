import { ArrowRight, Clock3, Mic, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageShell, SectionTitle, StickyBottomBar, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

const Index = () => {
  const { copy, adminMetrics, language } = usePresence();

  const steps = [
    {
      icon: Users,
      title: language === "en" ? "Discover someone nearby or online" : "Ανακάλυψε κάποιον κοντά σου ή online",
      body:
        language === "en"
          ? "Echoo listens for the next live connection that fits your language and energy."
          : "Το Echoo ακούει για την επόμενη live σύνδεση που ταιριάζει με τη γλώσσα και την ενέργειά σου.",
    },
    {
      icon: Sparkles,
      title: language === "en" ? "Connect anonymously" : "Συνδέσου ανώνυμα",
      body:
        language === "en"
          ? "No real name is needed. Your profile stays light, private, and easy to leave behind."
          : "Δεν χρειάζεται πραγματικό όνομα. Το προφίλ σου μένει ελαφρύ, ιδιωτικό και εύκολο να το αφήσεις πίσω.",
    },
    {
      icon: Mic,
      title: language === "en" ? "Move from text to voice" : "Πέρνα από text σε φωνή",
      body:
        language === "en"
          ? "Start with words, then hold to talk when the moment feels ready."
          : "Ξεκίνα με λέξεις και μετά κράτα για να μιλήσεις όταν το moment είναι έτοιμο.",
    },
  ];

  const pillars = [
    {
      title: language === "en" ? "Anonymous by design" : "Ανώνυμο by design",
      body:
        language === "en"
          ? "Echoo keeps the focus on the live moment, not on profiles or a public feed."
          : "Το Echoo κρατά το focus στο live moment, όχι σε προφίλ ή σε δημόσιο feed.",
    },
    {
      title: language === "en" ? "Temporary conversations" : "Προσωρινές κουβέντες",
      body:
        language === "en"
          ? "Text, voice, and shared media are built to fade when the room closes."
          : "Το text, η φωνή και τα shared media είναι φτιαγμένα να σβήνουν όταν κλείσει το room.",
    },
    {
      title: language === "en" ? "Privacy first" : "Privacy first",
      body:
        language === "en"
          ? "Minimal identity, clear controls, and no permanent public history."
          : "Ελάχιστη ταυτότητα, καθαροί έλεγχοι και κανένα μόνιμο δημόσιο ιστορικό.",

    },
    {
      title: language === "en" ? "Safety and respect" : "Ασφάλεια και σεβασμός",
      body:
        language === "en"
          ? "Block, report, and leave instantly if the connection stops feeling right."
          : "Block, report και άμεση έξοδος αν η σύνδεση πάψει να σου ταιριάζει.",
    },
  ];

  const ctas = {
    hero: language === "en" ? "Open a room" : "Άνοιξε ένα room",
    final: language === "en" ? "Step in quietly" : "Μπες ήσυχα",
  };

  const voiceCards = [
    {
      title: language === "en" ? "Voice moments" : "Voice moments",

      body:
        language === "en"
          ? "Hold to talk when the conversation has earned a little more presence."
          : "Κράτα για να μιλήσεις όταν η κουβέντα έχει κερδίσει λίγη παραπάνω παρουσία.",
    },
    {
      title: language === "en" ? "Live timing" : "Live timing",
      body:
        language === "en"
          ? "Voice unlocks inside the room, not before. The moment decides the pace."
          : "Η φωνή ξεκλειδώνει μέσα στο room, όχι πριν. Το moment ορίζει τον ρυθμό.",
    },
  ];

  return (
    <PageShell className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <Surface className="space-y-6 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <Sparkles className="h-4 w-4 text-violet-300" />
            {copy.landing.heroEyebrow}
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.landing.heroTitle}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base">{copy.landing.heroBody}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/auth">
              <Button className="h-12 rounded-full bg-violet-500 px-6 text-white hover:bg-violet-400">
                {ctas.hero}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

            </Link>
            <a href="#how-echoo-works">
              <Button
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
              >
                {copy.landing.heroSecondary}
              </Button>
            </a>
            <PwaInstallButton />
          </div>

          <p className="text-xs text-white/45">
            {language === "en"
              ? "Echoo works best in a modern browser on mobile or desktop."
              : "Το Echoo λειτουργεί καλύτερα σε σύγχρονο browser σε mobile ή desktop."}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard value={adminMetrics.usersOnlineNow.toString()} label={copy.landing.statUsers} />
            <MetricCard value={`${adminMetrics.avgWaitTimeSeconds}s`} label={copy.landing.statWait} />
            <MetricCard value="4" label={copy.landing.statSafety} />
          </div>
        </Surface>

        <div className="grid gap-4">
          <Surface className="space-y-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-violet-500/15 text-violet-100">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-white/45">{copy.landing.whatIsTitle}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">{copy.landing.whatIsBody}</p>
              </div>
            </div>
          </Surface>

          <Surface className="space-y-4 p-6" id="how-echoo-works">
            <div className="flex items-center gap-3 text-white">
              <Clock3 className="h-5 w-5 text-violet-300" />
              <span className="text-sm font-medium">{copy.session.countdownLabel}</span>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-[#0b0f1a] p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-white/50">
                <span>{language === "en" ? "Text first" : "Πρώτα text"}</span>
                <span>10:00</span>
              </div>
              <div className="space-y-3 text-sm text-white/80">
                <div className="max-w-[80%] rounded-3xl rounded-bl-md bg-white px-4 py-3 text-slate-950">
                  {language === "en"
                    ? "Start small. The room opens as it feels safe."
                    : "Ξεκίνα μικρά. Το room ανοίγει όσο νιώθει ασφαλές."}
                </div>
                <div className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-violet-500/20 px-4 py-3 text-white">
                  {language === "en"
                    ? "Then voice unlocks when the moment is ready."
                    : "Μετά η φωνή ξεκλειδώνει όταν το moment είναι έτοιμο."}
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-sm text-violet-50">
                {copy.session.voiceUnlocked}
              </div>
            </div>
          </Surface>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <Surface className="space-y-4 p-6">
          <SectionTitle title={copy.landing.sections.howItWorks} body={copy.landing.whatIsBody} />
          <div className="grid gap-4">
            {steps.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="space-y-4 p-6">
          <SectionTitle title={copy.landing.sections.different} body={copy.landing.whyPhotosBody} />
          <div className="grid gap-3 sm:grid-cols-2">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <h3 className="text-base font-medium text-white">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{pillar.body}</p>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="space-y-4 p-6">
          <SectionTitle title={copy.landing.sections.voice} body={copy.session.textNote} />
          <div className="grid gap-3">
            {voiceCards.map((card) => (
              <div key={card.title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <h3 className="text-base font-medium text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{card.body}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="space-y-4 p-6">
          <SectionTitle title={copy.landing.sections.safety} body={copy.landing.safetyBody} />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              copy.safety.actions[0],
              copy.safety.actions[1],
              copy.safety.actions[2],
              copy.safety.rules[0],
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/65">
                {item}
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <Surface className="space-y-4 p-6">
          <SectionTitle title={copy.landing.faqTitle} body={copy.faqPage.body} />
          <Accordion type="single" collapsible className="w-full space-y-2">
            {copy.faq.slice(0, 4).map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className="rounded-[22px] border border-white/10 bg-black/20 px-4"
              >
                <AccordionTrigger className="text-left text-sm text-white hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-white/65">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Surface>

        <Surface className="space-y-4 p-6">
          <SectionTitle title={copy.landing.contactTitle} body={copy.landing.contactBody} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/support" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{copy.nav.support}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.support.responseValue}</p>
            </Link>
            <Link to="/contact" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{copy.nav.contact}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.contact.email}</p>
            </Link>
            <Link to="/about" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{copy.nav.about}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.about.title}</p>
            </Link>
            <Link to="/privacy" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{copy.nav.privacy}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.legal.privacyTitle}</p>
            </Link>
            <Link to="/retention" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{copy.nav.retention}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.retention.title}</p>
            </Link>
            <Link to="/terms" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{copy.nav.terms}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.legal.termsTitle}</p>
            </Link>
          </div>
        </Surface>
      </section>

      <section>
        <Surface className="space-y-5 p-6 sm:p-8">
          <SectionTitle title={copy.landing.ctaTitle} body={copy.landing.ctaBody} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/auth">
              <Button className="h-12 rounded-full bg-violet-500 px-6 text-white hover:bg-violet-400">
                {ctas.final}
              </Button>

            </Link>
            <Link to="/dashboard">
              <Button
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
              >
                {copy.nav.dashboard}
              </Button>
            </Link>
          </div>
        </Surface>
      </section>

      <footer className="pb-6 text-center text-xs text-white/40">{copy.brand.tagline}</footer>

      <StickyBottomBar />
    </PageShell>
  );
};

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}

export default Index;
