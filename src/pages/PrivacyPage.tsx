import { Bell, Mail, MapPin, Mic, ShieldCheck, Sparkles, TimerReset, Users } from "lucide-react";

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
            "Here's the plain version. We only keep what we need to run the app, protect people, and keep the experience working well.",
          sections: [
            {
              title: "Voice conversations",
              body: "Echoo does not record or store live voice conversations between users.",
            },
            {
              title: "Broken Telephone audio",
              body: "Short anonymous voice messages left in the Broken Telephone feature are stored temporarily in our servers and deleted automatically after 24 hours.",
            },
            {
              title: "Rooms",
              body: "Rooms are temporary and not publicly accessible. Most room content is ephemeral.",
            },
            {
              title: "Location",
              body: "Nearby/Away uses approximate distance only and only when permission is granted. Precise coordinates are never stored.",
            },
            {
              title: "Push notifications",
              body: "If you enable push notifications, we store a device subscription token linked to your account. This is used only to send match alerts and event reminders. You can disable this at any time from Settings.",
            },
            {
              title: "Reports",
              body: "Reports may store minimal moderation information to help keep the space safe.",
            },
            {
              title: "What we collect",
              body: "We keep the basics needed to run the app: sign-in details, profile settings, room activity, and simple usage data that helps us keep Echoo stable. We do not sell your data.",
            },
            {
              title: "Your rights",
              body: "If you're in the EU or UK, you can ask to access, correct, delete, or limit certain data. You can also delete your account directly from Settings at any time.",
            },
          ],
          contact: "For privacy requests, email hello@echoo.gr.",
        }
      : {
          title: "Πολιτική απορρήτου",
          body: "Το Echoo κρατά τα πράγματα απλά: ιδιωτικά rooms, ελάχιστα δεδομένα και χωρίς περιττό tracking.",
          intro:
            "Η απλή εκδοχή: κρατάμε μόνο ό,τι χρειαζόμαστε για να λειτουργεί η app, να προστατεύουμε τους ανθρώπους και να μένει η εμπειρία σταθερή.",
          sections: [
            {
              title: "Φωνητικές συνομιλίες",
              body: "Το Echoo δεν καταγράφει ούτε αποθηκεύει ζωντανές φωνητικές συνομιλίες μεταξύ χρηστών.",
            },
            {
              title: "Ηχητικά Σπασμένου Τηλεφώνου",
              body: "Τα σύντομα ανώνυμα φωνητικά μηνύματα που αφήνονται στο Σπασμένο Τηλέφωνο αποθηκεύονται προσωρινά στους servers μας και διαγράφονται αυτόματα μετά από 24 ώρες.",
            },
            {
              title: "Rooms",
              body: "Τα rooms είναι προσωρινά και δεν είναι δημόσια προσβάσιμα. Το μεγαλύτερο μέρος του περιεχομένου είναι εφήμερο.",
            },
            {
              title: "Τοποθεσία",
              body: "Το Nearby/Away χρησιμοποιεί μόνο κατά προσέγγιση απόσταση και μόνο όταν δοθεί άδεια. Οι ακριβείς συντεταγμένες δεν αποθηκεύονται ποτέ.",
            },
            {
              title: "Push ειδοποιήσεις",
              body: "Αν ενεργοποιήσεις τις ειδοποιήσεις, αποθηκεύουμε ένα subscription token συνδεδεμένο με τον λογαριασμό σου. Χρησιμοποιείται μόνο για να σου στέλνουμε ειδοποιήσεις match και event reminders. Μπορείς να το απενεργοποιήσεις οποτεδήποτε από τις Ρυθμίσεις.",
            },
            {
              title: "Reports",
              body: "Τα reports μπορεί να αποθηκεύουν ελάχιστες πληροφορίες moderation για να κρατάμε τον χώρο ασφαλή.",
            },
            {
              title: "Τι συλλέγουμε",
              body: "Κρατάμε τα βασικά: στοιχεία σύνδεσης, ρυθμίσεις προφίλ, δραστηριότητα στα rooms και απλά usage δεδομένα που βοηθούν το Echoo να παραμένει σταθερό. Δεν πουλάμε τα δεδομένα σου.",
            },
            {
              title: "Τα δικαιώματά σου",
              body: "Αν βρίσκεσαι στην ΕΕ ή στο Ηνωμένο Βασίλειο, μπορείς να ζητήσεις πρόσβαση, διόρθωση, διαγραφή ή περιορισμό ορισμένων δεδομένων. Μπορείς επίσης να διαγράψεις τον λογαριασμό σου από τις Ρυθμίσεις οποτεδήποτε.",
            },
          ],
          contact: "Για privacy requests, στείλε email στο hello@echoo.gr.",
        };

  const icons = [Sparkles, Mic, TimerReset, MapPin, Bell, ShieldCheck, Users, Mail] as const;

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
