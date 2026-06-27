import { AlertTriangle, Ban, MapPin, Mic, ShieldCheck, Sparkles, TimerReset, Users } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const TermsPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Terms of Service",
          body: "Echoo is meant to feel calm, clear, and respectful. These terms keep the space safe for everyone.",
          intro:
            "By using Echoo, you agree to treat people with care, keep things legal, and remember that anonymity never gives you a free pass to cause harm.",
          items: [
            { title: "Voice conversations", body: "Echoo does not record or store live voice conversations between users." },
            { title: "Broken Telephone", body: "Short voice messages left in the Broken Telephone feature are anonymous, 15 seconds maximum, and automatically deleted after 24 hours. Keep them respectful." },
            { title: "Rooms", body: "Rooms are temporary and not publicly accessible. What happens inside a room stays between the people in it." },
            { title: "Location", body: "Nearby/Away uses approximate distance only and only when permission is granted. Precise coordinates are never stored." },
            { title: "Push notifications", body: "Notifications are optional. You can enable or disable them at any time from Settings." },
            { title: "Profiles", body: "Echoo does not provide public profile browsing. Your nickname is private and only visible inside active rooms." },
            { title: "Be respectful", body: "No harassment, intimidation, hate speech, coercion, stalking, or pressure of any kind." },
            { title: "No illegal or harmful content", body: "Do not share illegal material, threats, or anything meant to hurt another person — including inside voice messages." },
            { title: "Safety actions matter", body: "Reports, suspensions, and bans may be used when behaviour crosses the line or repeats after warnings." },
          ],
          footer: "Echoo is provided as-is. We may pause or limit access when needed to protect the service and the people using it.",
        }
      : {
          title: "Όροι χρήσης",
          body: "Το Echoo θέλει να είναι ήρεμο, καθαρό και σεβαστικό. Αυτοί οι όροι κρατούν τον χώρο ασφαλή για όλους.",
          intro:
            "Χρησιμοποιώντας το Echoo, συμφωνείς να φέρεσαι με φροντίδα, να κρατάς τα πράγματα νόμιμα και να θυμάσαι ότι η ανωνυμία δεν δίνει ποτέ άδεια για βλάβη.",
          items: [
            { title: "Φωνητικές συνομιλίες", body: "Το Echoo δεν καταγράφει ούτε αποθηκεύει ζωντανές φωνητικές συνομιλίες μεταξύ χρηστών." },
            { title: "Σπασμένο Τηλέφωνο", body: "Τα φωνητικά μηνύματα στο Σπασμένο Τηλέφωνο είναι ανώνυμα, μέγιστης διάρκειας 15 δευτερολέπτων και διαγράφονται αυτόματα μετά από 24 ώρες. Κράτα τα σεβαστά." },
            { title: "Rooms", body: "Τα rooms είναι προσωρινά και δεν είναι δημόσια προσβάσιμα. Αυτά που συμβαίνουν μέσα παραμένουν μεταξύ των ανθρώπων που βρίσκονται εκεί." },
            { title: "Τοποθεσία", body: "Το Nearby/Away χρησιμοποιεί μόνο κατά προσέγγιση απόσταση και μόνο όταν δοθεί άδεια. Οι ακριβείς συντεταγμένες δεν αποθηκεύονται ποτέ." },
            { title: "Push ειδοποιήσεις", body: "Οι ειδοποιήσεις είναι προαιρετικές. Μπορείς να τις ενεργοποιήσεις ή να τις απενεργοποιήσεις οποτεδήποτε από τις Ρυθμίσεις." },
            { title: "Profiles", body: "Το Echoo δεν προσφέρει δημόσια περιήγηση προφίλ. Το ψευδώνυμό σου είναι ιδιωτικό και ορατό μόνο μέσα σε ενεργά rooms." },
            { title: "Μίλα με σεβασμό", body: "Όχι παρενόχληση, εκφοβισμός, hate speech, καταναγκασμός, stalking ή πίεση οποιασδήποτε μορφής." },
            { title: "Όχι παράνομο ή επιβλαβές περιεχόμενο", body: "Μην μοιράζεσαι παράνομο υλικό, απειλές ή οτιδήποτε έχει στόχο να βλάψει — συμπεριλαμβανομένων των φωνητικών μηνυμάτων." },
            { title: "Τα μέτρα ασφάλειας έχουν σημασία", body: "Reports, αναστολές και bans μπορεί να χρησιμοποιηθούν όταν η συμπεριφορά ξεπερνά τα όρια ή επαναλαμβάνεται μετά από προειδοποιήσεις." },
          ],
          footer: "Το Echoo παρέχεται ως έχει. Μπορούμε να περιορίσουμε προσωρινά την πρόσβαση όταν χρειάζεται για να προστατεύσουμε την υπηρεσία και τους ανθρώπους που τη χρησιμοποιούν.",
        };

  const icons = [Sparkles, Mic, TimerReset, MapPin, Bell, Users, AlertTriangle, Ban, ShieldCheck] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>

        <div className="grid gap-4 lg:grid-cols-2">
          {copy.items.map((item, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={item.title} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{item.body}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/65">
          {copy.footer}
        </div>
      </Surface>
    </PageShell>
  );
};

export default TermsPage;
