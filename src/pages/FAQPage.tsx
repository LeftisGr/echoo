import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { SupportEchooCard } from "@/components/support-echoo-card";
import { usePresence } from "@/components/presence/presence-provider";

const FAQPage = () => {
  const { language } = usePresence();

  const items =
    language === "en"
      ? [
          ["Is Echoo anonymous?", "Yes. Echoo is built so you can meet without giving away your real identity."],
          ["Can people see my email?", "No. Your email is used for sign-in and account recovery, not for other users."],
          ["Why does voice unlock later?", "Because slower pacing feels calmer and gives the conversation room to become natural."],
          ["Are messages stored?", "Most room content is temporary. Some safety records may stay longer to protect people."],
          ["What happens when a room ends?", "The room closes automatically and the conversation stops being active."],
          ["What happens to uploaded content?", "Shared media is temporary and auto-deletes according to Echoo’s retention rules."],
          ["Can I block someone?", "Yes. Blocking is immediate and helps prevent rematching with that person."],
          ["What happens if I report someone?", "Reports go to moderation. They can lead to review, warnings, suspension, or bans."],
          ["Is Echoo free?", "Yes. Echoo is free to use, and the core experience stays that way."],
          ["Why support Echoo?", "Support helps with hosting, moderation, and keeping the rooms feeling calm and available."],
          ["Will Echoo become paid?", "No. Echoo isn’t built around paywalls or forced upgrades."],
          ["Why was I disconnected?", "A room can end automatically, disconnect briefly, or close for safety reasons."],
          ["Can I reconnect after refresh?", "If the room still exists and you are allowed back in, Echoo will try to restore it."],
          ["Is Echoo a dating app?", "No. Echoo is designed for calm conversation, not swiping or dating profiles."],
        ]
      : [

          ["Είναι το Echoo ανώνυμο;", "Ναι. Το Echoo έχει σχεδιαστεί ώστε να γνωρίζεσαι χωρίς να αποκαλύπτεις την πραγματική σου ταυτότητα."],
          ["Μπορούν να δουν το email μου;", "Όχι. Το email χρησιμοποιείται για σύνδεση και ανάκτηση λογαριασμού, όχι για άλλους χρήστες."],
          ["Γιατί η φωνή ξεκλειδώνει αργότερα;", "Επειδή το πιο αργό pacing νιώθει πιο ήρεμο και αφήνει την κουβέντα να γίνει φυσική."],
          ["Αποθηκεύονται τα μηνύματα;", "Το μεγαλύτερο μέρος του room είναι προσωρινό. Κάποια safety records μπορεί να μένουν περισσότερο για προστασία."],
          ["Τι γίνεται όταν τελειώσει ένα room;", "Το room κλείνει αυτόματα και η κουβέντα δεν παραμένει ενεργή."],
          ["Τι γίνεται με το uploaded περιεχόμενο;", "Τα shared media είναι προσωρινά και διαγράφονται αυτόματα σύμφωνα με τους κανόνες διατήρησης του Echoo."],
          ["Μπορώ να μπλοκάρω κάποιον;", "Ναι. Ο αποκλεισμός γίνεται αμέσως και βοηθά να μην ξανακάνετε match."],
          ["Τι συμβαίνει αν κάνω report κάποιον;", "Τα reports πηγαίνουν στη moderation. Μπορούν να οδηγήσουν σε έλεγχο, προειδοποίηση, αναστολή ή ban."],
          ["Είναι το Echoo δωρεάν;", "Ναι. Το Echoo είναι δωρεάν και η βασική εμπειρία θα παραμείνει έτσι."],
          ["Γιατί να στηρίξω το Echoo;", "Η στήριξη βοηθά με τα hosting έξοδα, τη moderation και το να μένουν τα rooms ήρεμα και διαθέσιμα."],
          ["Θα γίνει το Echoo επί πληρωμή;", "Όχι. Το Echoo δεν είναι φτιαγμένο γύρω από paywalls ή υποχρεωτικά upgrades."],
          ["Γιατί αποσυνδέθηκα;", "Ένα room μπορεί να τελειώσει αυτόματα, να πέσει για λίγο ή να κλείσει για λόγους ασφάλειας."],
          ["Μπορώ να επανασυνδεθώ μετά από refresh;", "Αν το room υπάρχει ακόμη και επιτρέπεται η επιστροφή σου, το Echoo θα προσπαθήσει να το επαναφέρει."],
          ["Είναι το Echoo app γνωριμιών;", "Όχι. Το Echoo είναι για ήρεμη κουβέντα, όχι για swiping ή dating προφίλ."],
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

      <SupportEchooCard />
    </PageShell>
  );
};

export default FAQPage;
