import { ArrowRight, Clock3, Home, Settings, Shield, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { CalmStateCard } from "@/components/presence/calm-state-card";
import { usePresence } from "@/components/presence/presence-provider";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { authenticated, profile, copy, language, adminMetrics, startQueue, online, accountRestriction } = usePresence();

  const roleLabel = profile?.role === "admin" ? (language === "en" ? "Admin" : "Admin") : language === "en" ? "Member" : "Μέλος";

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow="Echoo"
            title={copy.dashboard.title}
            body={language === "en" ? "Your anonymous profile is settling in." : "Το ανώνυμο προφίλ σου σταθεροποιείται."}
            status={copy.misc.loadingProfile}
          />
        </div>
      </PageShell>

    );
  }

  if (accountRestriction.status !== "ok") {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow={language === "en" ? "Account restricted" : "Ο λογαριασμός περιορίστηκε"}
            title={accountRestriction.status === "banned" ? (language === "en" ? "Matchmaking paused" : "Το matchmaking σταμάτησε") : (language === "en" ? "Temporary suspension" : "Προσωρινή αναστολή")}
            body={
              accountRestriction.reason ??
              (accountRestriction.status === "banned"
                ? language === "en"
                  ? "This account can’t enter rooms right now."
                  : "Αυτός ο λογαριασμός δεν μπορεί να μπει σε rooms αυτή τη στιγμή."
                : language === "en"
                  ? "You can return when the suspension expires."
                  : "Μπορείς να επιστρέψεις όταν λήξει η αναστολή.")
            }
            status={accountRestriction.expiresAt ? new Date(accountRestriction.expiresAt).toLocaleString() : undefined}
            tone="rose"
            action={
              <Link to="/safety">
                <Button className="h-11 rounded-full bg-rose-500 text-white hover:bg-rose-400">
                  {language === "en" ? "Review safety" : "Δες την ασφάλεια"}
                </Button>
              </Link>
            }
            secondaryAction={
              <Link to="/">
                <Button variant="outline" className="h-11 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  {copy.nav.home}
                </Button>
              </Link>
            }
          />
        </div>
      </PageShell>
    );
  }

  return (

    <PageShell className="space-y-6">
      <Surface className="space-y-6 p-6 sm:p-8">
        <SectionTitle title={copy.dashboard.title} body={copy.dashboard.body} />
        <div className="flex flex-wrap gap-3">
          <Link to="/">
            <Button variant="outline" className="h-11 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Home className="mr-2 h-4 w-4" />
              {copy.nav.home}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="h-11 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => navigate("/settings")}
          >
            <UserRound className="mr-2 h-4 w-4" />
            {copy.dashboard.profile}
          </Button>
        </div>

        <div className="rounded-[28px] border border-violet-400/15 bg-violet-400/10 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-violet-100/70">
            <span>{language === "en" ? "Ready to start as" : "Έτοιμος/η να ξεκινήσεις ως"}</span>
            <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-white/80 hover:bg-white/5">
              {roleLabel}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-3xl font-semibold text-white">{profile.username}</p>
            <Button
              variant="outline"
              className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/settings")}
            >
              <UserRound className="mr-2 h-4 w-4" />
              {copy.dashboard.profile}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label={copy.dashboard.online} value={String(adminMetrics.usersOnlineNow)} />
          <MetricCard label={copy.dashboard.wait} value={`${adminMetrics.avgWaitTimeSeconds}s`} />
          <MetricCard label={language === "en" ? "Live status" : "Ζωντανή κατάσταση"} value={online ? copy.misc.stable : copy.misc.reconnecting} />

        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard label={copy.dashboard.identity} value={profile.username} />
          <InfoCard label={copy.dashboard.filters} value={`${language === "en" ? "Saved" : "Αποθηκευμένα"}`} />
          <InfoCard label={language === "en" ? "Text first" : "Πρώτα text"} value={copy.session.textNote} />

        </div>

        <Button
          className="h-16 w-full rounded-[28px] bg-violet-500 text-base font-medium text-white hover:bg-violet-400"
          onClick={async () => {
            await startQueue();
            navigate("/queue");
          }}
        >
          {copy.dashboard.startSession}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Surface>

      <section className="grid gap-6 lg:grid-cols-3">
        <QuickActionCard icon={Shield} title={copy.dashboard.safety} body={copy.landing.safetyBody} to="/safety" />
        <QuickActionCard icon={Settings} title={copy.dashboard.settings} body={copy.settings.body} to="/settings" />
        <QuickActionCard
          icon={Clock3}
          title={language === "en" ? "Temporary by design" : "Προσωρινό by design"}
          body={language === "en" ? "Rooms fade when the moment ends." : "Τα rooms σβήνουν όταν τελειώσει το moment."}
          to="/retention"
        />

      </section>
    </PageShell>
  );
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/80">{value}</p>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  body,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link to={to}>
      <Surface className="h-full p-5 transition hover:bg-white/[0.06]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
      </Surface>
    </Link>
  );
}

export default DashboardPage;
