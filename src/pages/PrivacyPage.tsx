import { Bell, Mail, MapPin, ShieldCheck, Sparkles, TimerReset, Users } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const PrivacyPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Privacy Policy",
          body: "Echoo keeps things simple: private rooms, minimal data, and no unnecessary tracking.",
          intro:
            "Here’s the plain version. We only keep what we need to run the app, protect people, and keep the experience working well.",
          sections: [
            {
              title: "Voice",
              body: "Echoo does not record or store live voice conversations.",
            },
            {
              title: "Rooms",
              body: "Rooms are temporary and not publicly accessible.",
            },
            {
              title: "Location",
              body: "Nearby/Away uses approximate distance only and only when permission is granted.",
            },
            {
              title: "Reports",
              body: "Reports may store minimal moderation information.",
            },
            {
              title: "Profiles",
              body: "Echoo does not provide public profile browsing.",
            },
            {
              title: "What we collect",
              body: "We keep the basics needed to run the app, like sign-in details, your profile settings, room activity, and simple usage data that helps us keep Echoo stable.",
            },
            {
              title: "Your rights",
              body: "If you’re in the EU or UK, you can ask to access, correct, delete, or limit certain data, and you can ask us what we keep and why.",
            },
          ],
          contact: "For privacy requests, email privacy@echoo.app.",
        }
      : {
          title: "Πολιτική απορρήτου",
          body: "Το Echoo κρατά τα πράγματα απλά: ιδιωτικά rooms, ελάχιστα δεδομένα και χωρίς περιττό tracking.",
          intro:
            "Η απλή εκδοχή είναι αυτή: κρατάμε μόνο ό,τι χρειαζόμαστε για να λειτουργεί η app, να προστατεύουμε τους ανθρώπους και να μένει η εμπειρία σταθερή.",
          sections: [
            {
              title: "Φωνή",
              body: "Το Echoo δεν καταγράφει ούτε αποθηκεύει ζωντανές φωνητικές συνομιλίες.",
            },
            {
              title: "Rooms",
              body: "Τα rooms είναι προσωρινά και δεν είναι δημόσια προσβάσιμα.",
            },
            {
              title: "Τοποθεσία",
              body: "Το Nearby/Away χρησιμοποιεί μόνο κατά προσέγγιση απόσταση και μόνο όταν δοθεί άδεια.",
            },
            {
              title: "Reports",
              body: "Τα reports μπορεί να αποθηκεύουν ελάχιστες πληροφορίες moderation.",
            },
            {
              title: "Profiles",
              body: "Το Echoo δεν προσφέρει δημόσια περιήγηση προφίλ.",
            },
            {
              title: "Τι συλλέγουμε",
              body: "Κρατάμε τα βασικά που χρειάζονται για να λειτουργεί η app, όπως στοιχεία σύνδεσης, ρυθμίσεις προφίλ, δραστηριότητα στα rooms και απλά usage δεδομένα που βοηθούν το Echoo να παραμένει σταθερό.",
            },
            {
              title: "Τα δικαιώματά σου",
              body: "Αν βρίσκεσαι στην ΕΕ ή στο Ηνωμένο Βασίλειο, μπορείς να ζητήσεις πρόσβαση, διόρθωση, διαγραφή ή περιορισμό ορισμένων δεδομένων, και μπορείς να μας ρωτήσεις τι κρατάμε και γιατί.",
            },
          ],
          contact: "Για privacy requests, στείλε email στο privacy@echoo.app.",
        };

  const icons = [Sparkles, TimerReset, MapPin, Bell, Users, ShieldCheck, Mail] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>

        <div className="grid gap-4 lg:grid-cols-2">
          {copy.sections.map((section, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={section.title} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-white">{section.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{section.body}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-violet-300/15 bg-violet-500/10 p-5 text-sm leading-7 text-violet-50">
          {copy.contact}
        </div>
      </Surface>
    </PageShell>
  );
};

export default PrivacyPage;
