import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { SupportCard } from "@/components/support/support-card";
import { usePresence } from "@/components/presence/presence-provider";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, LogOut, MessageSquareText, Mic, Users } from "lucide-react";

const LearnPage = () => {
  const { language } = usePresence();

  const aboutPoints =
    language === "en"
      ? [
          "Anonymity matters because it lowers the pressure to be polished.",
          "Slower interaction matters because trust usually appears in small steps, not in a rush.",
          "Temporary rooms matter because not every conversation should become a permanent record.",
          "Privacy matters because people should be able to talk without turning themselves inside out.",
        ]
      : [
          "Η ανωνυμία έχει σημασία γιατί μειώνει την πίεση να είσαι «τέλειος/α».",
          "Ο πιο αργός ρυθμός έχει σημασία γιατί η εμπιστοσύνη συνήθως εμφανίζεται σε μικρά βήματα, όχι βιαστικά.",
          "Τα προσωρινά rooms έχουν σημασία γιατί δεν αξίζει κάθε κουβέντα να γίνει μόνιμο αρχείο.",
          "Το απόρρητο έχει σημασία γιατί οι άνθρωποι πρέπει να μπορούν να μιλούν χωρίς να εκτίθενται υπερβολικά.",
        ];

  const faqItems =
    language === "en"
      ? [
          ["Is Echoo anonymous?", "Yes. Echoo is designed so you can talk without revealing your identity."],
          ["Are conversations stored?", "Most live conversation is temporary. Some limited records may remain for safety and service reliability."],
          ["Does content disappear?", "Yes. Text, voice, and shared media are temporary and may expire automatically."],
          ["Can people see my identity?", "No real name is required, and your profile stays minimal by design."],
          ["How long do sessions last?", "Sessions are live and temporary. The text phase unlocks voice later in the room."],
          ["Is voice communication live?", "Yes. Voice is live and only becomes available once the room unlocks it."],
          ["Can I block or report users?", "Yes. Both tools are built into every room."],
          ["Is Echoo location tracking me?", "Echoo uses privacy-first room pairing and does not need to expose your exact location."],
          ["What happens to uploaded media?", "Media shared in a room is temporary and follows the room’s retention rules."],
          ["Can I delete my account?", "Account controls are kept simple, and you can leave or sign out anytime."],
        ]
      : [
          ["Είναι το Echoo ανώνυμο;", "Ναι. Το Echoo έχει σχεδιαστεί για να μιλάς χωρίς να αποκαλύπτεις την ταυτότητά σου."],
          ["Αποθηκεύονται οι κουβέντες;", "Το μεγαλύτερο μέρος της live κουβέντας είναι προσωρινό. Κάποια περιορισμένα records μπορεί να μένουν για ασφάλεια και αξιοπιστία."],
          ["Το περιεχόμενο εξαφανίζεται;", "Ναι. Το text, η φωνή και τα shared media είναι προσωρινά και μπορεί να λήγουν αυτόματα."],
          ["Μπορούν να δουν την ταυτότητά μου;", "Δεν χρειάζεται πραγματικό όνομα και το προφίλ σου μένει ελάχιστο by design."],
          ["Πόσο διαρκούν τα sessions;", "Τα sessions είναι live και προσωρινά. Η text φάση ξεκλειδώνει αργότερα τη φωνή μέσα στο room."],
          ["Η φωνή είναι live;", "Ναι. Η φωνή είναι live και γίνεται διαθέσιμη μόνο όταν το room την ξεκλειδωσει."],
          ["Μπορώ να μπλοκάρω ή να κάνω report;", "Ναι. Και τα δύο εργαλεία υπάρχουν μέσα σε κάθε room."],
          ["Το Echoo με παρακολουθεί τοποθεσιακά;", "Το Echoo χρησιμοποιεί privacy-first room pairing και δεν χρειάζεται να αποκαλύπτει την ακριβή τοποθεσία σου."],
          ["Τι γίνεται με τα media που ανεβάζω;", "Τα media που μοιράζεσαι σε ένα room είναι προσωρινά και ακολουθούν τους κανόνες διατήρησης του room."],
          ["Μπορώ να διαγράψω τον λογαριασμό μου;", "Οι έλεγχοι του λογαριασμού είναι απλοί και μπορείς να φύγεις ή να αποσυνδεθείς οποιαδήποτε στιγμή."],
        ];

  const howSteps = [
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
      icon: MessageSquareText,
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

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow={language === "en" ? "Learn" : "Μάθε περισσότερα"}
            title={language === "en" ? "Learn" : "Μάθε περισσότερα"}
            body={
              language === "en"
                ? "About Echoo, how it works, and the questions people usually ask first."
                : "Σχετικά με το Echoo, το πώς λειτουργεί και τις ερωτήσεις που κάνουν συνήθως οι άνθρωποι πρώτα."
            }
          />
          <div className="flex flex-wrap gap-2">
            <a href="#about" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white">
              {language === "en" ? "About" : "Σχετικά"}
            </a>
            <a href="#how-echoo-works" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white">
              {language === "en" ? "How it works" : "Πώς λειτουργεί"}
            </a>
            <a href="#faq" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white">
              FAQ
            </a>
          </div>
        </div>
      </Surface>

      <div className="md:hidden">
        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem value="about" className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5">
            <AccordionTrigger className="text-left text-lg font-medium text-white hover:no-underline">
              <span id="about">{language === "en" ? "About Echoo" : "Σχετικά με το Echoo"}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-1 text-white/65">
              <p className="text-sm leading-7">
                {language === "en"
                  ? "Echoo was created to make online conversation feel calmer again."
                  : "Το Echoo δημιουργήθηκε για να κάνει την online κουβέντα να νιώθει ξανά πιο ήρεμη."}
              </p>
              <p className="mt-4 text-sm leading-7">
                {language === "en"
                  ? "A lot of apps ask people to perform. Echoo asks for something softer: a real exchange, a bit of patience, and room to leave without making a scene."
                  : "Πολλές app ζητούν από τους ανθρώπους να κάνουν performance. Το Echoo ζητά κάτι πιο απαλό: μια αληθινή ανταλλαγή, λίγη υπομονή και χώρο για να φύγεις χωρίς φασαρία."}
              </p>
              <div className="mt-4 grid gap-2">
                {aboutPoints.map((point) => (
                  <div key={point} className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/60">
                    {point}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="how" className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5">
            <AccordionTrigger className="text-left text-lg font-medium text-white hover:no-underline">
              <span id="how-echoo-works">{language === "en" ? "How Echoo works" : "Πώς λειτουργεί το Echoo"}</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-1 text-white/65">
              <div className="grid gap-3">
                {howSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.number} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/10 bg-violet-500/10 text-violet-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">{step.number}</p>
                          <h3 className="mt-1 text-sm font-medium text-white">{step.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-white/60">{step.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq" className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5">
            <AccordionTrigger className="text-left text-lg font-medium text-white hover:no-underline">
              <span id="faq">FAQ</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-1 text-white/65">
              <Accordion type="single" collapsible className="space-y-2">
                {faqItems.map(([question, answer], index) => (
                  <AccordionItem key={question} value={`faq-mobile-${index}`} className="rounded-[22px] border border-white/10 bg-black/20 px-4">
                    <AccordionTrigger className="text-left text-sm text-white hover:no-underline">{question}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-7 text-white/65">{answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="hidden space-y-4 md:block">
        <div className="grid gap-4 md:grid-cols-2">
          <Surface id="about" className="space-y-4 p-6">
            <SectionTitle
              title={language === "en" ? "About Echoo" : "Σχετικά με το Echoo"}
              body={
                language === "en"
                  ? "Echoo was created to make online conversation feel calmer again."
                  : "Το Echoo δημιουργήθηκε για να κάνει την online κουβέντα να νιώθει ξανά πιο ήρεμη."
              }
            />
            <p className="text-sm leading-7 text-white/65">
              {language === "en"
                ? "A lot of apps ask people to perform. Echoo asks for something softer: a real exchange, a bit of patience, and room to leave without making a scene."
                : "Πολλές app ζητούν από τους ανθρώπους να κάνουν performance. Το Echoo ζητά κάτι πιο απαλό: μια αληθινή ανταλλαγή, λίγη υπομονή και χώρο για να φύγεις χωρίς φασαρία."}
            </p>
            <div className="grid gap-3">
              {aboutPoints.map((point) => (
                <div key={point} className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/60">
                  {point}
                </div>
              ))}
            </div>
          </Surface>

          <Surface id="faq" className="space-y-4 p-6">
            <SectionTitle
              title="FAQ"
              body={
                language === "en"
                  ? "Short answers for the things people usually want to know first."
                  : "Σύντομες απαντήσεις για τα πράγματα που συνήθως θέλουν να ξέρουν πρώτα οι άνθρωποι."
              }
            />
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map(([question, answer], index) => (
                <AccordionItem key={question} value={`faq-desktop-${index}`} className="rounded-[22px] border border-white/10 bg-black/20 px-4">
                  <AccordionTrigger className="text-left text-sm text-white hover:no-underline">{question}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-7 text-white/65">{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Surface>

          <Surface id="how-echoo-works" className="space-y-4 p-6 md:col-span-2">
            <SectionTitle
              title={language === "en" ? "How Echoo works" : "Πώς λειτουργεί το Echoo"}
              body={
                language === "en"
                  ? "Five small steps. No rush, no feed, and no pressure to perform."
                  : "Πέντε μικρά βήματα. Χωρίς βιασύνη, χωρίς feed και χωρίς πίεση να κάνεις επίδειξη."
              }
            />
            <div className="grid gap-4 lg:grid-cols-5">
              {howSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/10 bg-violet-500/10 text-violet-100">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">{step.number}</p>
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-white">{step.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-white/60">{step.body}</p>
                  </div>
                );
              })}
            </div>
          </Surface>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400">
            <Link to="/auth">
              {language === "en" ? "Open a room" : "Άνοιξε ένα room"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white">
            <Link to="/dashboard">{language === "en" ? "Go to dashboard" : "Στον πίνακα"}</Link>
          </Button>
        </div>
      </div>

      <Surface className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            title={language === "en" ? "Need a quick reminder?" : "Θέλεις μια γρήγορη υπενθύμιση;"}
            body={
              language === "en"
                ? "The room stays calmer when people stay curious, patient, and respectful."
                : "Το room μένει πιο ήρεμο όταν οι άνθρωποι μένουν περίεργοι, υπομονετικοί και με σεβασμό."
            }
          />
          <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60 hover:bg-white/5">
            {language === "en" ? "Temporary by design" : "Προσωρινό by design"}
          </Badge>
        </div>
        <SupportCard language={language} />
      </Surface>
    </PageShell>
  );
};

export default LearnPage;
