import { ArrowRight, Clock3, MessageSquareText, Mic, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  SectionTitle,
  StickyBottomBar,
  Surface,
} from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

const Index = () => {

  const { copy, adminMetrics, language } = usePresence();

  const steps = [
    {
      icon: MessageSquareText,
      title: copy.auth.profileTitle,
      body:
        language === "en"
          ? "Create an anonymous identity with filters for age range, language, and who you want to meet."
          : "Δημιούργησε μια ανώνυμη ταυτότητα με φίλτρα για ηλικία, γλώσσα και ποιον θέλεις να γνωρίσεις.",
    },
    {
      icon: Sparkles,
      title: copy.queue.title,
      body:
        language === "en"
          ? "Enter the live queue and get matched one-to-one using language compatibility, preference, and wait priority."
          : "Μπες στη live ουρά και κάνε match one-to-one με βάση τη γλώσσα, την προτίμηση και την προτεραιότητα αναμονής.",
    },
    {
      icon: Mic,
      title: copy.session.voiceUnlocked,
      body:
        language === "en"
          ? "Start with text. When the timer ends, voice becomes available without forcing anyone to use it."
          : "Ξεκίνα με κείμενο. Όταν λήξει ο χρόνος, η φωνή γίνεται διαθέσιμη χωρίς να είναι υποχρεωτική.",
    },
  ];

  const reasons = [
    {
      title: language === "en" ? "Less superficial" : "Λιγότερο επιφανειακό",
      body:
        language === "en"
          ? "The first impression is presence, not appearance."
          : "Η πρώτη εντύπωση είναι η παρουσία, όχι η εμφάνιση.",
    },
    {
      title: language === "en" ? "Safer by design" : "Πιο ασφαλές by design",
      body:
        language === "en"
          ? "No photos, no public profile browsing, and fast reporting tools."
          : "Χωρίς φωτογραφίες, χωρίς δημόσια προβολή προφίλ και με γρήγορα εργαλεία αναφοράς.",
    },
    {
      title: language === "en" ? "Built for real conversation" : "Χτισμένο για αληθινή κουβέντα",
      body:
        language === "en"
          ? "Every interaction is designed around timing, depth, and emotional rhythm."
          : "Κάθε αλληλεπίδραση σχεδιάζεται γύρω από τον χρόνο, το βάθος και το συναισθηματικό ρυθμό.",
    },
  ];

  const safetyCards = [
    {
      icon: ShieldCheck,
      title: language === "en" ? "Report + block" : "Report + block",
      body:
        language === "en"
          ? "Fast safety actions inside every room."
          : "Γρήγορες ενέργειες ασφάλειας μέσα σε κάθε δωμάτιο.",
    },
    {
      icon: Clock3,
      title: language === "en" ? "Timed voice unlock" : "Χρονικό unlock φωνής",
      body:
        language === "en"
          ? "Voice stays optional and protected."
          : "Η φωνή παραμένει προαιρετική και προστατευμένη.",
    },
    {
      icon: MessageSquareText,
      title: language === "en" ? "Respect prompts" : "Υπενθυμίσεις σεβασμού",
      body:
        language === "en"
          ? "Conversation rules are always visible."
          : "Οι κανόνες συνομιλίας είναι πάντα ορατοί.",
    },
    {
      icon: Sparkles,
      title: language === "en" ? "Clean exits" : "Καθαρές έξοδοι",
      body:
        language === "en"
          ? "Leave instantly without awkward friction."
          : "Φεύγεις αμέσως χωρίς awkward τριβή.",
    },
  ];

  return (
    <PageShell className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <Surface className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute left-8 bottom-4 h-24 w-24 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="relative space-y-6">

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              <Sparkles className="h-4 w-4 text-violet-300" />
              {copy.landing.heroEyebrow}
            </div>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {copy.landing.heroTitle}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                {copy.landing.heroBody}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button className="h-12 rounded-full bg-violet-500 px-6 text-white hover:bg-violet-400">
                  {copy.landing.heroPrimary}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
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
                ? "Echoo is installable on Chrome, Edge, Android, and desktop when your browser supports it."
                : "Το Echoo εγκαθίσταται σε Chrome, Edge, Android και desktop όταν ο browser το υποστηρίζει."}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <p className="text-2xl font-semibold text-white">{adminMetrics.usersOnlineNow}</p>
                <p className="mt-1 text-xs text-white/50">{copy.landing.statUsers}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <p className="text-2xl font-semibold text-white">{adminMetrics.avgWaitTimeSeconds}s</p>
                <p className="mt-1 text-xs text-white/50">{copy.landing.statWait}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <p className="text-2xl font-semibold text-white">4</p>
                <p className="mt-1 text-xs text-white/50">{copy.landing.statSafety}</p>
              </div>
            </div>
          </div>
        </Surface>

        <div className="grid gap-4">
          <Surface className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-500/20 text-violet-200">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-white/50">{language === "en" ? "What is Echoo" : "Τι είναι το Echoo"}</p>

              <p className="mt-1 text-sm leading-6 text-white/80">{copy.landing.whatIsBody}</p>
            </div>
          </Surface>
          <Surface className="space-y-4">
            <div className="flex items-center gap-3 text-white">
              <Clock3 className="h-5 w-5 text-violet-300" />
              <span className="text-sm font-medium">{copy.session.countdownLabel}</span>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-[#0b0f1a] p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-white/50">
                <span>{language === "en" ? "Text phase" : "Φάση κειμένου"}</span>
                <span>10:00</span>
              </div>
              <div className="space-y-3 text-sm text-white/80">
                <div className="max-w-[80%] rounded-3xl rounded-bl-md bg-white px-4 py-3 text-slate-950">
                  {language === "en"
                    ? "First words feel different when nobody is performing."
                    : "Τα πρώτα λόγια ακούγονται αλλιώς όταν κανείς δεν παίζει ρόλο."}
                </div>
                <div className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-violet-500/20 px-4 py-3 text-white">
                  {language === "en"
                    ? "Exactly. It feels calmer and more honest."
                    : "Ακριβώς. Νιώθει πιο ήρεμο και πιο ειλικρινές."}
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-sm text-violet-50">
                {copy.session.voiceUnlocked}
              </div>
            </div>
          </Surface>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <SectionTitle
            title={language === "en" ? "What is Echoo" : "Τι είναι το Echoo"}
            body={copy.landing.whatIsBody}
          />
        </Surface>

        <Surface id="how-it-works" className="space-y-6">
          <SectionTitle title={copy.landing.stepsTitle} />
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-violet-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Surface className="space-y-4">
          <SectionTitle title={copy.landing.whyPhotosTitle} body={copy.landing.whyPhotosBody} />
          <div className="space-y-3">
            {reasons.map((reason) => (
              <div key={reason.title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <h3 className="text-base font-medium text-white">{reason.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{reason.body}</p>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="space-y-4">
          <SectionTitle title={copy.landing.safetyTitle} body={copy.landing.safetyBody} />
          <div className="grid gap-3 sm:grid-cols-2">
            {safetyCards.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <Icon className="h-5 w-5 text-violet-200" />
                <h3 className="mt-4 text-base font-medium text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <Surface className="space-y-4">
          <SectionTitle title={copy.landing.faqTitle} />
          <Accordion type="single" collapsible className="w-full space-y-2">
            {copy.faq.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className="rounded-[22px] border border-white/10 bg-black/20 px-4"
              >
                <AccordionTrigger className="text-left text-sm text-white hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-white/60">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Surface>
        <Surface className="space-y-4">
          <SectionTitle title={copy.landing.contactTitle} body={copy.landing.contactBody} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/contact" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{language === "en" ? "Contact" : "Επικοινωνία"}</p>
              <p className="mt-1 text-lg font-medium text-white">hello@presence.app</p>
            </Link>
            <Link to="/privacy" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{language === "en" ? "Legal" : "Νομικά"}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.nav.privacy}</p>
            </Link>
            <Link to="/terms" className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <p className="text-sm text-white/50">{language === "en" ? "Rules" : "Κανόνες"}</p>
              <p className="mt-1 text-lg font-medium text-white">{copy.nav.terms}</p>
            </Link>
            <Link to="/auth" className="rounded-[24px] border border-violet-400/20 bg-violet-400/10 p-4 transition hover:bg-violet-400/15">
              <p className="text-sm text-violet-100/70">{language === "en" ? "Get started" : "Ξεκίνα"}</p>
              <p className="mt-1 text-lg font-medium text-violet-50">{copy.nav.startNow}</p>
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
                {copy.nav.startNow}
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

      <footer className="pb-6 text-center text-xs text-white/40">
        Echoo MVP · Greece-first · Greek + English · Anonymous by design
      </footer>

      <StickyBottomBar />
    </PageShell>
  );
};

export default Index;