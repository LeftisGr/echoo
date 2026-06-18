import { ArrowRight, Clock3, LogOut, MessageCircle, Mic, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { SocialLinks } from "@/components/presence/social-links";
import { SundayQuietHoursBanner } from "@/components/presence/sunday-quiet-hours-banner";
import { usePresence } from "@/components/presence/presence-provider";

const Index = () => {
  const { adminMetrics, language } = usePresence();

  const steps = [
    {
      icon: Users,
      number: "01",
      title: language === "en" ? "Open quietly" : "Συνδέσου ήσυχα",
      body:
        language === "en"
          ? "Echoo opens a calm, live conversation based on your language and pace."
          : "Το Echoo ανοίγει μια ήρεμη live κουβέντα με βάση τη γλώσσα και τον ρυθμό σου.",
    },
    {
      icon: MessageCircle,
      number: "02",
      title: language === "en" ? "Start with anonymous text" : "Ξεκίνα με ανώνυμο text",
      body:
        language === "en"
          ? "Say a little first. You do not need a name, a photo, or a performance."
          : "Πες λίγα πρώτα. Δεν χρειάζεσαι όνομα, φωτογραφία ή καμία επίδοση.",
    },
    {
      icon: Mic,
      number: "03",
      title: language === "en" ? "Voice becomes available later" : "Η φωνή ανοίγει αργότερα",
      body:
        language === "en"
          ? "Voice becomes available later, once the room feels settled."
          : "Η φωνή γίνεται διαθέσιμη αργότερα, όταν το room νιώσει αρκετά ήρεμο.",
    },
    {
      icon: Clock3,
      number: "04",
      title: language === "en" ? "Share temporary moments" : "Μοιράσου προσωρινές στιγμές",
      body:
        language === "en"
          ? "Photos, audio, and conversation stay light and fade with the room."
          : "Φωτογραφίες, ήχος και κουβέντα μένουν ελαφριά και σβήνουν μαζί με το room.",
    },
    {
      icon: LogOut,
      number: "05",
      title: language === "en" ? "Leave anytime" : "Φεύγεις όποτε θες",
      body:
        language === "en"
          ? "If it no longer feels right, step away without friction or drama."
          : "Αν δεν σου ταιριάζει πια, μπορείς να φύγεις χωρίς τριβή ή ένταση.",
    },
  ];

  const principles = [
    {
      title: language === "en" ? "Anonymous by design" : "Ανώνυμο by design",
      body:
        language === "en"
          ? "No public feed, no social pressure, and no profile browsing."
          : "Χωρίς δημόσιο feed, χωρίς social πίεση και χωρίς περιήγηση σε προφίλ.",
    },
    {
      title: language === "en" ? "Temporary by default" : "Προσωρινό by default",
      body:
        language === "en"
          ? "The room is meant to feel present, not permanent."
          : "Το room είναι φτιαγμένο να νιώθει παρόν, όχι μόνιμο.",
    },
    {
      title: language === "en" ? "Safety stays visible" : "Η ασφάλεια παραμένει ορατή",
      body:
        language === "en"
          ? "Block, report, and exit are always close at hand."
          : "Block, report και έξοδος είναι πάντα κοντά σου.",
    },
  ];

  const quickLinks = [
    { to: "/safety", label: language === "en" ? "Safety" : "Ασφάλεια" },
    { to: "/voice-unlock", label: language === "en" ? "Voice unlock" : "Ξεκλείδωμα φωνής" },
    { to: "/privacy", label: language === "en" ? "Privacy" : "Απόρρητο" },
  ];

  return (
    <PageShell className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <Surface className="relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-44 w-44 rounded-full bg-violet-500/12 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
          </div>

          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-2 text-xs text-violet-50/80">
              <Sparkles className="h-4 w-4 text-violet-200" />
              {language === "en" ? "Calm anonymous conversation" : "Ήρεμη ανώνυμη κουβέντα"}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {language === "en"
                  ? "Anonymous conversations that unfold naturally."
                  : "Ανώνυμες κουβέντες που ξεδιπλώνονται φυσικά."}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                {language === "en"
                  ? "No profile photos. No followers. No pressure. Start with text. Unlock voice later. Share content only when both people choose to."
                  : "Χωρίς φωτογραφίες προφίλ. Χωρίς followers. Χωρίς πίεση. Ξεκίνα με text. Ξεκλείδωσε τη φωνή αργότερα. Μοιράσου περιεχόμενο μόνο όταν το θέλουν και οι δύο."}
              </p>
            </div>

            <div className="space-y-3">
              <SundayQuietHoursBanner />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full bg-violet-500 px-6 text-white hover:bg-violet-400">
                  <Link to="/auth">
                    {language === "en" ? "Open a room" : "Άνοιξε ένα room"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
  
                <a href="#how-it-works">
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                  >
                    {language === "en" ? "How Echoo works" : "Πώς λειτουργεί το Echoo"}
                  </Button>
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard value={String(adminMetrics.usersOnlineNow)} label={language === "en" ? "active users online now" : "ενεργοί χρήστες online τώρα"} />
              <MetricCard value={`${adminMetrics.avgWaitTimeSeconds}s`} label={language === "en" ? "average wait" : "μέση αναμονή"} />
              <MetricCard value="4" label={language === "en" ? "safety layers" : "στρώματα ασφάλειας"} />
            </div>
          </div>
        </Surface>

        <Surface className="relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_50%)]" />
          <div className="relative space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/35">
                  {language === "en" ? "Experience flow" : "Ροή εμπειρίας"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {language === "en" ? "A slower path into the room" : "Μια πιο αργή είσοδος στο room"}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-violet-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#0b1020] p-4 sm:p-5">
              {steps.slice(0, 3).map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="flex gap-3 rounded-[22px] border border-white/5 bg-white/[0.03] p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/10 bg-violet-500/10 text-violet-100">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">{step.number}</p>
                        {index === 0 && (
                          <Badge className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60 hover:bg-white/5">
                            {language === "en" ? "Quiet" : "Ήσυχα"}
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-1 text-sm font-medium text-white">{step.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-white/56">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                  {language === "en" ? "What to expect" : "Τι να περιμένεις"}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {language === "en"
                    ? "Conversation begins softly and only becomes fuller if both people want it to."
                    : "Η κουβέντα ξεκινά απαλά και γίνεται πιο πλήρης μόνο αν το θέλουν και οι δύο."}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                  {language === "en" ? "Mood" : "Ατμόσφαιρα"}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {language === "en"
                    ? "Premium, dark, and quiet — more like a private lounge than a loud feed."
                    : "Premium, σκοτεινό και ήσυχο — πιο κοντά σε ιδιωτικό lounge παρά σε θορυβώδες feed."}
                </p>
              </div>
            </div>
          </div>
        </Surface>
      </section>

      <section id="how-it-works" className="space-y-5">
        <SectionTitle
          eyebrow={language === "en" ? "Onboarding" : "Onboarding"}
          title={language === "en" ? "How Echoo works" : "Πώς λειτουργεί το Echoo"}
          body={
            language === "en"
              ? "Five small steps. No rush, no feed, and no pressure to perform."
              : "Πέντε μικρά βήματα. Χωρίς βιασύνη, χωρίς feed και χωρίς πίεση να κάνεις επίδειξη."
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/10 bg-violet-500/10 text-violet-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">{step.number}</span>
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="space-y-4 p-6">
          <SectionTitle
            title={language === "en" ? "Why it feels calmer" : "Γιατί νιώθει πιο ήρεμο"}
            body={
              language === "en"
                ? "Echoo avoids the patterns that make chat apps feel noisy, fast, or performative."
                : "Το Echoo αποφεύγει τα μοτίβα που κάνουν τα chat apps να νιώθουν θορυβώδη, γρήγορα ή επιτηδευμένα."
            }
          />
          <div className="grid gap-3">
            {principles.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <h3 className="text-base font-medium text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{item.body}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="space-y-4 p-6">
          <SectionTitle
            title={language === "en" ? "Small details, bigger clarity" : "Μικρές λεπτομέρειες, μεγαλύτερη καθαρότητα"}
            body={
              language === "en"
                ? "The homepage should answer the three questions people ask first: what is this, how does it work, and what happens if I stay?"
                : "Η αρχική σελίδα πρέπει να απαντά στις τρεις πρώτες ερωτήσεις: τι είναι, πώς λειτουργεί και τι γίνεται αν μείνω;"
            }
          />

          <div className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-100">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{language === "en" ? "Quiet by default" : "Ήσυχο by default"}</p>
                <p className="text-sm text-white/55">
                  {language === "en"
                    ? "A conversation that starts softly tends to feel safer, slower, and more human."
                    : "Μια κουβέντα που ξεκινά απαλά τείνει να νιώθει πιο ασφαλής, πιο αργή και πιο ανθρώπινη."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72 transition hover:bg-white/[0.06] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Surface>
      </section>

      <section>
        <Surface className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              title={language === "en" ? "Ready when you are" : "Έτοιμο όταν είσαι κι εσύ"}
              body={
                language === "en"
                  ? "Open Echoo, step into the queue, and let the room form with a little patience."
                  : "Άνοιξε το Echoo, μπες στην ουρά και άφησε το room να σχηματιστεί με λίγη υπομονή."
              }
            />
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Badge key={link.to} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/65 hover:bg-white/5">
                  {link.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-full bg-violet-500 px-6 text-white hover:bg-violet-400">
              <Link to="/auth">
                {language === "en" ? "Step in quietly" : "Μπες ήσυχα"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white">
              <Link to="/dashboard">
                {language === "en" ? "Go to dashboard" : "Στον πίνακα"}
              </Link>
            </Button>

          </div>
        </Surface>
      </section>

      <footer className="space-y-4 pb-6">
        <p className="text-center text-xs text-white/40">
          {language === "en"
            ? "Anonymous rooms. Slower interaction. Temporary moments."
            : "Ανώνυμα rooms. Πιο αργή αλληλεπίδραση. Προσωρινές στιγμές."}
        </p>
        <div className="flex items-center justify-center">
          <Link
            to="/whats-next"
            className="text-[11px] font-medium tracking-[0.18em] text-white/30 transition hover:text-white/55"
          >
            Echoo v0.9 Beta
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md px-1 sm:px-0">
          <SocialLinks compact />
        </div>
      </footer>

    </PageShell>
  );
};

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
      <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
    </div>
  );
}

export default Index;
