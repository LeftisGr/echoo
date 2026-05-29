import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  AlertTriangle,
  Clock3,
  Flag,
  Gauge,
  Home,
  MessagesSquare,
  RefreshCcw,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  WifiOff,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Link, Navigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { CalmStateCard } from "@/components/presence/calm-state-card";
import { usePresence } from "@/components/presence/presence-provider";

import { adminChartData } from "@/lib/presence-content";
import { cleanupOperationalLogs } from "@/lib/operational-logs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const chartConfig = {
  sessions: { label: "Sessions", color: "#8b5cf6" },
  reports: { label: "Reports", color: "#f59e0b" },
  signups: { label: "Signups", color: "#60a5fa" },
};

interface ReportRow {
  id: string;
  room_id: string;
  reporter_id: string;
  reported_user: string;
  reason: string;
  status: string;
  reviewed_at: string | null;
  moderation_action: string | null;
  moderation_reason: string | null;
  created_at: string;
}

interface ErrorLogRow {
  id: string;
  event_type: string;
  severity: string;
  error_message: string;
  error_code: string | null;
  room_id: string | null;
  anonymized_user_id: string | null;
  created_at: string;
  properties: Record<string, unknown>;
}

interface AnalyticsEventRow {
  id: string;
  event_type: string;
  room_id: string | null;
  anonymized_user_id: string;
  properties: Record<string, unknown>;
  created_at: string;
}

interface ModerationLogRow {
  id: string;
  admin_id: string | null;
  target_user: string | null;
  action: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UserRestrictionRow {
  id: string;
  user_id: string;
  reason: string;
  permanent?: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface ActiveRoomRow {

  id: string;
  user_a: string;
  user_b: string;
  started_at: string;
  voice_enabled: boolean;
  rtc_state: string | null;
  voice_unlocked_at: string | null;
}

type ModerationAction = "suspend_user" | "temporary_ban" | "permanent_ban" | "dismiss_report" | "mark_reviewed";

const cleanupStorageKey = "echoo-admin-log-cleanup";

const AdminPage = () => {
  const { authenticated, adminMetrics, isAdmin, profile, copy, language } = usePresence();
  const [recentReports, setRecentReports] = useState<ReportRow[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorLogRow[]>([]);
  const [recentModeration, setRecentModeration] = useState<ModerationLogRow[]>([]);
  const [recentSuspensions, setRecentSuspensions] = useState<UserRestrictionRow[]>([]);
  const [recentBans, setRecentBans] = useState<UserRestrictionRow[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomRow[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState<{ analyticsDeleted: number; errorsDeleted: number; moderationDeleted: number } | null>(null);

  const loadAdminData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingData(true);
    }
    try {

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [reportsResult, errorsResult, moderationResult, roomsResult, analyticsResult, suspensionsResult, bansResult] = await Promise.all([
        supabase
          .from("reports")
          .select("id, room_id, reporter_id, reported_user, reason, status, reviewed_at, moderation_action, moderation_reason, created_at")
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(250),
        supabase
          .from("error_logs")
          .select("id, event_type, severity, error_message, error_code, room_id, anonymized_user_id, created_at, properties")
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("moderation_logs")
          .select("id, admin_id, target_user, action, reason, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("rooms")
          .select("id, user_a, user_b, started_at, voice_enabled, rtc_state, voice_unlocked_at")
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(5),
        supabase
          .from("analytics_events")
          .select("id, event_type, room_id, anonymized_user_id, properties, created_at")
          .gte("created_at", twentyFourHoursAgo)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("user_suspensions")
          .select("id, user_id, reason, expires_at, created_by, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("user_bans")
          .select("id, user_id, reason, permanent, expires_at, created_by, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (reportsResult.error) throw reportsResult.error;
      if (errorsResult.error) throw errorsResult.error;
      if (moderationResult.error) throw moderationResult.error;
      if (roomsResult.error) throw roomsResult.error;
      if (analyticsResult.error) throw analyticsResult.error;
      if (suspensionsResult.error) throw suspensionsResult.error;
      if (bansResult.error) throw bansResult.error;

      setRecentReports((reportsResult.data ?? []) as ReportRow[]);
      setRecentErrors((errorsResult.data ?? []) as ErrorLogRow[]);
      setRecentModeration((moderationResult.data ?? []) as ModerationLogRow[]);
      setActiveRooms((roomsResult.data ?? []) as ActiveRoomRow[]);
      setAnalyticsEvents((analyticsResult.data ?? []) as AnalyticsEventRow[]);
      setRecentSuspensions((suspensionsResult.data ?? []) as UserRestrictionRow[]);
      setRecentBans((bansResult.data ?? []) as UserRestrictionRow[]);
    } finally {
      if (!silent) {
        setLoadingData(false);
      }
    }
  }, []);

  const applyActionLocally = useCallback((reportId: string, next: Partial<ReportRow>) => {
    setRecentReports((current) => current.map((report) => (report.id === reportId ? { ...report, ...next } : report)));
  }, []);

  const moderateReport = useCallback(
    async (report: ReportRow, action: ModerationAction) => {
      setActiveAction(report.id + action);
      try {
        const { data, error } = await supabase.rpc("admin_moderate_report", {
          p_report_id: report.id,
          p_action: action,
          p_reason: report.reason,
          p_duration_days: action === "suspend_user" ? 7 : action === "temporary_ban" ? 30 : null,
        });

        if (error) {
          throw error;
        }

        const result = Array.isArray(data) ? data[0] : data;
        const nextStatus = result?.status ?? (action === "dismiss_report" ? "dismissed" : "reviewed");
        applyActionLocally(report.id, {
          status: nextStatus,
          reviewed_at: new Date().toISOString(),
          moderation_action: action,
          moderation_reason: report.reason,
        });
        toast.success(language === "en" ? "Moderation updated." : "Η moderation ενημερώθηκε.");
        void loadAdminData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : language === "en" ? "Moderation action failed." : "Η ενέργεια moderation απέτυχε.");
      } finally {
        setActiveAction(null);
      }
    },
    [applyActionLocally, language, loadAdminData],
  );

  const runCleanup = useCallback(async () => {
    try {
      const result = await cleanupOperationalLogs();
      setCleanupStatus(result);
      toast.success(language === "en" ? "Operational logs cleaned up." : "Τα operational logs καθαρίστηκαν.");
    } catch {
      toast.error(language === "en" ? "Cleanup failed." : "Ο καθαρισμός απέτυχε.");
    }
  }, [language]);

  const adminRefreshTimeoutRef = useRef<number | null>(null);

  const scheduleAdminRefresh = useCallback(() => {
    if (adminRefreshTimeoutRef.current !== null) {
      window.clearTimeout(adminRefreshTimeoutRef.current);
    }

    adminRefreshTimeoutRef.current = window.setTimeout(() => {
      void loadAdminData(true);
    }, 400);
  }, [loadAdminData]);

  useEffect(() => {
    if (isAdmin) {
      void loadAdminData();
    }
  }, [isAdmin, loadAdminData]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const channel = supabase
      .channel(`admin-dashboard-${profile?.id ?? "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, scheduleAdminRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "moderation_logs" }, scheduleAdminRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_suspensions" }, scheduleAdminRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_bans" }, scheduleAdminRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, scheduleAdminRefresh)
      .subscribe();

    return () => {
      if (adminRefreshTimeoutRef.current !== null) {
        window.clearTimeout(adminRefreshTimeoutRef.current);
        adminRefreshTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, profile?.id, scheduleAdminRefresh]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    if (window.localStorage.getItem(cleanupStorageKey) === todayKey) {
      return;
    }

    window.localStorage.setItem(cleanupStorageKey, todayKey);
    void runCleanup();
  }, [isAdmin, runCleanup]);

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow={language === "en" ? "Private dashboard" : "Ιδιωτικό dashboard"}
            title="Echoo admin"
            body={language === "en" ? "The admin room is still settling." : "Το admin room ακόμα σταθεροποιείται."}
            status={copy.misc.loadingProfile}
            tone="sky"
          />
        </div>
      </PageShell>
    );
  }

  const analyticsByType = analyticsEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
    return acc;
  }, {});

  const reportCountsByUser = useMemo(() => {
    return recentReports.reduce<Record<string, number>>((acc, report) => {
      acc[report.reported_user] = (acc[report.reported_user] ?? 0) + 1;
      return acc;
    }, {});
  }, [recentReports]);

  const topReportedUsers = useMemo(() => {
    return Object.entries(reportCountsByUser)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId))
      .slice(0, 5);
  }, [reportCountsByUser]);

  const usersAtThreshold = topReportedUsers.filter((item) => item.count >= 5).length;
  const failedUploadsCount = analyticsByType.upload_failed ?? 0;
  const reconnectSuccessCount = analyticsByType.reconnect_success ?? 0;
  const reconnectFailureCount = analyticsByType.reconnect_failed ?? 0;
  const reconnectFailureRate = reconnectSuccessCount + reconnectFailureCount > 0 ? Math.round((reconnectFailureCount / (reconnectSuccessCount + reconnectFailureCount)) * 100) : 0;
  const moderationActivityCount = recentModeration.length;
  const activeRoomRows = activeRooms;

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-4 p-6 sm:p-8">
        <SectionTitle
          eyebrow={language === "en" ? "Private dashboard" : "Ιδιωτικό dashboard"}
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
              onClick={() => void loadAdminData()}
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

          <div className="grid gap-4 lg:grid-cols-3">
            <Surface className="p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Failed uploads" : "Αποτυχημένα uploads"}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{failedUploadsCount}</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {language === "en" ? "Uploads that did not complete in the last 24 hours." : "Uploads που δεν ολοκληρώθηκαν τις τελευταίες 24 ώρες."}
              </p>
            </Surface>
            <Surface className="p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Reconnect failure rate" : "Ποσοστό αποτυχημένων reconnect"}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{reconnectFailureRate}%</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {language === "en" ? "Based on reconnect success and failure events from the last 24 hours." : "Βασισμένο σε reconnect success/failure events των τελευταίων 24 ωρών."}
              </p>
            </Surface>
            <Surface className="p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Moderation activity" : "Δραστηριότητα moderation"}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{moderationActivityCount}</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {language === "en" ? "Recent moderation actions recorded in the audit log." : "Πρόσφατες ενέργειες moderation στο audit log."}
              </p>
            </Surface>
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
              <p className="mb-4 text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Signups" : "Εγγραφές"}</p>
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

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Surface className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Recent errors" : "Πρόσφατα errors"}</p>
                  <p className="mt-1 text-sm text-white/55">{language === "en" ? "The latest operational failures recorded by the app." : "Τα τελευταία operational failures της εφαρμογής."}</p>
                </div>
                <Badge className="rounded-full border border-rose-300/15 bg-rose-500/10 px-3 py-1 text-rose-50 hover:bg-rose-500/10">
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                  {recentErrors.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {loadingData ? (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "Reading error logs..." : "Διαβάζουμε τα error logs..."}</div>
                ) : recentErrors.length ? (
                  recentErrors.map((errorRow) => (
                    <div key={errorRow.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/40">
                        <span>{errorRow.event_type}</span>
                        <span>{new Date(errorRow.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-white">{errorRow.error_message}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{errorRow.severity}</span>
                        {errorRow.error_code && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{errorRow.error_code}</span>}
                        {errorRow.room_id && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">room {errorRow.room_id.slice(0, 8)}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "No recent errors." : "Δεν υπάρχουν πρόσφατα errors."}</div>
                )}
              </div>
            </Surface>

            <Surface className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Moderation overview" : "Επισκόπηση moderation"}</p>
                  <p className="mt-1 text-sm text-white/55">{language === "en" ? "Report counters, thresholds, and recent action history." : "Μετρητές αναφορών, thresholds και πρόσφατο history ενεργειών."}</p>
                </div>
                <Badge className="rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1 text-violet-50 hover:bg-violet-500/10">
                  <Shield className="mr-1 h-3.5 w-3.5" />
                  {recentModeration.length}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Threshold" : "Όριο"}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">5</p>
                  <p className="mt-1 text-sm text-white/60">{language === "en" ? "reports in 7 days" : "αναφορές σε 7 ημέρες"}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "At threshold" : "Στο όριο"}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{usersAtThreshold}</p>
                  <p className="mt-1 text-sm text-white/60">{language === "en" ? "users currently at or above 5 reports" : "χρήστες με 5+ αναφορές"}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{language === "en" ? "Top reported users" : "Χρήστες με τις περισσότερες αναφορές"}</p>
                  <Badge className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-white/65 hover:bg-black/20">
                    {language === "en" ? "7-day window" : "παράθυρο 7 ημερών"}
                  </Badge>
                </div>
                {loadingData ? (
                  <div className="space-y-2">
                    <div className="h-3.5 w-full animate-pulse rounded-full bg-white/8" />
                    <div className="h-3.5 w-5/6 animate-pulse rounded-full bg-white/8" />
                    <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-white/8" />
                  </div>
                ) : topReportedUsers.length ? (
                  topReportedUsers.map((entry) => (
                    <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-sm">
                      <span className="truncate text-white/75">{entry.userId.slice(0, 8)}</span>
                      <Badge className={cn("rounded-full border px-2.5 py-1 text-[10px] font-medium", entry.count >= 5 ? "border-rose-300/15 bg-rose-500/10 text-rose-50" : "border-white/10 bg-white/5 text-white/65")}>{entry.count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-white/10 bg-black/20 p-3 text-sm text-white/55">{language === "en" ? "No reported users in this window." : "Δεν υπάρχουν αναφερόμενοι χρήστες σε αυτό το παράθυρο."}</div>
                )}
              </div>

              <div className="space-y-3 rounded-[20px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">{language === "en" ? "Threshold behavior" : "Συμπεριφορά thresholds"}</p>
                <div className="space-y-2 text-sm leading-6 text-white/60">
                  <p>{language === "en" ? "• 5 reports → 7 day suspension" : "• 5 αναφορές → 7ήμερη αναστολή"}</p>
                  <p>{language === "en" ? "• Repeated abuse escalates to temporary or permanent bans" : "• Η επαναλαμβανόμενη κατάχρηση κλιμακώνεται σε προσωρινά ή μόνιμα bans"}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-3 rounded-[20px] border border-sky-300/15 bg-sky-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{language === "en" ? "Recent suspensions" : "Πρόσφατες αναστολές"}</p>
                    <Badge className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-white/65 hover:bg-black/20">{recentSuspensions.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {recentSuspensions.length ? recentSuspensions.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-sm">
                        <span className="truncate text-white/75">{item.user_id.slice(0, 8)}</span>
                        <span className="text-xs text-white/55">{item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "—"}</span>
                      </div>
                    )) : <div className="rounded-[16px] border border-white/10 bg-black/20 p-3 text-sm text-white/55">{language === "en" ? "No active suspensions." : "Δεν υπάρχουν ενεργές αναστολές."}</div>}
                  </div>
                </div>
                <div className="space-y-3 rounded-[20px] border border-rose-300/15 bg-rose-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{language === "en" ? "Recent bans" : "Πρόσφατα bans"}</p>
                    <Badge className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-white/65 hover:bg-black/20">{recentBans.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {recentBans.length ? recentBans.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-sm">
                        <span className="truncate text-white/75">{item.user_id.slice(0, 8)}</span>
                        <span className="text-xs text-white/55">{item.permanent ? (language === "en" ? "permanent" : "μόνιμο") : item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "—"}</span>
                      </div>
                    )) : <div className="rounded-[16px] border border-white/10 bg-black/20 p-3 text-sm text-white/55">{language === "en" ? "No recent bans." : "Δεν υπάρχουν πρόσφατα bans."}</div>}
                  </div>
                </div>
              </div>

              <div className="space-y-3">

                {loadingData ? (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "Reading moderation logs..." : "Διαβάζουμε τα moderation logs..."}</div>
                ) : recentModeration.length ? (
                  recentModeration.map((item) => (
                    <div key={item.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/40">
                        <span>{item.action}</span>
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/75">{item.reason ?? (language === "en" ? "No reason provided." : "Δεν δόθηκε λόγος.")}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
                        {item.target_user && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">target {item.target_user.slice(0, 8)}</span>}
                        {item.admin_id && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">admin {item.admin_id.slice(0, 8)}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "No moderation activity yet." : "Δεν υπάρχει ακόμη moderation δραστηριότητα."}</div>
                )}
              </div>
            </Surface>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <Surface className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Recent reports" : "Πρόσφατες αναφορές"}</p>
                  <p className="mt-1 text-sm text-white/55">{language === "en" ? "The latest moderation signals from live rooms." : "Τα πιο πρόσφατα σήματα moderation από live rooms."}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => void loadAdminData()}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {language === "en" ? "Reload" : "Επαναφόρτωση"}
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {loadingData ? (
                  <div className="space-y-3 rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-violet-200/80" />
                      {language === "en" ? "Reading the latest signals" : "Διαβάζουμε τα τελευταία σήματα"}
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/8" />
                      <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/8" />
                      <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/8" />
                    </div>
                  </div>
                ) : recentReports.length ? (
                  recentReports.map((report) => {
                    const statusTone =
                      report.status === "dismissed"
                        ? "border-white/10 bg-white/5 text-white/55"
                        : report.moderation_action
                          ? "border-emerald-300/15 bg-emerald-500/10 text-emerald-50"
                          : "border-amber-300/15 bg-amber-500/10 text-amber-50";
                    const isActionBusy = activeAction?.startsWith(report.id) ?? false;

                    return (
                      <div key={report.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/45">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{language === "en" ? "Room" : "Room"} {report.room_id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>{new Date(report.created_at).toLocaleString()}</span>
                          </div>
                          <Badge className={`rounded-full border px-3 py-1 text-[10px] font-medium ${statusTone}`}>{report.status}</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/75">{report.reason}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
                          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "Reporter" : "Αναφέρων"} {report.reporter_id.slice(0, 8)}</span>
                          <span className={cn("rounded-full border px-3 py-1", (reportCountsByUser[report.reported_user] ?? 0) >= 5 ? "border-rose-300/15 bg-rose-500/10 text-rose-50" : "border-white/10 bg-black/20")}>{language === "en" ? "Reported" : "Αναφερόμενος"} {report.reported_user.slice(0, 8)} · {reportCountsByUser[report.reported_user] ?? 0}</span>
                          {report.moderation_action && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "Action" : "Ενέργεια"} {report.moderation_action}</span>}
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          <Button type="button" variant="outline" className="h-10 rounded-full border-emerald-300/15 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15 hover:text-white" disabled={isActionBusy} onClick={() => void moderateReport(report, "mark_reviewed")}>
                            <Shield className="mr-2 h-4 w-4" />
                            {language === "en" ? "Reviewed" : "Ελεγμένο"}
                          </Button>
                          <Button type="button" variant="outline" className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" disabled={isActionBusy} onClick={() => void moderateReport(report, "dismiss_report")}>
                            {language === "en" ? "Dismiss" : "Απόρριψη"}
                          </Button>
                          <Button type="button" variant="outline" className="h-10 rounded-full border-sky-300/15 bg-sky-500/10 text-sky-50 hover:bg-sky-500/15 hover:text-white" disabled={isActionBusy} onClick={() => void moderateReport(report, "suspend_user")}>
                            <UserMinus className="mr-2 h-4 w-4" />
                            {language === "en" ? "Suspend 7d" : "Αναστολή 7η"}
                          </Button>
                          <Button type="button" variant="outline" className="h-10 rounded-full border-amber-300/15 bg-amber-500/10 text-amber-50 hover:bg-amber-500/15 hover:text-white" disabled={isActionBusy} onClick={() => void moderateReport(report, "temporary_ban")}>
                            {language === "en" ? "Temp ban 30d" : "Προσωρινό ban 30η"}
                          </Button>
                          <Button type="button" variant="outline" className="h-10 rounded-full border-rose-300/15 bg-rose-500/10 text-rose-50 hover:bg-rose-500/15 hover:text-white" disabled={isActionBusy} onClick={() => void moderateReport(report, "permanent_ban")}>
                            {language === "en" ? "Permanent ban" : "Μόνιμο ban"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "No recent reports yet." : "Δεν υπάρχουν ακόμα πρόσφατες αναφορές."}</div>
                )}
              </div>
            </Surface>

            <Surface className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Active rooms" : "Ενεργά rooms"}</p>
                  <p className="mt-1 text-sm text-white/55">{language === "en" ? "Rooms that are currently live and visible to admins." : "Rooms που είναι τώρα live και ορατά στους admins."}</p>
                </div>
                <Badge className="rounded-full border border-cyan-300/15 bg-cyan-500/10 px-3 py-1 text-cyan-50 hover:bg-cyan-500/10">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  {activeRoomRows.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {loadingData ? (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "Reading active rooms..." : "Διαβάζουμε τα ενεργά rooms..."}</div>
                ) : activeRoomRows.length ? (
                  activeRoomRows.map((room) => (
                    <div key={room.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/40">
                        <span>room {room.id.slice(0, 8)}</span>
                        <span>{new Date(room.started_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/75">
                        {room.user_a.slice(0, 8)} · {room.user_b.slice(0, 8)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{room.rtc_state ?? "idle"}</span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{room.voice_enabled ? (language === "en" ? "voice on" : "φωνή on") : (language === "en" ? "voice off" : "φωνή off")}</span>
                        {room.voice_unlocked_at && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "voice unlocked" : "φωνή ξεκλείδωσε"}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "No active rooms right now." : "Δεν υπάρχουν ενεργά rooms αυτή τη στιγμή."}</div>
                )}
              </div>
            </Surface>
          </div>

          <Surface className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Retention & cleanup" : "Διατήρηση & cleanup"}</p>
                <p className="mt-1 text-sm text-white/55">
                  {language === "en"
                    ? "Analytics: 30 days. Errors: 90 days. Moderation logs: 180 days."
                    : "Analytics: 30 ημέρες. Errors: 90 ημέρες. Moderation logs: 180 ημέρες."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => void runCleanup()}
              >
                <WifiOff className="mr-2 h-4 w-4" />
                {language === "en" ? "Run cleanup now" : "Εκτέλεση cleanup τώρα"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-white/65">{language === "en" ? "No message contents are stored in analytics or error logs." : "Δεν αποθηκεύονται message contents σε analytics ή error logs."}</div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-white/65">{language === "en" ? "Audio files are never logged, only upload status." : "Τα audio files δεν καταγράφονται, μόνο η κατάσταση upload."}</div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-white/65">{language === "en" ? `Cleanup result: ${cleanupStatus ? `${cleanupStatus.analyticsDeleted}/${cleanupStatus.errorsDeleted}/${cleanupStatus.moderationDeleted}` : "not run yet"}` : `Αποτέλεσμα cleanup: ${cleanupStatus ? `${cleanupStatus.analyticsDeleted}/${cleanupStatus.errorsDeleted}/${cleanupStatus.moderationDeleted}` : "δεν έχει τρέξει ακόμη"}`}</div>
            </div>
          </Surface>
        </>
      ) : (
        <Surface className="space-y-3 p-6 text-white/75">
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Access restricted" : "Περιορισμένη πρόσβαση"}</p>
          <h2 className="text-2xl font-semibold text-white">{language === "en" ? "You do not have admin access yet." : "Δεν έχεις ακόμη πρόσβαση διαχείρισης."}</h2>
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
