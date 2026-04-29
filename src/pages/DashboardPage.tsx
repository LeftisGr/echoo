import { ArrowRight, Clock3, Settings, Shield, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  PageShell,
  SectionTitle,
  Surface,
} from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import {
  localizeAgeRange,
  localizeLanguagePreference,
  localizePreference,
} from "@/lib/presence-content";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { authenticated, profile, copy, language, adminMetrics, startQueue, online } = usePresence();

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <PageShell className="space-y-6">
        <Surface className="space-y-3 p-6 sm:p-8">
          <SectionTitle title={copy.dashboard.title} body={language === "en" ? "Loading your profile..." : "Φορτώνουμε το προφίλ σου..."} />
        </Surface>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-6 p-6 sm:p-8">
        <SectionTitle title={copy.dashboard.title} body={copy.dashboard.body} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
            <p className="text-sm text-white/50">{copy.dashboard.online}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{adminMetrics.usersOnlineNow}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
            <p className="text-sm text-white/50">{copy.dashboard.wait}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{adminMetrics.avgWaitTimeSeconds}s</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
            <p className="text-sm text-white/50">Realtime</p>
            <p className="mt-2 text-xl font-semibold text-white">{online ? copy.misc.stable : copy.misc.reconnecting}</p>
          </div>
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

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <Surface className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/50">{copy.dashboard.identity}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{profile.username}</h2>
              <p className="mt-2 text-sm text-white/60">{copy.dashboard.note}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
              {copy.misc.online}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatLine label={copy.auth.ageRange} value={localizeAgeRange(language, profile.ageRange)} />
            <StatLine label={copy.dashboard.filters} value={localizePreference(language, profile.preference)} />
            <StatLine label={copy.auth.language} value={localizeLanguagePreference(language, profile.language)} />
            <StatLine label={copy.auth.interests} value={profile.interests.join(" · ")} />
          </div>
        </Surface>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <QuickActionCard
            icon={UserRound}
            title={copy.dashboard.profile}
            body={copy.auth.helper}
            to="/auth"
          />
          <QuickActionCard
            icon={Shield}
            title={copy.dashboard.safety}
            body={copy.landing.safetyBody}
            to="/safety"
          />
          <QuickActionCard
            icon={Settings}
            title={copy.dashboard.settings}
            body={copy.settings.body}
            to="/settings"
          />
        </div>
      </section>

      <Surface className="p-5">
        <div className="flex items-center gap-3 text-white/70">
          <Clock3 className="h-4 w-4 text-violet-200" />
          <p className="text-sm">
            {language === "en"
              ? "Matching uses preference, language compatibility, and queue priority."
              : "Το matching χρησιμοποιεί προτίμηση, συμβατότητα γλώσσας και προτεραιότητα ουράς."}
          </p>
        </div>
      </Surface>
    </PageShell>
  );
};

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

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-2 text-sm text-white/80">{value}</p>
    </div>
  );
}

export default DashboardPage;