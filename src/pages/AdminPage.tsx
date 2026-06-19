import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Clock3,
  Heart,
  Home,
  MessagesSquare,
  RefreshCcw,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  WifiOff,
} from "lucide-react";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Link, Navigate, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { CalmStateCard } from "@/components/presence/calm-state-card";
import { usePresence } from "@/components/presence/presence-provider";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  closed_at: string | null;
  room_status: string;
  last_activity_at: string;
  voice_enabled: boolean;
  rtc_state: string | null;
  voice_unlocked_at: string | null;
}

interface SupporterRow {
  id: string;
  username: string;
  email: string | null;
  supporter_badge: boolean;
  updated_at: string;
}

interface RoomFeedbackRow {
  id: string;
  created_at: string;
  room_id: string;
  rating: "good" | "neutral" | "bad";
  message: string | null;
  include_debug: boolean;
  browser: string | null;
  device: string | null;
  user_type: string;
  screenshot_url: string | null;
  room_started_at: string | null;
  room_ended_at: string | null;
  room_voice_enabled: boolean | null;
  room_rtc_state: string | null;
  room_voice_unlocked_at: string | null;
}

type ModerationAction = "suspend_user" | "temporary_ban" | "permanent_ban" | "dismiss_report" | "mark_reviewed";

const cleanupStorageKey = "echoo-admin-log-cleanup";
const paginationPageSizes = [25, 50, 100] as const;

function parsePaginationValue(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function formatMetricValue(value: number | null) {
  return value === null ? "Unavailable" : String(value);
}

function formatLiveMetricValue(value: number | null, live: boolean) {
  return live ? formatMetricValue(value) : "No live data available";
}

function formatTimestampLabel(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function PaginationControls({

  page,
  pageCount,
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-white/55">
      <Button type="button" variant="outline" className="h-9 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white" onClick={onPrevious} disabled={page <= 1}>
        ← {" "}
        {"Previous"}
      </Button>
      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Page {page} of {pageCount}</span>
      <Button type="button" variant="outline" className="h-9 rounded-full border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white" onClick={onNext} disabled={page >= pageCount}>
        {"Next"} →
      </Button>
    </div>
  );
}

const AdminPage = () => {

  const { authenticated, realAdminMetrics, isAdmin, profile, copy, language, updateProfile, guestMode, presenceChannelState, presenceHeartbeatUpdatedAt } = usePresence();

  const [recentReports, setRecentReports] = useState<ReportRow[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorLogRow[]>([]);
  const [recentModeration, setRecentModeration] = useState<ModerationLogRow[]>([]);
  const [recentSuspensions, setRecentSuspensions] = useState<UserRestrictionRow[]>([]);
  const [recentBans, setRecentBans] = useState<UserRestrictionRow[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRow[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState<{ analyticsDeleted: number; errorsDeleted: number; moderationDeleted: number } | null>(null);
  const [analyticsLiveData, setAnalyticsLiveData] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const supporterPage = parsePaginationValue(searchParams.get("usersPage"), 1);
  const supporterPageSize = parsePaginationValue(searchParams.get("usersPageSize"), 25);
  const supporterSearch = searchParams.get("usersSearch") ?? "";
  const roomsPage = parsePaginationValue(searchParams.get("roomsPage"), 1);
  const roomsPageSize = parsePaginationValue(searchParams.get("roomsPageSize"), 25);
  const roomsSearch = searchParams.get("roomsSearch") ?? "";
  const feedbackPage = parsePaginationValue(searchParams.get("feedbackPage"), 1);
  const feedbackPageSize = parsePaginationValue(searchParams.get("feedbackPageSize"), 25);
  const feedbackSearch = searchParams.get("feedbackSearch") ?? "";

  const updatePaginationParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === undefined || value === "") {
            next.delete(key);
            return;
          }

          next.set(key, String(value));
        });
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const [supporterResults, setSupporterResults] = useState<SupporterRow[]>([]);
  const [supporterTotalCount, setSupporterTotalCount] = useState(0);
  const [supporterLoading, setSupporterLoading] = useState(false);
  const [supporterBusyId, setSupporterBusyId] = useState<string | null>(null);
  const [supporterSearchError, setSupporterSearchError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomRow[]>([]);
  const [activeRoomsTotalCount, setActiveRoomsTotalCount] = useState(0);
  const [activeRoomsLoading, setActiveRoomsLoading] = useState(false);
  const [roomFeedback, setRoomFeedback] = useState<RoomFeedbackRow[]>([]);
  const [roomFeedbackTotalCount, setRoomFeedbackTotalCount] = useState(0);
  const [roomFeedbackLoading, setRoomFeedbackLoading] = useState(false);
  const [roomFeedbackFilter, setRoomFeedbackFilter] = useState<"all" | "good" | "neutral" | "bad">("all");
  const [selectedRoomFeedback, setSelectedRoomFeedback] = useState<RoomFeedbackRow | null>(null);
  const [feedbackDetailOpen, setFeedbackDetailOpen] = useState(false);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [newTodayCount, setNewTodayCount] = useState(0);
  const [registeredSevenDayCount, setRegisteredSevenDayCount] = useState(0);
  const [guestSevenDayCount, setGuestSevenDayCount] = useState(0);

  const [roomStats, setRoomStats] = useState<{
  total_rooms: number;
  rooms_today: number;
  rooms_7d: number;
  voice_adoption_pct: number;
  avg_duration_minutes: number;
  unique_users_in_rooms: number;
  match_success_rate: number;
} | null>(null);

  const isMountedRef = useRef(true);

  const isGuestAccount = guestMode || profile?.profileMode === "guest";

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAdminData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingData(true);
    }

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [reportsResult, errorsResult, moderationResult, analyticsResult, suspensionsResult, bansResult, totalUsersResult, newTodayResult, sevenDayProfilesResult, roomStatsResult] = await Promise.all([
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
          .limit(50),
        supabase
          .from("moderation_logs")
          .select("id, admin_id, target_user, action, reason, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("analytics_events")
          .select("id, event_type, room_id, anonymized_user_id, properties, created_at")
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
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
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.rpc("get_admin_room_stats"),
        supabase.from("profiles").select("id, profile_mode, created_at").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      if (reportsResult.error) throw reportsResult.error;
      if (errorsResult.error) throw errorsResult.error;
      if (moderationResult.error) throw moderationResult.error;
      if (suspensionsResult.error) throw suspensionsResult.error;
      if (bansResult.error) throw bansResult.error;
      if (totalUsersResult.error) throw totalUsersResult.error;
      if (newTodayResult.error) throw newTodayResult.error;
      if (sevenDayProfilesResult.error) throw sevenDayProfilesResult.error;

      if (!isMountedRef.current) {
        return;
      }

      setRecentReports((reportsResult.data ?? []) as ReportRow[]);
      setRecentErrors((errorsResult.data ?? []) as ErrorLogRow[]);
      setRecentModeration((moderationResult.data ?? []) as ModerationLogRow[]);
      setAnalyticsLiveData(!analyticsResult.error);
      if (analyticsResult.error) console.warn("[admin] Analytics query failed:", analyticsResult.error.message);
      setAnalyticsEvents(analyticsResult.error ? [] : ((analyticsResult.data ?? []) as AnalyticsEventRow[]));
      setRecentSuspensions((suspensionsResult.data ?? []) as UserRestrictionRow[]);

      setRecentBans((bansResult.data ?? []) as UserRestrictionRow[]);
      setTotalUsersCount(totalUsersResult.count ?? 0);
      setNewTodayCount(newTodayResult.count ?? 0);
      const sevenDayProfiles = (sevenDayProfilesResult.data ?? []) as Array<{ profile_mode: string | null }>;
      setRegisteredSevenDayCount(sevenDayProfiles.filter((profile) => profile.profile_mode === "registered").length);
      setGuestSevenDayCount(sevenDayProfiles.filter((profile) => profile.profile_mode !== "registered").length);
      console.log("roomStats raw:", roomStatsResult);
      if (roomStatsResult.data?.[0]) {
        setRoomStats(roomStatsResult.data[0]);
       }
    } catch (error) {

      if (!isMountedRef.current) {
        return;
      }

      setAnalyticsLiveData(false);
      toast.error(error instanceof Error ? error.message : language === "en" ? "Admin data failed to load." : "Τα admin δεδομένα δεν φορτώθηκαν.");
    } finally {
      if (!silent) {
        setLoadingData(false);
      }
    }
  }, [language]);

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
        if (isMountedRef.current) {
          setActiveAction(null);
        }
      }

    },
    [applyActionLocally, language, loadAdminData],
  );

  const runCleanup = useCallback(async () => {
    try {
      const result = await cleanupOperationalLogs();
      if (!isMountedRef.current) {
        return;
      }
      setCleanupStatus(result);
      toast.success(language === "en" ? "Operational logs cleaned up." : "Τα operational logs καθαρίστηκαν.");
    } catch {
      toast.error(language === "en" ? "Cleanup failed." : "Ο καθαρισμός απέτυχε.");
    }
  }, [language]);

  const loadSupporters = useCallback(async () => {
    setSupporterLoading(true);
    setSupporterSearchError(null);

    try {
      const { data, error } = await supabase.rpc("admin_list_profiles", {
        p_query: supporterSearch.trim(),
        p_limit: supporterPageSize,
        p_offset: (supporterPage - 1) * supporterPageSize,
      });

      if (error) {
        throw error;
      }

      const rows = (Array.isArray(data) ? data : []) as Array<SupporterRow & { total_count: number }>;
      if (!isMountedRef.current) {
        return;
      }

      setSupporterResults(rows.map(({ total_count, ...row }) => row));
      setSupporterTotalCount(rows[0]?.total_count ?? 0);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : language === "en" ? "Supporter search failed." : "Η αναζήτηση χρήστη απέτυχε.";
      setSupporterSearchError(message);
      toast.error(message);
    } finally {
      if (isMountedRef.current) {
        setSupporterLoading(false);
      }
    }
  }, [language, supporterPage, supporterPageSize, supporterSearch]);

  const loadActiveRooms = useCallback(async () => {
    setActiveRoomsLoading(true);

    try {
      await supabase.rpc("admin_cleanup_stale_rooms").catch(() => undefined);
      const { data, error } = await supabase.rpc("admin_list_active_rooms", {
        p_query: roomsSearch.trim(),
        p_limit: roomsPageSize,
        p_offset: (roomsPage - 1) * roomsPageSize,
      });

      if (error) {
        throw error;
      }

      const rows = (Array.isArray(data) ? data : []) as Array<ActiveRoomRow & { total_count: number }>;
      if (!isMountedRef.current) {
        return;
      }

      setActiveRooms(rows.map(({ total_count, ...row }) => row));
      setActiveRoomsTotalCount(rows[0]?.total_count ?? 0);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      toast.error(error instanceof Error ? error.message : language === "en" ? "Room search failed." : "Η αναζήτηση room απέτυχε.");
    } finally {
      if (isMountedRef.current) {
        setActiveRoomsLoading(false);
      }
    }
  }, [language, roomsPage, roomsPageSize, roomsSearch]);

  const loadRoomFeedback = useCallback(async () => {
    setRoomFeedbackLoading(true);

    try {
      const { data, error } = await supabase.rpc("admin_list_room_feedback", {
        p_query: feedbackSearch.trim(),
        p_rating: roomFeedbackFilter,
        p_limit: feedbackPageSize,
        p_offset: (feedbackPage - 1) * feedbackPageSize,
      });

      if (error) {
        throw error;
      }

      const rows = (Array.isArray(data) ? data : []) as Array<RoomFeedbackRow & { total_count: number }>;
      const feedbackRows = rows.map(({ total_count, ...row }) => row);

      if (!isMountedRef.current) {
        return;
      }

      setRoomFeedback(feedbackRows);
      setRoomFeedbackTotalCount(rows[0]?.total_count ?? 0);

    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      toast.error(error instanceof Error ? error.message : language === "en" ? "Feedback search failed." : "Η αναζήτηση feedback απέτυχε.");
    } finally {
      if (isMountedRef.current) {
        setRoomFeedbackLoading(false);
      }
    }
  }, [feedbackPage, feedbackPageSize, feedbackSearch, language, roomFeedbackFilter]);

  const toggleSupporterBadge = useCallback(

    async (userId: string, nextValue: boolean) => {
      setSupporterBusyId(userId);
      try {
        const { data, error } = await supabase.rpc("admin_set_supporter_badge", {
          p_user_id: userId,
          p_supporter_badge: nextValue,
        });

        if (error) {
          throw error;
        }

        const updatedProfile = Array.isArray(data) ? data[0] : data;
        const resolvedValue = Boolean(updatedProfile?.supporter_badge ?? nextValue);
        if (!isMountedRef.current) {
          return;
        }

        setSupporterResults((current) =>
          current.map((row) =>
            row.id === userId
              ? {
                  ...row,
                  supporter_badge: resolvedValue,
                  updated_at: updatedProfile?.updated_at ?? new Date().toISOString(),
                }
              : row,
          ),
        );
        if (profile?.id === userId) {
          updateProfile({ supporterBadge: resolvedValue });
        }
        toast.success(resolvedValue ? (language === "en" ? "Supporter badge enabled." : "Το supporter badge ενεργοποιήθηκε.") : (language === "en" ? "Supporter badge disabled." : "Το supporter badge απενεργοποιήθηκε."));

      } catch (error) {
        const message = error instanceof Error ? error.message : language === "en" ? "Badge update failed." : "Η ενημέρωση badge απέτυχε.";
        toast.error(message);
      } finally {
        if (isMountedRef.current) {
          setSupporterBusyId(null);
        }
      }
    },
    [language, profile?.id, updateProfile],
  );

  const adminRefreshTimeoutRef = useRef<number | null>(null);

  const refreshAdminLists = useCallback(() => {
    void loadAdminData();
    void loadSupporters();
    void loadActiveRooms();
    void loadRoomFeedback();
  }, [loadActiveRooms, loadAdminData, loadRoomFeedback, loadSupporters]);

  const scheduleAdminRefresh = useCallback(() => {
    if (adminRefreshTimeoutRef.current !== null) {
      window.clearTimeout(adminRefreshTimeoutRef.current);
    }

    adminRefreshTimeoutRef.current = window.setTimeout(() => {
      refreshAdminLists();
    }, 400);
  }, [refreshAdminLists]);

  useEffect(() => {
    if (isAdmin) {
      void loadAdminData();
    }
  }, [isAdmin, loadAdminData]);

  useEffect(() => {
    if (isAdmin) {
      void loadSupporters();
    }
  }, [isAdmin, loadSupporters]);

  useEffect(() => {
    if (isAdmin) {
      void loadActiveRooms();
    }
  }, [isAdmin, loadActiveRooms]);

  useEffect(() => {
    if (isAdmin) {
      void loadRoomFeedback();
    }
  }, [isAdmin, loadRoomFeedback]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    refreshAdminLists();
    const interval = window.setInterval(() => {
      refreshAdminLists();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [isAdmin, refreshAdminLists]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "room_feedback" }, scheduleAdminRefresh)
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

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const chartDataFromEvents = last7Days.map((dateStr) => {
    const dayEvents = analyticsEvents.filter((e) =>
      e.created_at.slice(0, 10) === dateStr
    );
    return {
      day: new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
      sessions: dayEvents.filter((e) => e.event_type === "room_created").length,
      reports: dayEvents.filter((e) => e.event_type === "report_submitted").length,
      signups: dayEvents.filter((e) => e.event_type === "user_joined_queue").length,
    };
  });

  const errorCountsByType = recentErrors.reduce<Record<string, number>>((acc, event) => {

    acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
    return acc;
  }, {});

  const reportCountsByUser = recentReports.reduce<Record<string, number>>((acc, report) => {

    acc[report.reported_user] = (acc[report.reported_user] ?? 0) + 1;
    return acc;
  }, {});

  const topReportedUsers = Object.entries(reportCountsByUser)
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId))
    .slice(0, 5);

  const usersAtThreshold = topReportedUsers.filter((item) => item.count >= 5).length;
  const failedUploadsCount = analyticsByType.upload_failed ?? 0;
  const reconnectSuccessCount = analyticsByType.reconnect_success ?? 0;
  const reconnectFailureCount = analyticsByType.reconnect_failed ?? 0;
  const reconnectFailureRate = reconnectSuccessCount + reconnectFailureCount > 0 ? Math.round((reconnectFailureCount / (reconnectSuccessCount + reconnectFailureCount)) * 100) : 0;
  const failedUploadsDisplay = formatLiveMetricValue(failedUploadsCount, analyticsLiveData);
  const reconnectFailureRateDisplay = analyticsLiveData ? `${reconnectFailureRate}%` : "No live data available";

  const moderationActivityCount = recentModeration.length;
  const supporterPageCount = Math.max(1, Math.ceil(supporterTotalCount / supporterPageSize));
  const roomsPageCount = Math.max(1, Math.ceil(activeRoomsTotalCount / roomsPageSize));
  const feedbackPageCount = Math.max(1, Math.ceil(roomFeedbackTotalCount / feedbackPageSize));
  const visibleFeedback = useMemo(
    () => roomFeedback.filter((item) => roomFeedbackFilter === "all" || item.rating === roomFeedbackFilter),
    [roomFeedback, roomFeedbackFilter],
  );
  const feedbackCounts = useMemo(

    () =>
      roomFeedback.reduce<Record<"good" | "neutral" | "bad", number>>(
        (acc, item) => {
          acc[item.rating] += 1;
          return acc;
        },
        { good: 0, neutral: 0, bad: 0 },
      ),
    [roomFeedback],
  );

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
          {isGuestAccount ? (
            <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 lg:ml-0 lg:w-full xl:max-w-[560px]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">{language === "en" ? "Account type" : "Τύπος λογαριασμού"}</p>
              <p className="mt-2 text-sm font-medium text-white">{language === "en" ? "Guest account" : "Guest λογαριασμός"}</p>
              <p className="mt-2 text-sm text-white/55">{language === "en" ? "Anonymous user" : "Ανώνυμος χρήστης"}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:ml-0 lg:w-full xl:max-w-[560px]">
              <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">{language === "en" ? "Signed-in email" : "Email σύνδεσης"}</p>
                <p className="mt-2 break-all text-sm font-medium text-white">{profile.email ?? (language === "en" ? "No email available" : "Δεν υπάρχει διαθέσιμο email")}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">{language === "en" ? "Profile ID" : "ID προφίλ"}</p>
                <p className="mt-2 break-all text-sm font-medium text-white">{profile.id}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => refreshAdminLists()}
            >

              <RefreshCcw className="mr-2 h-4 w-4" />
              {language === "en" ? "Refresh" : "Ανανέωση"}
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                {copy.nav.home}
              </Link>
            </Button>
          </div>

        </div>
      </Surface>

      {isAdmin && (
        <Surface className="space-y-5 border-rose-300/15 bg-[#0d1424]/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">Supporters</p>
              <p className="mt-1 text-sm text-white/55">
                {language === "en"
                  ? "Supporter status is granted manually after support is verified."
                  : "Η κατάσταση supporter αποδίδεται χειροκίνητα αφού επαληθευτεί η υποστήριξη."}
              </p>
            </div>
            <Badge className="rounded-full border border-rose-300/15 bg-rose-500/10 px-3 py-1 text-rose-50 hover:bg-rose-500/10">
              <Heart className="mr-1 h-3.5 w-3.5" />
              Echoo
            </Badge>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={supporterSearch}
                onChange={(event) => updatePaginationParams({ usersSearch: event.target.value, usersPage: 1 })}
                placeholder={language === "en" ? "Search by email or username" : "Αναζήτηση με email ή username"}
                className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-rose-300/20 focus:bg-white/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={String(supporterPageSize)}
                onValueChange={(value) => updatePaginationParams({ usersPageSize: Number(value), usersPage: 1 })}
              >
                <SelectTrigger className="h-11 w-24 rounded-full border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paginationPageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="h-11 rounded-full bg-violet-500 text-white hover:bg-violet-400"
                onClick={() => updatePaginationParams({ usersPage: 1, usersSearch: supporterSearch })}
              >
                {language === "en" ? "Search" : "Αναζήτηση"}
              </Button>
            </div>
          </div>

          {supporterSearchError && (
            <div className="rounded-[20px] border border-rose-300/15 bg-rose-500/10 p-4 text-sm text-rose-50">{supporterSearchError}</div>
          )}

          <div className="space-y-3">
            {supporterLoading ? (
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                {language === "en" ? "Loading supporters..." : "Φορτώνουμε τους supporters..."}
              </div>
            ) : supporterResults.length ? (
              supporterResults.map((row) => (
                <div key={row.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-base font-medium text-white">{row.username}</p>
                      <p className="break-all text-sm text-white/55">{row.email ?? (language === "en" ? "No email" : "Χωρίς email")}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                        {language === "en" ? "Current status" : "Τρέχουσα κατάσταση"}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <Badge className={cn("rounded-full border px-3 py-1 text-[11px] font-medium", row.supporter_badge ? "border-rose-300/20 bg-rose-500/10 text-rose-50" : "border-white/10 bg-white/5 text-white/60")}>
                        {row.supporter_badge ? "❤️ Supporter" : (language === "en" ? "No badge" : "Χωρίς badge")}
                      </Badge>
                      <p className="text-xs text-white/35">{new Date(row.updated_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full border-emerald-300/15 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15 hover:text-white"
                      disabled={supporterBusyId === row.id || row.supporter_badge}
                      onClick={() => void toggleSupporterBadge(row.id, true)}
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      {language === "en" ? "Enable supporter badge" : "Ενεργοποίηση supporter badge"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full border-rose-300/15 bg-rose-500/10 text-rose-50 hover:bg-rose-500/15 hover:text-white"
                      disabled={supporterBusyId === row.id || !row.supporter_badge}
                      onClick={() => void toggleSupporterBadge(row.id, false)}
                    >
                      {language === "en" ? "Disable supporter badge" : "Απενεργοποίηση supporter badge"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                {language === "en" ? "Search by email or username to find a supporter." : "Αναζήτησε με email ή username για να βρεις έναν supporter."}
              </div>
            )}

            <PaginationControls
              page={supporterPage}
              pageCount={supporterPageCount}
              onPrevious={() => updatePaginationParams({ usersPage: Math.max(1, supporterPage - 1) })}
              onNext={() => updatePaginationParams({ usersPage: Math.min(supporterPageCount, supporterPage + 1) })}
            />

          </div>
        </Surface>

      )}

      {isAdmin ? (

        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard icon={Users} label="Connected now" value={formatMetricValue(realAdminMetrics.connectedNow)} />
            <MetricCard icon={UserMinus} label="Guests online" value={formatMetricValue(realAdminMetrics.guestsOnline)} />
            
            <MetricCard icon={UserPlus} label="Registered online" value={formatMetricValue(realAdminMetrics.registeredOnline)} />
            <MetricCard icon={MessagesSquare} label="Active Rooms" value={formatMetricValue(realAdminMetrics.activeRooms)} />
            <MetricCard icon={Search} label="Searching" value={formatMetricValue(realAdminMetrics.usersSearching)} />
            <MetricCard icon={Activity} label="Active Voice Sessions" value={formatMetricValue(realAdminMetrics.activeVoiceSessions)} />
            <MetricCard icon={Users} label="Total Users" value={String(totalUsersCount)} />
            <MetricCard icon={UserPlus} label="New Today" value={String(newTodayCount)} />
            <MetricCard icon={Users} label="Registered (7d)" value={String(registeredSevenDayCount)} />
            <MetricCard icon={UserMinus} label="Guests (7d)" value={String(guestSevenDayCount)} />
            {roomStats && (
  <>
    <MetricCard icon={MessagesSquare} label="Total Rooms" value={String(roomStats.total_rooms)} />
    <MetricCard icon={MessagesSquare} label="Rooms Today" value={String(roomStats.rooms_today)} />
    <MetricCard icon={MessagesSquare} label="Rooms (7d)" value={String(roomStats.rooms_7d)} />
    <MetricCard icon={Users} label="Unique in Rooms" value={String(roomStats.unique_users_in_rooms)} />
    <MetricCard icon={Activity} label="Voice Adoption" value={`${roomStats.voice_adoption_pct}%`} />
    <MetricCard icon={Activity} label="Avg Duration" value={`${roomStats.avg_duration_minutes} min`} />
    <MetricCard icon={Activity} label="Match Rate" value={`${roomStats.match_success_rate}%`} />
  </>
)}
          </div>

          <p className="mt-2 text-right text-xs text-white/40">
            {language === "en" ? "Last updated" : "Τελευταία ενημέρωση"}: {formatTimestampLabel(realAdminMetrics.lastUpdatedAt)}
          </p>

          <details className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-white/75 outline-none">
              {language === "en" ? "Admin debug" : "Admin debug"}
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Realtime connected" : "Realtime connected"}</p>
                <p className="mt-2 text-lg font-semibold text-white">{presenceChannelState}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Presence heartbeat age" : "Presence heartbeat age"}</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {presenceHeartbeatUpdatedAt ? `${Math.max(0, Math.round((Date.now() - new Date(presenceHeartbeatUpdatedAt).getTime()) / 1000))}s` : "—"}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Rooms loaded" : "Rooms loaded"}</p>
                <p className="mt-2 text-lg font-semibold text-white">{activeRooms.length}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Metrics source state" : "Metrics source state"}</p>
                <p className="mt-2 text-lg font-semibold text-white">{realAdminMetrics.sourceState}</p>
              </div>
            </div>
          </details>

          <div className="grid gap-4 lg:grid-cols-3">

            <Surface className="p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Failed uploads" : "Αποτυχημένα uploads"}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{failedUploadsDisplay}</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {language === "en" ? "Uploads that did not complete in the last 24 hours." : "Uploads που δεν ολοκληρώθηκαν τις τελευταίες 24 ώρες."}
              </p>
            </Surface>
            <Surface className="p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Reconnect failure rate" : "Ποσοστό αποτυχημένων reconnect"}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{reconnectFailureRateDisplay}</p>
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
                <AreaChart data={chartDataFromEvents}>

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
                <BarChart data={chartDataFromEvents}>

                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="signups" fill="var(--color-signups)" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Surface>
          </div>

          <Surface className="space-y-5 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Room feedback" : "Room feedback"}</p>
                <p className="mt-1 text-sm text-white/55">
                  {language === "en"
                    ? "Latest room feedback with optional technical details and screenshots."
                    : "Τα πιο πρόσφατα feedback με προαιρετικά τεχνικά στοιχεία και screenshots."}
                </p>
              </div>
              <Badge className="rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1 text-violet-50 hover:bg-violet-500/10">
                {roomFeedbackTotalCount}
              </Badge>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={feedbackSearch}
                  onChange={(event) => updatePaginationParams({ feedbackSearch: event.target.value, feedbackPage: 1 })}
                  placeholder={language === "en" ? "Search feedback" : "Αναζήτηση feedback"}
                  className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/20 focus:bg-white/10"
                />
              </div>
              <Select
                value={String(feedbackPageSize)}
                onValueChange={(value) => updatePaginationParams({ feedbackPageSize: Number(value), feedbackPage: 1 })}
              >
                <SelectTrigger className="h-11 w-24 rounded-full border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paginationPageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: language === "en" ? "All" : "Όλα", count: roomFeedbackTotalCount },
                { key: "good", label: language === "en" ? "Good" : "Καλό", count: feedbackCounts.good },
                { key: "neutral", label: language === "en" ? "Okay" : "Οκ", count: feedbackCounts.neutral },
                { key: "bad", label: language === "en" ? "Bad" : "Κακό", count: feedbackCounts.bad },
              ].map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-9 rounded-full border-white/10 bg-white/5 px-4 text-xs text-white hover:bg-white/10 hover:text-white",
                    roomFeedbackFilter === option.key && "border-violet-300/20 bg-violet-500/15 text-violet-50",
                  )}
                  onClick={() => {
                    setRoomFeedbackFilter(option.key as typeof roomFeedbackFilter);
                    updatePaginationParams({ feedbackPage: 1 });
                  }}
                >
                  {option.label}
                  <span className="ml-2 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/55">{option.count}</span>
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {roomFeedbackLoading ? (
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "Reading room feedback..." : "Διαβάζουμε το room feedback..."}</div>
              ) : visibleFeedback.length ? (
                visibleFeedback.map((item) => {
                  return (
                    <div key={item.id} className="rounded-[22px] border border-white/10 bg-white/5 p-4">

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/40">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                          <span>•</span>
                          <span>{language === "en" ? "Room" : "Room"} {item.room_id.slice(0, 8)}</span>
                        </div>
                        <Badge className={cn("rounded-full border px-3 py-1 text-[10px] font-medium", item.rating === "good" ? "border-emerald-300/15 bg-emerald-500/10 text-emerald-50" : item.rating === "neutral" ? "border-amber-300/15 bg-amber-500/10 text-amber-50" : "border-rose-300/15 bg-rose-500/10 text-rose-50")}>{item.rating}</Badge>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-white/75">{item.message?.trim() || (language === "en" ? "No message provided." : "Δεν δόθηκε μήνυμα.")}</p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "User type" : "Τύπος χρήστη"} {item.user_type}</span>
                        {item.include_debug && <span className="rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1 text-violet-50">{language === "en" ? "Technical details included" : "Συμπεριλήφθηκαν τεχνικά στοιχεία"}</span>}
                        {item.screenshot_url && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "Screenshot attached" : "Υπάρχει screenshot"}</span>}
                        {item.include_debug && item.room_rtc_state && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">rtc {item.room_rtc_state}</span>}
                        {item.include_debug && item.room_voice_enabled && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "voice on" : "φωνή on"}</span>}

                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-white/45">
                          {item.browser || item.device
                            ? `${item.browser ?? (language === "en" ? "Browser hidden" : "Browser κρυφό")} · ${item.device ?? (language === "en" ? "Device hidden" : "Συσκευή κρυφή")}`
                            : language === "en"
                              ? "No technical details stored."
                              : "Δεν αποθηκεύτηκαν τεχνικά στοιχεία."}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                          onClick={() => {
                            setSelectedRoomFeedback(item);
                            setFeedbackDetailOpen(true);
                          }}
                        >
                          {language === "en" ? "Open details" : "Άνοιγμα λεπτομερειών"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "No room feedback yet." : "Δεν υπάρχει ακόμα room feedback."}</div>
              )}

              <PaginationControls
                page={feedbackPage}
                pageCount={feedbackPageCount}
                onPrevious={() => updatePaginationParams({ feedbackPage: Math.max(1, feedbackPage - 1) })}
                onNext={() => updatePaginationParams({ feedbackPage: Math.min(feedbackPageCount, feedbackPage + 1) })}
              />

            </div>
          </Surface>

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

              <div className="flex flex-wrap gap-2 text-xs text-white/55">
                {[
                  { key: "reconnect_failed", label: "Reconnect failures" },
                  { key: "restore_failed", label: "Restore failures" },
                  { key: "content_api_failure", label: "Content API failures" },
                  { key: "upload_failed", label: "Upload failures" },
                ].map((item) => (
                  <span key={item.key} className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                    {item.label} {errorCountsByType[item.key] ?? 0}
                  </span>
                ))}
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
                  {activeRoomsTotalCount}
                </Badge>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={roomsSearch}
                    onChange={(event) => updatePaginationParams({ roomsSearch: event.target.value, roomsPage: 1 })}
                    placeholder={language === "en" ? "Search by room or user ID" : "Αναζήτηση με room ή user ID"}
                    className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-300/20 focus:bg-white/10"
                  />
                </div>
                <Select
                  value={String(roomsPageSize)}
                  onValueChange={(value) => updatePaginationParams({ roomsPageSize: Number(value), roomsPage: 1 })}
                >
                  <SelectTrigger className="h-11 w-24 rounded-full border-white/10 bg-white/5 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paginationPageSizes.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {activeRoomsLoading ? (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">{language === "en" ? "Reading active rooms..." : "Διαβάζουμε τα ενεργά rooms..."}</div>
                ) : activeRooms.length ? (
                  activeRooms.map((room) => (
                    <div key={room.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/40">
                        <span>room {room.id.slice(0, 8)}</span>
                        <span>{room.room_status}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/75">
                        {room.user_a.slice(0, 8)} · {room.user_b.slice(0, 8)}
                      </p>
                      <div className="mt-2 text-xs text-white/45">
                        {language === "en" ? "Last activity" : "Τελευταία δραστηριότητα"}: {formatTimestampLabel(room.last_activity_at)}
                      </div>
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

                <PaginationControls
                  page={roomsPage}
                  pageCount={roomsPageCount}
                  onPrevious={() => updatePaginationParams({ roomsPage: Math.max(1, roomsPage - 1) })}
                  onNext={() => updatePaginationParams({ roomsPage: Math.min(roomsPageCount, roomsPage + 1) })}
                />

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

          <Dialog
            open={feedbackDetailOpen}
            onOpenChange={(open) => {
              setFeedbackDetailOpen(open);
              if (!open) {
                setSelectedRoomFeedback(null);
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#11192b] text-white sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{language === "en" ? "Room feedback details" : "Λεπτομέρειες room feedback"}</DialogTitle>
                <DialogDescription className="text-white/55">
                  {language === "en"
                    ? "A closer look at the latest feedback entry."
                    : "Μια πιο κοντινή ματιά στην πιο πρόσφατη εγγραφή feedback."}
                </DialogDescription>
              </DialogHeader>

              {selectedRoomFeedback && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("rounded-full border px-3 py-1 text-[10px] font-medium", selectedRoomFeedback.rating === "good" ? "border-emerald-300/15 bg-emerald-500/10 text-emerald-50" : selectedRoomFeedback.rating === "neutral" ? "border-amber-300/15 bg-amber-500/10 text-amber-50" : "border-rose-300/15 bg-rose-500/10 text-rose-50")}>{selectedRoomFeedback.rating}</Badge>
                    <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-white/70">room {selectedRoomFeedback.room_id.slice(0, 8)}</Badge>
                    <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-white/70">{selectedRoomFeedback.user_type}</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Submitted" : "Υποβλήθηκε"}</p>
                      <p className="mt-2 text-sm text-white/75">{new Date(selectedRoomFeedback.created_at).toLocaleString()}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Technical details" : "Τεχνικά στοιχεία"}</p>
                      <p className="mt-2 text-sm text-white/75">{selectedRoomFeedback.include_debug ? (language === "en" ? "Included" : "Συμπεριλήφθηκαν") : (language === "en" ? "Not included" : "Δεν συμπεριλήφθηκαν")}</p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Message" : "Μήνυμα"}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{selectedRoomFeedback.message?.trim() || (language === "en" ? "No message provided." : "Δεν δόθηκε μήνυμα.")}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/40">Browser</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">{selectedRoomFeedback.browser ?? (language === "en" ? "Hidden" : "Κρυφό")}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/40">Device</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">{selectedRoomFeedback.device ?? (language === "en" ? "Hidden" : "Κρυφή")}</p>
                    </div>
                  </div>

                  {selectedRoomFeedback.include_debug && (
                    <div className="rounded-[22px] border border-violet-300/15 bg-violet-500/10 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-violet-100/60">{language === "en" ? "Room state" : "Κατάσταση room"}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-violet-50">
                        {selectedRoomFeedback.room_started_at && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "started" : "έναρξη"} {new Date(selectedRoomFeedback.room_started_at).toLocaleString()}</span>}
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{selectedRoomFeedback.room_ended_at ? (language === "en" ? "ended" : "έληξε") : (language === "en" ? "active" : "ενεργό")}</span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{selectedRoomFeedback.room_rtc_state ?? "idle"}</span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{selectedRoomFeedback.room_voice_enabled ? (language === "en" ? "voice on" : "φωνή on") : (language === "en" ? "voice off" : "φωνή off")}</span>
                        {selectedRoomFeedback.room_voice_unlocked_at && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{language === "en" ? "voice unlocked" : "φωνή ξεκλείδωσε"}</span>}
                      </div>
                    </div>
                  )}

                  {selectedRoomFeedback.screenshot_url && (
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/40">{language === "en" ? "Screenshot" : "Screenshot"}</p>
                      <a href={selectedRoomFeedback.screenshot_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-[18px] border border-white/10">
                        <img src={selectedRoomFeedback.screenshot_url} alt={language === "en" ? "Submitted screenshot" : "Υποβληθέν screenshot"} className="max-h-[360px] w-full object-cover" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
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
