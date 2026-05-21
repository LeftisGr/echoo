import { useCallback, useEffect, useState } from "react";
import { Activity, Flag, Gauge, Home, MessagesSquare, RefreshCcw, UserPlus, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Link, Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { adminChartData } from "@/lib/presence-content";
import { supabase } from "@/integrations/supabase/client";

const chartConfig = {
  sessions: { label: "Sessions", color: "#8b5cf6" },
  reports: { label: "Reports", color: "#f59e0b" },
  signups: { label: "Signups", color: "#60a5fa" },
};

type ReportRow = {
  id: string;
  room_id: string;
  reporter_id: string;
  reported_user: string;
  reason: string;
  created_at: string;
};

const AdminPage = () => {
  const { authenticated, adminMetrics, isAdmin, profile, copy, language } = usePresence();
  const [recentReports, setRecentReports] = useState<ReportRow[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from("reports")
      .select("id, room_id, reporter_id, reported_user, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentReports((data ?? []) as ReportRow[]);
    setLoadingReports(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadReports();
    }
  }, [isAdmin, loadReports]);

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <PageShell className="space-y-6">
        <Surface className="space-y-3 p-6 sm:p-8">
          <SectionTitle title="Echoo admin" body={copy.misc.loadingProfile} />
        </Surface>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-4 p-6 sm:p-8">
        <SectionTitle
          eyebrow={language === "en" ? "Hidden route" : "Κρυφή διαδρομή"}
          title="Echoo admin"
          body={
            language === "en"
              ? "A quiet dashboard for launch metrics, queue health, and safety signals."
              : "Ένα ήσυχο dashboard για metrics, υγεία της ουράς και σήματα ασφάλειας."
          }
        />

        <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/50">
            {profile.role}
          </div>
          <p className="text-sm text-white/55">
            {isAdmin
              ? language === "en"
                ? "Admin access is active on this profile."
                : "Η πρόσβαση διαχείρισης είναι ενεργή σε αυτό το προφίλ."
              : language === "en"
                ? "This profile is still a member. Change the role in public.profiles to admin when you want to grant access."
                : "Αυτό το προφίλ είναι ακόμα μέλος. Άλλαξε το role στο public.profiles σε admin όταν θέλεις να δώσεις πρόσβαση."}
          </p>
          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => void loadReports()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {language === "en" ? "Refresh" : "Ανανέωση"}
            </Button>
            <Link to="/">
              <Button variant="outline" className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Home className="mr-2 h-4 w-4" />
                {copy.nav.home}
              </Button>
            </Link>
          </div>
        </div>
      </Surface>

      {isAdmin ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard icon={Users} label={language === "en" ? "Total users" : "Σύνολο χρηστών"} value={adminMetrics.totalUsers.toString()} />
            <MetricCard icon={Activity} label={language === "en" ? "Active users" : "Ενεργοί χρήστες"} value={adminMetrics.activeUsers.toString()} />
            <MetricCard icon={Gauge} label={language === "en" ? "Queue size" : "Μέγεθος ουράς"} value={adminMetrics.queueCount.toString()} />
            <MetricCard icon={MessagesSquare} label={language === "en" ? "Active rooms" : "Ενεργά rooms"} value={adminMetrics.activeRooms.toString()} />
            <MetricCard icon={Flag} label={language === "en" ? "Reports" : "Αναφορές"} value={adminMetrics.reportsCount.toString()} />
            <MetricCard icon={UserPlus} label={language === "en" ? "Daily signups" : "Ημερήσιες εγγραφές"} value={adminMetrics.dailySignups.toString()} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Surface className="p-5">
              <p className="mb-4 text-sm uppercase tracking-[0.22em] text-white/40">
                {language === "en" ? "Sessions + reports" : "Sessions + αναφορές"}
              </p>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <AreaChart data={adminChartData}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="sessions" stroke="var(--color-sessions)" fill="var(--color-sessions)" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="reports" stroke="var(--color-reports)" fill="var(--color-reports)" fillOpacity={0.14} />
                </AreaChart>
              </ChartContainer>
            </Surface>

            <Surface className="p-5">
              <p className="mb-4 text-sm uppercase tracking-[0.22em] text-white/40">
                {language === "en" ? "Signups" : "Εγγραφές"}
              </p>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={adminChartData}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="signups" fill="var(--color-signups)" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Surface>
          </div>

          <Surface className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">{language === "en" ? "Average session duration" : "Μέση διάρκεια session"}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{adminMetrics.averageSessionDuration} min</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">{language === "en" ? "Average wait time" : "Μέσος χρόνος αναμονής"}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{adminMetrics.avgWaitTimeSeconds}s</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">{language === "en" ? "Safety status" : "Κατάσταση ασφάλειας"}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{language === "en" ? "Stable" : "Σταθερή"}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Recent reports" : "Πρόσφατες αναφορές"}</p>
                  <p className="mt-1 text-sm text-white/55">
                    {language === "en" ? "The latest moderation signals from live rooms." : "Τα πιο πρόσφατα σήματα moderation από live rooms."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => void loadReports()}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {language === "en" ? "Reload" : "Επαναφόρτωση"}
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {loadingReports ? (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                    {copy.misc.loading}
                  </div>
                ) : recentReports.length ? (
                  recentReports.map((report) => (
                    <div key={report.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/45">
                        <span>
                          {language === "en" ? "Room" : "Room"} {report.room_id.slice(0, 8)}
                        </span>
                        <span>•</span>
                        <span>{new Date(report.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/75">{report.reason}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                          {language === "en" ? "Reporter" : "Αναφέρων"} {report.reporter_id.slice(0, 8)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                          {language === "en" ? "Reported" : "Αναφερόμενος"} {report.reported_user.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                    {language === "en" ? "No recent reports yet." : "Δεν υπάρχουν ακόμα πρόσφατες αναφορές."}
                  </div>

                )}
              </div>
            </div>
          </Surface>
        </>
      ) : (
        <Surface className="space-y-3 p-6 text-white/75">
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">
            {language === "en" ? "Access restricted" : "Περιορισμένη πρόσβαση"}
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {language === "en" ? "You do not have admin access yet." : "Δεν έχεις ακόμη πρόσβαση διαχείρισης."}

          </h2>
          <p className="text-sm leading-7 text-white/60">
            {language === "en"
              ? "Update the role column in public.profiles to admin for this account, then refresh the app."
              : "Άλλαξε το role στο public.profiles σε admin για αυτόν τον λογαριασμό και μετά ανανέωσε την app."}
          </p>
        </Surface>
      )}
    </PageShell>
  );
};

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Surface className="p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-100">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </Surface>
  );
}

export default AdminPage;
