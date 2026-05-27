import { AlertTriangle, Ban, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const TermsPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Terms of Service",
          body: "Echoo is a calm place for real conversation. These terms keep the space respectful and safe for everyone.",
          intro:
            "By using Echoo, you agree to treat people with care, keep the conversation legal, and respect that anonymity is not a shield for harm.",
          items: [
            { title: "Be respectful", body: "No harassment, intimidation, hate speech, coercion, stalking, or pressure of any kind." },
            { title: "No illegal or harmful content", body: "Do not share illegal material, explicit sexual content that crosses boundaries, threats, or anything meant to harm another person." },
            { title: "No impersonation or spam", body: "Do not pretend to be someone else, use bots to abuse the app, or flood rooms with repeated messages." },
            { title: "Respect anonymity", body: "Echoo is anonymous, but you are still responsible for how you behave." },
            { title: "Rooms are temporary", body: "Rooms can end automatically. Media, voice, and text are temporary and may disappear." },
            { title: "Safety actions matter", body: "Reports, suspensions, and bans may be applied when behaviour crosses the line or repeats after warnings." },
          ],
          footer: "Echoo is provided as-is. Availability can change, and we may pause or limit access to protect the service and the people using it.",
        }
      : {
          title: "Όροι χρήσης",
          body: "Το Echoo είναι ένας ήρεμος χώρος για αληθινή κουβέντα. Αυτοί οι όροι κρατούν τον χώρο σεβαστικό και ασφαλή για όλους.",
          intro:
            "Χρησιμοποιώντας το Echoo, συμφωνείς να φέρεσαι με φροντίδα, να κρατάς την κουβέντα νόμιμη και να σέβεσαι ότι η ανωνυμία δεν είναι κάλυμμα για βλάβη.",
          items: [
            { title: "Μίλα με σεβασμό", body: "Όχι παρενόχληση, εκφοβισμός, hate speech, καταναγκασμός, stalking ή πίεση οποιασδήποτε μορφής." },
            { title: "Όχι παράνομο ή επιβλαβές περιεχόμενο", body: "Μην μοιράζεσαι παράνομο υλικό, ακραίο σεξουαλικό περιεχόμενο που ξεπερνά τα όρια, απειλές ή οτιδήποτε έχει στόχο να βλάψει άλλον άνθρωπο." },
            { title: "Όχι impersonation ή spam", body: "Μην προσποιείσαι ότι είσαι άλλος άνθρωπος, μην χρησιμοποιείς bots για κατάχρηση της app και μην γεμίζεις rooms με επαναλαμβανόμενα μηνύματα." },
            { title: "Σεβάσου την ανωνυμία", body: "Το Echoo είναι ανώνυμο, αλλά εσύ παραμένεις υπεύθυνος/η για τη συμπεριφορά σου." },
            { title: "Τα rooms είναι προσωρινά", body: "Τα rooms μπορούν να τελειώσουν αυτόματα. Media, φωνή και text είναι προσωρινά και μπορεί να εξαφανιστούν." },
            { title: "Τα μέτρα ασφάλειας έχουν σημασία", body: "Reports, αναστολές και bans μπορεί να εφαρμοστούν όταν η συμπεριφορά ξεπερνά τα όρια ή επαναλαμβάνεται μετά από προειδοποιήσεις." },
          ],
          footer: "Το Echoo παρέχεται ως έχει. Η διαθεσιμότητα μπορεί να αλλάξει και μπορούμε να περιορίσουμε προσωρινά την πρόσβαση για να προστατεύσουμε την υπηρεσία και τους ανθρώπους που τη χρησιμοποιούν.",
        };

  const icons = [ShieldCheck, AlertTriangle, Sparkles, UserRound, Ban, ShieldCheck] as const;

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
