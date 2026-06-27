import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const FAQPage = () => {
  const { language } = usePresence();

  const items =
    language === "en"
      ? [
          ["Is Echoo free?", "Yes. Echoo is completely free to use."],
          ["Why does Echoo ask for support?", "Optional support helps maintain servers, audio infrastructure, moderation tools, and future improvements."],
          ["Will Echoo become paid?", "The core Echoo experience is intended to remain accessible to everyone."],
          ["Is Echoo anonymous?", "Yes. Echoo is built so you can talk without giving away your real identity. Your nickname is randomly assigned and your email is never visible to other users."],
          ["What is Broken Telephone?", "Broken Telephone is a short voice message chain for people waiting alone in the queue. If no match is found after 60 seconds, you can leave a 15-second anonymous voice message for the next person waiting — and hear one left by someone before you. No names, no history, just voices passing through."],
          ["How do push notifications work?", "If you enable notifications in Settings, Echoo will alert you when a match is found — even if the tab is minimised or the browser is in the background. On iOS, you need to add Echoo to your Home Screen first."],
          ["What is Sunday Nights?", "Sunday Nights is a weekly event where more people tend to be online between 20:00 and midnight. Enable push notifications to get reminded when it starts."],
          ["Can I keep my profile when I upgrade from guest?", "Yes. When you upgrade from a guest account to a registered one, your nickname, interests, and conversation history are carried over automatically."],
          ["What does Nearby / Away mean?", "It is a simple distance cue shown inside a room. Nearby means you and the other person are roughly in the same area; Away means you are farther apart. It uses approximate location only and requires your permission."],
          ["Why does Echoo ask for location access?", "Only to calculate Nearby / Away inside a room. Echoo uses a coarse, approximate location so the app can stay private while still giving that small signal."],
          ["Can people see my email?", "No. Your email is used for sign-in and account recovery only, never shown to other users."],
          ["Why does voice unlock later?", "Because slower pacing feels calmer and gives the conversation room to become natural."],
          ["Are messages stored?", "Most room content is temporary. Some safety records may stay longer to protect people."],
          ["What happens when a room ends?", "The room closes automatically and the conversation stops being active."],
        ]
      : [
          ["Το Echoo είναι δωρεάν;", "Ναι. Το Echoo είναι πλήρως δωρεάν."],
          ["Γιατί το Echoo ζητά υποστήριξη;", "Η προαιρετική υποστήριξη βοηθά στη συντήρηση των servers, του ήχου, της ασφάλειας και στις μελλοντικές βελτιώσεις."],
          ["Θα γίνει επί πληρωμή;", "Η βασική εμπειρία του Echoo προορίζεται να παραμείνει προσβάσιμη για όλους."],
          ["Είναι το Echoo ανώνυμο;", "Ναι. Το Echoo έχει σχεδιαστεί ώστε να μιλάς χωρίς να αποκαλύπτεις την πραγματική σου ταυτότητα. Το ψευδώνυμό σου είναι τυχαίο και το email σου δεν είναι ορατό σε άλλους χρήστες."],
          ["Τι είναι το Σπασμένο Τηλέφωνο;", "Το Σπασμένο Τηλέφωνο είναι μια αλυσίδα φωνητικών μηνυμάτων για όσους περιμένουν μόνοι στην ουρά. Αν δεν βρεθεί match μετά από 60 δευτερόλεπτα, μπορείς να αφήσεις ένα φωνητικό 15 δευτερολέπτων για τον επόμενο που περιμένει — και να ακούσεις ένα που άφησε κάποιος πριν από σένα. Χωρίς ονόματα, χωρίς ιστορικό."],
          ["Πώς λειτουργούν οι ειδοποιήσεις;", "Αν ενεργοποιήσεις τις ειδοποιήσεις στις Ρυθμίσεις, το Echoo θα σε ειδοποιεί όταν βρεθεί match — ακόμα και αν το tab είναι minimized ή το browser στο παρασκήνιο. Σε iOS χρειάζεται να προσθέσεις το Echoo στην Αρχική Οθόνη."],
          ["Τι είναι το Sunday Nights;", "Το Sunday Nights είναι ένα εβδομαδιαίο event όπου περισσότεροι χρήστες μπαίνουν online μεταξύ 20:00 και μεσάνυχτα. Ενεργοποίησε τις ειδοποιήσεις για να σε ενημερώσουμε όταν ξεκινά."],
          ["Κρατιέται το προφίλ μου όταν κάνω upgrade από guest;", "Ναι. Όταν κάνεις upgrade από guest σε εγγεγραμμένο λογαριασμό, το ψευδώνυμο, τα ενδιαφέροντα και το ιστορικό συνομιλιών σου μεταφέρονται αυτόματα."],
          ["Τι σημαίνει Nearby / Away;", "Είναι μια απλή ένδειξη απόστασης μέσα στο room. Nearby σημαίνει ότι εσύ και ο άλλος χρήστης βρίσκεστε περίπου στην ίδια περιοχή· Away σημαίνει ότι είστε πιο μακριά. Χρησιμοποιεί μόνο κατά προσέγγιση τοποθεσία και απαιτεί την άδειά σου."],
          ["Γιατί το Echoo ζητά πρόσβαση στην τοποθεσία;", "Μόνο για να υπολογίσει το Nearby / Away μέσα στο room. Χρησιμοποιεί κατά προσέγγιση τοποθεσία για να παραμείνει ιδιωτικό."],
          ["Μπορούν να δουν το email μου;", "Όχι. Το email χρησιμοποιείται μόνο για σύνδεση και ανάκτηση λογαριασμού, δεν εμφανίζεται σε άλλους χρήστες."],
          ["Γιατί η φωνή ξεκλειδώνει αργότερα;", "Επειδή το πιο αργό pacing νιώθει πιο ήρεμο και αφήνει την κουβέντα να γίνει φυσική."],
          ["Αποθηκεύονται τα μηνύματα;", "Το μεγαλύτερο μέρος του room είναι προσωρινό. Κάποια safety records μπορεί να μένουν περισσότερο για προστασία."],
          ["Τι γίνεται όταν τελειώσει ένα room;", "Το room κλείνει αυτόματα και η κουβέντα δεν παραμένει ενεργή."],
        ];

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle
          title={language === "en" ? "Frequently asked questions" : "Συχνές ερωτήσεις"}
          body={language === "en" ? "Short answers to the things people usually want to know first." : "Σύντομες απαντήσεις για όσα θέλουν συνήθως να ξέρουν πρώτα οι άνθρωποι."}
        />
        <Accordion type="single" collapsible className="space-y-2">
          {items.map(([question, answer], index) => (
            <AccordionItem key={question} value={`faq-${index}`} className="rounded-[22px] border border-white/10 bg-black/20 px-4">
              <AccordionTrigger className="text-left text-sm text-white hover:no-underline">{question}</AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-white/65">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Surface>
    </PageShell>
  );
};

export default FAQPage;
