import { Check, Sparkles } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { whatsNextConfig } from "@/config/whats-next";

function localizeItem(item: { en: string; el: string }, language: "en" | "el") {
  return item[language];
}

const WhatsNextPage = () => {
  const { authenticated, language } = usePresence();

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  const workingOn = whatsNextConfig.workingOn.slice(0, 5);
  const recentlyShipped = whatsNextConfig.recentlyShipped.slice(0, 5);

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-violet-50 hover:bg-violet-500/10">
            {language === "en" ? "Main menu" : "Κεντρικό μενού"}
          </Badge>
          <Link
            to="/dashboard"
            className="text-xs uppercase tracking-[0.22em] text-white/40 transition hover:text-white/70"
          >
            {language === "en" ? "Back to dashboard" : "Πίσω στο dashboard"}
          </Link>
        </div>

        <SectionTitle
          eyebrow="Echoo"
          title={language === "en" ? "What’s Next" : "Τι ακολουθεί"}
          body={language === "en" ? "A small public view of what we’re shaping next." : "Μια μικρή δημόσια ματιά σε όσα διαμορφώνονται στη συνέχεια."}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-300/15 bg-violet-500/10 text-violet-50">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-white">{language === "en" ? "Working on" : "Σε εξέλιξη"}</h2>
            </div>

            <ul className="mt-4 space-y-3">
              {workingOn.map((item) => (
                <li key={item.en} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0f1526] px-4 py-3 text-sm leading-6 text-white/75">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/10 text-[10px] text-violet-100">
                    ✨
                  </span>
                  <span>{localizeItem(item, language)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/15 bg-emerald-500/10 text-emerald-50">
                <Check className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-white">{language === "en" ? "Recently shipped" : "Μόλις κυκλοφόρησαν"}</h2>
            </div>

            <ul className="mt-4 space-y-3">
              {recentlyShipped.map((item) => (
                <li key={item.en} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0f1526] px-4 py-3 text-sm leading-6 text-white/75">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/10 text-[10px] text-emerald-100">
                    ✓
                  </span>
                  <span>{localizeItem(item, language)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          {localizeItem(whatsNextConfig.footer, language)}
        </div>
      </Surface>
    </PageShell>
  );
};

export default WhatsNextPage;
