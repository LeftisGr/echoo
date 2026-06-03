import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { SupportCard } from "@/components/support/support-card";
import { usePresence } from "@/components/presence/presence-provider";

const FAQPage = () => {
  const { language } = usePresence();

  const items =
    language === "en"
      ? [
          ["Is Echoo free?", "Yes. Echoo is completely free to use."],
          ["Why does Echoo ask for support?", "Optional support helps maintain servers, audio infrastructure, moderation tools, and future improvements."],
          ["Will Echoo become paid?", "The core Echoo experience is intended to remain accessible to everyone."],
          ["Is Echoo anonymous?", "Yes. Echoo is built so you can talk without giving away your real identity."],
          ["What does Nearby / Away mean?", "It is a simple distance cue for a room. Nearby means you and the other person are roughly close; Away means you are farther apart."],
          ["Why does Echoo ask for location access?", "Only to calculate Nearby / Away inside a room. Echoo uses a coarse, approximate location so the app can stay private while still giving that small signal."],
          ["Can people see my email?", "No. Your email is used for sign-in and account recovery, not for other users."],
          ["Why does voice unlock later?", "Because slower pacing feels calmer and gives the conversation room to become natural."],

          ["Are messages stored?", "Most room content is temporary. Some safety records may stay longer to protect people."],
          ["What happens when a room ends?", "The room closes automatically and the conversation stops being active."],
        ]
      : [
          ["Το Echoo είναι δωρεάν;", "Ναι. Το Echoo είναι πλήρως δωρεάν."],
          ["Γιατί το Echoo ζητά υποστήριξη;", "Η προαιρετική υποστήριξη βοηθά στη συντήρηση των servers, του ήχου, της ασφάλειας και στις μελλοντικές βελτιώσεις."],
          ["Θα γίνει επί πληρωμή;", "Η βασική εμπειρία του Echoo προορίζεται να παραμείνει προσβάσιμη για όλους."],
          ["Είναι το Echoo ανώνυμο;", "Ναι. Το Echoo έχει σχεδιαστεί ώστε να μιλάς χωρίς να αποκαλύπτεις την πραγματική σου ταυτότητα."],
          ["Μπορούν να δουν το email μου;", "Όχι. Το email χρησιμοποιείται για σύνδεση και ανάκτηση λογαριασμού, όχι για άλλους χρήστες."],
          ["Γιατί η φωνή ξεκλειδώνει αργότερα;", "Επειδή το πιο αργό pacing νιώθει πιο ήρεμο και αφήνει την κουβέντα να γίνει φυσική."],
          ["Αποθηκεύονται τα μηνύματα;", "Το μεγαλύτερο μέρος του room είναι προσωρινό. Κάποια safety records μπορεί να μένουν περισσότερο για προστασία."],
          ["Τι γίνεται όταν τελειώσει ένα room;", "Το room κλείνει αυτόματα και η κουβέντα δεν παραμένει ενεργή."],
        ];

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={language === "en" ? "Frequently asked questions" : "Συχνές ερωτήσεις"} body={language === "en" ? "Short answers to the things people usually want to know first." : "Σύντομες απαντήσεις για όσα θέλουν συνήθως να ξέρουν πρώτα οι άνθρωποι."} />
        <Accordion type="single" collapsible className="w-full space-y-2">
          {items.map(([question, answer], index) => (
            <AccordionItem key={question} value={`faq-${index}`} className="rounded-[22px] border border-white/10 bg-black/20 px-4">
              <AccordionTrigger className="text-left text-sm text-white hover:no-underline">{question}</AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-white/65">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Surface>

      <SupportCard language={language} />

    </PageShell>
  );
};

export default FAQPage;
