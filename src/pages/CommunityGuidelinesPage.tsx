import { HeartHandshake, ShieldAlert, Sparkles, Users } from "lucide-react";

import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";

const CommunityGuidelinesPage = () => {
  const { language } = usePresence();

  const copy =
    language === "en"
      ? {
          title: "Community Guidelines",
          body: "Echoo works best when people are kind, direct, and careful with each other.",
          intro:
            "These guidelines are not here to make the space cold. They are here so people can relax into a conversation without having to second-guess safety.",
          items: [
            { title: "Lead with kindness", body: "A small amount of warmth changes the whole room." },
            { title: "Respect consent", body: "If someone slows down, changes topic, or says no, that boundary is enough." },
            { title: "Keep it human", body: "No manipulation, no guilt games, no pretending closeness that is not there." },
            { title: "No hate or intimidation", body: "Do not use Echoo to attack, isolate, threaten, or humiliate people." },
            { title: "No explicit sexual behavior", body: "Keep sexual pressure, explicit behavior, and boundary-pushing out of the room." },
            { title: "Protect privacy", body: "Do not ask for or share personal details that make someone easier to track in real life." },
          ],
        }
      : {
          title: "Οδηγίες κοινότητας",
          body: "Το Echoo λειτουργεί καλύτερα όταν οι άνθρωποι είναι ευγενικοί, άμεσοι και προσεκτικοί μεταξύ τους.",
          intro:
            "Αυτές οι οδηγίες δεν υπάρχουν για να κάνουν τον χώρο ψυχρό. Υπάρχουν για να μπορούν οι άνθρωποι να χαλαρώσουν σε μια κουβέντα χωρίς να αναρωτιούνται αν η άλλη πλευρά είναι ασφαλής.",
          items: [
            { title: "Ξεκίνα με καλοσύνη", body: "Λίγη ζεστασιά αλλάζει ολόκληρο το room." },
            { title: "Σεβάσου τη συγκατάθεση", body: "Αν κάποιος επιβραδύνει, αλλάζει θέμα ή λέει όχι, αυτό το όριο αρκεί." },
            { title: "Μείνε ανθρώπινος/η", body: "Όχι χειρισμός, όχι παιχνίδια ενοχής, όχι προσποιητή οικειότητα που δεν υπάρχει." },
            { title: "Όχι hate ή εκφοβισμός", body: "Μη χρησιμοποιείς το Echoo για να επιτίθεσαι, να απομονώνεις, να απειλείς ή να εξευτελίζεις ανθρώπους." },
            { title: "Όχι ακραία σεξουαλική συμπεριφορά", body: "Κράτα μακριά από το room την πίεση, την ακραία συμπεριφορά και το pushing ορίων." },
            { title: "Προστάτεψε το απόρρητο", body: "Μην ζητάς ή μοιράζεσαι προσωπικά στοιχεία που κάνουν κάποιον πιο εύκολο να εντοπιστεί στην πραγματική ζωή." },
          ],
        };

  const icons = [HeartHandshake, ShieldAlert, Sparkles, Users, ShieldAlert, HeartHandshake] as const;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <SectionTitle title={copy.title} body={copy.body} />
        <p className="max-w-3xl text-sm leading-7 text-white/65">{copy.intro}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {copy.items.map((item, index) => {
            const Icon = icons[index] ?? Sparkles;
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
      </Surface>
    </PageShell>
  );
};

export default CommunityGuidelinesPage;
