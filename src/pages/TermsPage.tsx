import { AlertTriangle, Ban, MapPin, ShieldCheck, Sparkles, TimerReset, Users } from "lucide-react";

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
            { title: "Voice", body: "Echoo does not record or store live voice conversations." },
            { title: "Rooms", body: "Rooms are temporary and not publicly accessible." },
            { title: "Location", body: "Nearby/Away uses approximate distance only and only when permission is granted." },
            { title: "Reports", body: "Reports may store minimal moderation information." },
            { title: "Profiles", body: "Echoo does not provide public profile browsing." },
            { title: "Be respectful", body: "No harassment, intimidation, hate speech, coercion, stalking, or pressure of any kind." },
            { title: "No illegal or harmful content", body: "Do not share illegal material, threats, or anything meant to hurt another person." },
            { title: "No impersonation or spam", body: "Do not pretend to be someone else, use bots to abuse the app, or flood rooms with repeated messages." },
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
            { title: "Φωνή", body: "Το Echoo δεν καταγράφει ούτε αποθηκεύει ζωντανές φωνητικές συνομιλίες." },
            { title: "Rooms", body: "Τα rooms είναι προσωρινά και δεν είναι δημόσια προσβάσιμα." },
            { title: "Τοποθεσία", body: "Το Nearby/Away χρησιμοποιεί μόνο κατά προσέγγιση απόσταση και μόνο όταν δοθεί άδεια." },
            { title: "Reports", body: "Τα reports μπορεί να αποθηκεύουν ελάχιστες πληροφορίες moderation." },
            { title: "Profiles", body: "Το Echoo δεν προσφέρει δημόσια περιήγηση προφίλ." },
            { title: "Μίλα με σεβασμό", body: "Όχι παρενόχληση, εκφοβισμός, hate speech, καταναγκασμός, stalking ή πίεση οποιασδήποτε μορφής." },
            { title: "Όχι παράνομο ή επιβλαβές περιεχόμενο", body: "Μην μοιράζεσαι παράνομο υλικό, απειλές ή οτιδήποτε έχει στόχο να βλάψει άλλον άνθρωπο." },
            { title: "Όχι impersonation ή spam", body: "Μην προσποιείσαι ότι είσαι άλλος άνθρωπος, μην χρησιμοποιείς bots για κατάχρηση της app και μην γεμίζεις rooms με επαναλαμβανόμενα μηνύματα." },
            { title: "Τα μέτρα ασφάλειας έχουν σημασία", body: "Reports, αναστολές και bans μπορεί να χρησιμοποιηθούν όταν η συμπεριφορά ξεπερνά τα όρια ή επαναλαμβάνεται μετά από προειδοποιήσεις." },
          ],
          footer: "Το Echoo παρέχεται ως έχει. Μπορούμε να περιορίσουμε προσωρινά την πρόσβαση όταν χρειάζεται για να προστατεύσουμε την υπηρεσία και τους ανθρώπους που τη χρησιμοποιούν.",
        };

  const icons = [ShieldCheck, TimerReset, MapPin, AlertTriangle, Users, Sparkles, ShieldCheck, Ban, ShieldCheck] as const;

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
