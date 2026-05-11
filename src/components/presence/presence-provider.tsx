import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getCopy, queueMessages, usernamePrefixes, usernameSuffixes } from "@/lib/presence-content";
import {
  endRoom,

  hasSupabaseConfig,
  joinQueue,
  leaveQueue,
  loadActiveRoomForUser,
  loadProfile,
  loadRoomById,
  loadRoomMessages,
  matchQueueUser,
  persistMessage,
  persistRating,
  persistReport,
  persistRoom,
  syncProfile,
  cleanupUserSession,
} from "@/lib/presence-backend";
import { createVoiceLoopback, type VoiceSessionController } from "@/lib/presence-rtc";
import type {
  AdminMetrics,
  AppLanguage,
  AuthMethod,
  ChatMessage,
  PresenceProfile,
  PresenceStoredState,
  QueueFilters,
  QueueState,
  RatingScore,
  RoomSession,
  VoiceState,
} from "@/lib/presence-types";

interface MatchTransitionState {
  roomId: string;
  secondsLeft: number;
}

interface RealtimePresenceEntry {
  userId: string;
  status: "online" | "searching" | "room";
  roomId: string | null;
  updatedAt: number;
  tabId: string;
}

interface RealtimePresenceStats {
  onlineCount: number;
  searchingCount: number;
  roomCount: number;
}

interface RoomRecord {

  id: string;
  userA: string;
  userB: string;
  startedAt: string;
  endedAt?: string;
  voiceEnabled: boolean;
  typingUserId?: string | null;
  typingUpdatedAt?: string | null;
}

interface PresenceContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  copy: ReturnType<typeof getCopy>;
  authenticated: boolean;
  guestMode: boolean;
  profile: PresenceProfile | null;
  queue: QueueState;
  room: RoomSession | null;
  matchTransition: MatchTransitionState | null;
  voiceState: VoiceState;
  online: boolean;
  hapticsEnabled: boolean;
  reconnectEnabled: boolean;
  matchSoundEnabled: boolean;
  initializing: boolean;
  authLoaded: boolean;
  roomLoaded: boolean;
  appReady: boolean;
  sessionReady: boolean;
  presenceStats: RealtimePresenceStats;
  adminMetrics: AdminMetrics;
  userId: string | null;
  isAdmin: boolean;

  login: (method: AuthMethod, email?: string) => Promise<void>;
  logout: () => void;

  rerollUsername: () => void;
  updateProfile: (updates: Partial<PresenceProfile>) => void;
  startQueue: () => Promise<void>;
  cancelQueue: () => Promise<void>;
  unlockVoice: () => void;
  sendMessage: (content: string) => Promise<void>;
  leaveRoom: (reason?: string) => void;
  rateRoom: (score: RatingScore) => Promise<void>;
  reportCurrentRoom: (reason: string) => Promise<void>;
  blockCurrentPartner: () => void;
  setQueueFilters: (filters: Partial<QueueFilters>) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReconnectEnabled: (enabled: boolean) => void;
  setMatchSoundEnabled: (enabled: boolean) => void;
  startVoiceChat: (audioElement: HTMLAudioElement) => Promise<void>;
  stopVoiceChat: () => void;
  startNewSessionFromEndedRoom: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);
const storageKey = "presence-mvp-state";
const roomStorageKey = "presence-mvp-room";
const queueStorageKey = "presence-mvp-queue";
const guestProfileStorageKey = "presence-mvp-guest-profile";
const guestSessionStorageKey = "presence-mvp-guest-session";
const routeStorageKey = "presence-mvp-route";
const matchTransitionStorageKey = "presence-mvp-match-transition";

function createId() {
  return crypto.randomUUID();
}

function vibrate(pattern: number | number[]) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function playMatchFoundSound() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.value = 0.0001;
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(784, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(987, context.currentTime + 0.12);
  oscillator.connect(gain);
  oscillator.start();

  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.stop(context.currentTime + 0.24);

  oscillator.onended = () => {
    void context.close();
  };
}

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateUsername() {
  return `${randomFrom(usernamePrefixes)}${randomFrom(usernameSuffixes)}`;
}

function createDefaultProfile(userId?: string): PresenceProfile {
  return {
    id: userId ?? createId(),
    username: generateUsername(),
    ageRange: "25-34",
    gender: "prefer-not",
    preference: "anyone",
    language: "both",
    interests: ["music", "deep talks", "travel"],
    role: "member",
    createdAt: new Date().toISOString(),
  };
}

function createInitialQueue(profile: PresenceProfile | null): QueueState {
  return {
    active: false,
    estimatedWaitSeconds: 18,
    filters: {
      preference: profile?.preference ?? "anyone",
      language: profile?.language ?? "both",
    },
    messageIndex: 0,
    softRelaxed: false,
  };
}

function createSystemMessage(roomId: string, content: string): ChatMessage {
  return {
    id: createId(),
    roomId,
    senderId: "system",
    content,
    createdAt: new Date().toISOString(),
    type: "system",
  };
}

function useSmoothedNumber(target: number, initialValue: number) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (value === target) {
      return;
    }

    const interval = window.setInterval(() => {
      setValue((current) => {
        if (current === target) {
          window.clearInterval(interval);
          return current;
        }

        const delta = target - current;
        const step = Math.max(1, Math.ceil(Math.abs(delta) * 0.2));
        const next = current + Math.sign(delta) * step;

        if ((delta > 0 && next >= target) || (delta < 0 && next <= target)) {
          window.clearInterval(interval);
          return target;
        }

        return next;
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, [target, value]);

  return value;
}

function getPresenceStatus(queue: QueueState, room: RoomSession | null): RealtimePresenceEntry["status"] {
  if (room?.status === "active") {
    return "room";
  }

  if (queue.active) {
    return "searching";
  }

  return "online";
}

function derivePresenceStats(state: Record<string, RealtimePresenceEntry[]>, now = Date.now()): RealtimePresenceStats {
  const uniqueEntries = Object.entries(state)
    .map(([userId, metas]) => {
      const freshEntries = (metas ?? []).filter((entry) => now - entry.updatedAt <= 45000);
      if (!freshEntries.length) {
        return null;
      }

      const latest = freshEntries.reduce((current, candidate) => (candidate.updatedAt > current.updatedAt ? candidate : current), freshEntries[0]);
      return {
        userId,
        ...latest,
      };
    })
    .filter((entry): entry is RealtimePresenceEntry => Boolean(entry));

  return {
    onlineCount: uniqueEntries.length,
    searchingCount: uniqueEntries.filter((entry) => entry.status === "searching").length,
    roomCount: uniqueEntries.filter((entry) => entry.status === "room").length,
  };
}

function createPresenceEntry(
  userId: string,
  status: RealtimePresenceEntry["status"],
  roomId: string | null,
  tabId: string,
): RealtimePresenceEntry {
  return {
    userId,
    status,
    roomId,
    updatedAt: Date.now(),
    tabId,
  };
}

interface StoredQueueState {

  active: boolean;
  joinedAt?: string;
  estimatedWaitSeconds: number;
  filters: QueueFilters;
  messageIndex: number;
  softRelaxed: boolean;
}

interface StoredRoomState {
  userId: string;
  room: RoomSession;
}

function readStoredQueueState() {
  if (typeof window === "undefined") {
    return createInitialQueue(null);
  }

  const raw = window.localStorage.getItem(queueStorageKey);
  if (!raw) {
    return createInitialQueue(null);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredQueueState>;
    return {
      active: parsed.active ?? false,
      joinedAt: parsed.joinedAt,
      estimatedWaitSeconds: parsed.estimatedWaitSeconds ?? 18,
      filters: {
        preference: parsed.filters?.preference ?? "anyone",
        language: parsed.filters?.language ?? "both",
      },
      messageIndex: parsed.messageIndex ?? 0,
      softRelaxed: parsed.softRelaxed ?? false,
    } satisfies QueueState;
  } catch {
    return createInitialQueue(null);
  }
}

function writeStoredQueueState(queue: QueueState | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!queue) {
    window.localStorage.removeItem(queueStorageKey);
    return;
  }

  window.localStorage.setItem(queueStorageKey, JSON.stringify(queue));
}

function readStoredGuestProfile() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(guestProfileStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PresenceProfile;
  } catch {
    return null;
  }
}

function writeStoredGuestProfile(profile: PresenceProfile | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!profile) {
    window.localStorage.removeItem(guestProfileStorageKey);
    return;
  }

  window.localStorage.setItem(guestProfileStorageKey, JSON.stringify(profile));
}

function readStoredGuestSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(guestSessionStorageKey) === "true";
}

function writeStoredGuestSession(isGuest: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isGuest) {
    window.localStorage.removeItem(guestSessionStorageKey);
    return;
  }

  window.localStorage.setItem(guestSessionStorageKey, "true");
}

function readStoredRoute() {

  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(routeStorageKey);
}

function writeStoredRoute(route: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (route) {
    window.sessionStorage.setItem(routeStorageKey, route);
    return;
  }

  window.sessionStorage.removeItem(routeStorageKey);
}

function readStoredState(): PresenceStoredState {
  if (typeof window === "undefined") {
    return { language: "el", authenticated: false, reportsCount: 0, ratings: [], matchSoundEnabled: true };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { language: "el", authenticated: false, reportsCount: 0, ratings: [], matchSoundEnabled: true };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PresenceStoredState>;
    return {
      language: parsed.language ?? "el",
      authenticated: parsed.authenticated ?? false,
      reportsCount: parsed.reportsCount ?? 0,
      ratings: parsed.ratings ?? [],
      matchSoundEnabled: parsed.matchSoundEnabled ?? true,
    };
  } catch {
    return { language: "el", authenticated: false, reportsCount: 0, ratings: [], matchSoundEnabled: true };
  }
}

function readStoredRoomState(): StoredRoomState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(roomStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredRoomState> | string;
    if (typeof parsed === "string") {
      return null;
    }

    if (!parsed.userId || !parsed.room?.id) {
      return null;
    }

    return {
      userId: parsed.userId,
      room: parsed.room,
    };
  } catch {
    return null;
  }
}

function readStoredRoomId() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(roomStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { roomId?: string; room?: { id?: string } } | string;
    if (typeof parsed === "string") {
      return parsed;
    }

    return parsed.roomId ?? parsed.room?.id ?? null;

  } catch {
    return null;
  }
}

function writeStoredRoomState(userId: string | null, room: RoomSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!userId || !room) {
    window.localStorage.removeItem(roomStorageKey);
    return;
  }

  window.localStorage.setItem(roomStorageKey, JSON.stringify({ userId, room }));
}

function readStoredMatchTransition() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(matchTransitionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { roomId?: string; expiresAt?: number };
    if (!parsed.roomId || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      return null;
    }

    return {
      roomId: parsed.roomId,
      secondsLeft: Math.max(1, Math.ceil((parsed.expiresAt - Date.now()) / 1000)),
    };
  } catch {
    return null;
  }
}

function writeStoredMatchTransition(transition: MatchTransitionState | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (transition) {
    window.localStorage.setItem(
      matchTransitionStorageKey,
      JSON.stringify({ roomId: transition.roomId, expiresAt: Date.now() + transition.secondsLeft * 1000 }),
    );
    return;
  }

  window.localStorage.removeItem(matchTransitionStorageKey);
}

function roomMatchesUser(room: Pick<RoomRecord, "userA" | "userB">, userId: string) {
  return room.userA === userId || room.userB === userId;
}

function createGuestRoom(profile: PresenceProfile): RoomSession {
  const roomId = crypto.randomUUID();
  return {
    id: roomId,
    userA: profile.id,
    userB: `${profile.id}-partner`,
    startedAt: new Date().toISOString(),
    voiceEnabled: false,
    status: "active",
    partner: null,
    messages: [createSystemMessage(roomId, profile.role === "admin" ? "Guest admin session ready." : "Guest session ready.")],
  };
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const stored = useMemo(() => readStoredState(), []);
  const storedQueue = useMemo(() => readStoredQueueState(), []);
  const storedRoomState = useMemo(() => readStoredRoomState(), []);
  const [language, setLanguageState] = useState<AppLanguage>(stored.language);
  const [authenticated, setAuthenticated] = useState(stored.authenticated);
  const [profile, setProfile] = useState<PresenceProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueState>(storedQueue);
  const [room, setRoom] = useState<RoomSession | null>(storedRoomState?.room ?? null);
  const [matchTransition, setMatchTransition] = useState<MatchTransitionState | null>(null);
  const [guestMode, setGuestMode] = useState(readStoredGuestSession());
  const [isAdmin, setIsAdmin] = useState(false);

  const [reportsCount, setReportsCount] = useState(stored.reportsCount ?? 0);
  const [ratings, setRatings] = useState<RatingScore[]>(stored.ratings ?? []);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [reconnectEnabled, setReconnectEnabled] = useState(true);
  const [matchSoundEnabled, setMatchSoundEnabledState] = useState(stored.matchSoundEnabled ?? true);
  const [initializing, setInitializing] = useState(true);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [presenceStats, setPresenceStats] = useState<RealtimePresenceStats>({
    onlineCount: 0,
    searchingCount: 0,
    roomCount: 0,
  });

  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics>({

    totalUsers: 0,
    activeUsers: 0,
    queueCount: 0,
    activeRooms: 0,
    averageSessionDuration: 7,
    reportsCount: 0,
    dailySignups: 0,
    usersOnlineNow: 0,
    avgWaitTimeSeconds: 18,
  });

  const voiceControllerRef = useRef<VoiceSessionController | null>(null);
  const queueTimersRef = useRef<number[]>([]);
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queueChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const presenceHeartbeatRef = useRef<number | null>(null);
  const presenceTabIdRef = useRef(createId());
  const queueSnapshotRef = useRef(queue);
  const roomSnapshotRef = useRef(room);
  const matchmakingInFlightRef = useRef(false);

  const matchedRoomIdsRef = useRef<Set<string>>(new Set());
  const hydratedSessionUserIdRef = useRef<string | null>(null);
  const matchingEnabledRef = useRef(false);
  const matchingStartTimeoutRef = useRef<number | null>(null);
  const matchingIntervalRef = useRef<number | null>(null);

  const copy = useMemo(() => getCopy(language), [language]);

  useEffect(() => {
    queueSnapshotRef.current = queue;
  }, [queue]);

  useEffect(() => {
    roomSnapshotRef.current = room;
  }, [room]);

  useEffect(() => {
    setIsAdmin(profile?.role === "admin");
  }, [profile?.role]);

  const smoothedOnlineCount = useSmoothedNumber(

    presenceStats.onlineCount > 0 ? Math.max(presenceStats.onlineCount, Math.round(presenceStats.onlineCount * 0.45 + 15.5)) : 17,
    17,
  );
  const smoothedSearchingCount = useSmoothedNumber(
    Math.max(presenceStats.searchingCount, queue.active ? 1 : 0),
    Math.max(presenceStats.searchingCount, queue.active ? 1 : 0),
  );
  const smoothedRoomCount = useSmoothedNumber(
    Math.max(presenceStats.roomCount, room?.status === "active" ? 1 : 0),
    Math.max(presenceStats.roomCount, room?.status === "active" ? 1 : 0),
  );

  useEffect(() => {

    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    writeStoredQueueState(queue);
  }, [queue]);

  useEffect(() => {
    if (!sessionReady || !authenticated) {
      return;
    }

    if (guestMode && profile) {
      writeStoredGuestProfile(profile);
      writeStoredRoomState(userId, room && room.status !== "idle" ? room : null);
      writeStoredGuestSession(true);
      return;
    }

    writeStoredRoomState(userId, room && room.status !== "idle" ? room : null);
  }, [authenticated, guestMode, profile, room, sessionReady, userId]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);

    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("vibrate" in navigator)) {
      return;
    }

    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const interactiveTarget = event.target instanceof Element ? event.target.closest("button, a, [role='button']") : null;
      if (!interactiveTarget) {
        return;
      }

      navigator.vibrate(8);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const initializeSession = async (sessionUser: { id: string } | null) => {
      setInitializing(true);
      setAppReady(false);
      setAuthLoaded(false);
      setRoomLoaded(false);
      setSessionReady(false);

      setAuthenticated(Boolean(sessionUser));
      setUserId(sessionUser?.id ?? null);

      if (sessionUser) {
        if (!guestMode) {
          writeStoredGuestSession(false);
          writeStoredGuestProfile(null);
        }
      }

      if (!sessionUser) {
        hydratedSessionUserIdRef.current = null;
        stopQueueSubscriptions();
        stopRoomSubscriptions();
        matchedRoomIdsRef.current.clear();
        if (!guestMode) {
          setGuestMode(false);
        }
        setProfile(null);
        setRoom(null);
        setQueue(createInitialQueue(null));
        setMatchTransition(null);
        setVoiceState("idle");
        setIsAdmin(false);
        writeStoredGuestSession(false);
        writeStoredGuestProfile(null);
        writeStoredRoomState(null, null);
        writeStoredMatchTransition(null);
        setAuthLoaded(true);
        setRoomLoaded(true);
        setSessionReady(true);
        setAppReady(true);
        setInitializing(false);
        return;
      }

      try {
        if (hydratedSessionUserIdRef.current !== sessionUser.id) {
          hydratedSessionUserIdRef.current = sessionUser.id;
          await hydrateAuthenticatedUser(sessionUser.id);
        }
      } catch {
        hydratedSessionUserIdRef.current = null;
        await supabase.auth.signOut();
        stopQueueSubscriptions();
        stopRoomSubscriptions();
        matchedRoomIdsRef.current.clear();
        setAuthenticated(false);
        setUserId(null);
        setProfile(null);
        setRoom(null);
        setQueue(createInitialQueue(null));
        setMatchTransition(null);
        setVoiceState("idle");
        setIsAdmin(false);
        writeStoredRoomState(null, null);
        writeStoredMatchTransition(null);
      } finally {
        setAuthLoaded(true);
        setRoomLoaded(true);
        setSessionReady(true);
        setAppReady(true);
        setInitializing(false);
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      void initializeSession(session?.user ?? null);
    });

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        void initializeSession(data.session?.user ?? null);
      })
      .catch(() => {
        void initializeSession(null);
      });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionReady || !authenticated || !userId || initializing) {
      presenceChannelRef.current?.untrack?.();
      if (presenceHeartbeatRef.current) {
        window.clearInterval(presenceHeartbeatRef.current);
        presenceHeartbeatRef.current = null;
      }
      presenceChannelRef.current?.unsubscribe?.();
      presenceChannelRef.current = null;
      setPresenceStats({ onlineCount: 0, searchingCount: 0, roomCount: 0 });
      return;
    }

    const channel = supabase.channel("echoo-presence", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannelRef.current = channel;

    const syncPresence = () => {
      const snapshot = typeof channel.presenceState === "function" ? channel.presenceState() : {};
      setPresenceStats(derivePresenceStats(snapshot as Record<string, RealtimePresenceEntry[]>));
    };

    channel.on("presence", { event: "sync" }, syncPresence);
    channel.on("presence", { event: "join" }, syncPresence);
    channel.on("presence", { event: "leave" }, syncPresence);

    channel.subscribe((status: string) => {
      if (status !== "SUBSCRIBED") {
        return;
      }

      void channel.track(
        createPresenceEntry(
          userId,
          getPresenceStatus(queueSnapshotRef.current, roomSnapshotRef.current),
          roomSnapshotRef.current?.status === "active" ? roomSnapshotRef.current.id : null,
          presenceTabIdRef.current,
        ),
      );

      syncPresence();

      if (presenceHeartbeatRef.current) {
        window.clearInterval(presenceHeartbeatRef.current);
      }

      presenceHeartbeatRef.current = window.setInterval(() => {
        void channel.track(
          createPresenceEntry(
            userId,
            getPresenceStatus(queueSnapshotRef.current, roomSnapshotRef.current),
            roomSnapshotRef.current?.status === "active" ? roomSnapshotRef.current.id : null,
            presenceTabIdRef.current,
          ),
        );

      }, 15000);
    });

    const handlePageHide = () => {
      void channel.untrack?.();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);

      if (presenceHeartbeatRef.current) {
        window.clearInterval(presenceHeartbeatRef.current);
        presenceHeartbeatRef.current = null;
      }
      void channel.untrack?.();
      presenceChannelRef.current = null;
    };
  }, [authenticated, initializing, sessionReady, userId]);

  useEffect(() => {
    const channel = presenceChannelRef.current;
    if (!channel || !authenticated || !sessionReady || !userId || initializing) {
      return;
    }

    void channel.track(
      createPresenceEntry(
        userId,
        getPresenceStatus(queueSnapshotRef.current, roomSnapshotRef.current),
        roomSnapshotRef.current?.status === "active" ? roomSnapshotRef.current.id : null,
        presenceTabIdRef.current,
      ),
    );
  }, [authenticated, initializing, queue.active, queue.joinedAt, room?.id, room?.status, sessionReady, userId]);

  useEffect(() => {
    setAdminMetrics((current) => ({

      ...current,
      activeUsers: smoothedSearchingCount + smoothedRoomCount,
      queueCount: smoothedSearchingCount,
      activeRooms: smoothedRoomCount,
      usersOnlineNow: smoothedOnlineCount,
    }));
  }, [smoothedOnlineCount, smoothedRoomCount, smoothedSearchingCount]);

  useEffect(() => {
    if (!queue.active || room) {

      queueTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      queueTimersRef.current = [];
      return;
    }

    const rotationId = window.setInterval(() => {
      setQueue((current) => ({
        ...current,
        messageIndex: (current.messageIndex + 1) % queueMessages[language].length,
      }));
    }, 1700);

    const relaxId = window.setTimeout(() => {
      setQueue((current) => ({ ...current, softRelaxed: true, estimatedWaitSeconds: 12 }));
      toast(copy.misc.noUsers);
    }, 3600);

    queueTimersRef.current = [rotationId, relaxId];

    return () => {
      window.clearInterval(rotationId);
      window.clearTimeout(relaxId);
    };
  }, [copy.misc.noUsers, language, queue.active]);

  useEffect(() => {
    return () => {
      stopQueueSubscriptions();
      stopRoomSubscriptions();
      voiceControllerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    void refreshAdminMetrics().catch(() => undefined);

    const interval = window.setInterval(() => {
      void refreshAdminMetrics().catch(() => undefined);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [authenticated, queue.active, reportsCount, queue.estimatedWaitSeconds, smoothedOnlineCount, smoothedRoomCount, smoothedSearchingCount]);

  useEffect(() => {
    if (guestMode || !room?.id || !reconnectEnabled || !hasSupabaseConfig) {
      return;
    }

    const interval = window.setInterval(async () => {
      const latestRoom = await loadRoomById(room.id);
      if (latestRoom) {
        setRoom((current) => {
          if (!current || current.id !== room.id) {
            return current;
          }

          return {
            ...current,
            endedAt: latestRoom.endedAt,
            voiceEnabled: latestRoom.voiceEnabled,
            status: latestRoom.endedAt ? "ended" : "active",
          };
        });
      }

      const latestMessages = (await loadRoomMessages(room.id)) as ChatMessage[];
      setRoom((current) => {
        if (!current || current.id !== room.id) {
          return current;
        }

        const mergedMessages = latestMessages.reduce((acc: ChatMessage[], message) => {
          if (acc.some((item) => item.id === message.id)) {
            return acc;
          }
          acc.push(message);
          return acc;
        }, current.messages.slice());

        return {
          ...current,
          messages: mergedMessages,
        };
      });
    }, 2400);

    return () => window.clearInterval(interval);
  }, [guestMode, reconnectEnabled, room?.id]);

  async function hydrateAuthenticatedUser(currentUserId: string) {
    const loadedProfile = await loadProfile(currentUserId);
    const profileToUse = loadedProfile ?? createDefaultProfile(currentUserId);

    const effectiveProfile = loadedProfile ?? profileToUse;
    setIsAdmin(effectiveProfile.role === "admin");

    if (loadedProfile) {

      setProfile(loadedProfile);
      setQueue((current) => ({
        ...current,
        filters: {
          preference: loadedProfile.preference,
          language: loadedProfile.language,
        },
      }));
    } else {
      setProfile(profileToUse);
      await syncProfile(profileToUse);
    }

    const activeRoom = (await loadActiveRoomForUser(currentUserId)) as RoomRecord | null;
    if (activeRoom) {
      const pendingMatch = readStoredMatchTransition();
      if (pendingMatch && pendingMatch.roomId === activeRoom.id) {
        setMatchTransition(pendingMatch);
      } else {
        writeStoredMatchTransition(null);
      }
      await openRoom(activeRoom.id, currentUserId, activeRoom);
      setQueue(createInitialQueue(profileToUse));
      return;
    }

    if (storedRoomState?.userId === currentUserId && storedRoomState.room) {
      const fallbackRoom = storedRoomState.room;
      if (!fallbackRoom.endedAt || roomMatchesUser(fallbackRoom, currentUserId)) {
        await openRoom(fallbackRoom.id, currentUserId, {
          id: fallbackRoom.id,
          userA: fallbackRoom.userA,
          userB: fallbackRoom.userB,
          startedAt: fallbackRoom.startedAt,
          endedAt: fallbackRoom.endedAt,
          voiceEnabled: fallbackRoom.voiceEnabled,
          typingUserId: fallbackRoom.typingUserId,
          typingUpdatedAt: fallbackRoom.typingUpdatedAt,
        });
        setQueue(createInitialQueue(profileToUse));
        return;
      }
    }

    const legacyRoomId = readStoredRoomId();
    if (legacyRoomId) {
      const legacyRoom = (await loadRoomById(legacyRoomId)) as RoomRecord | null;
      if (legacyRoom && !legacyRoom.endedAt && roomMatchesUser(legacyRoom, currentUserId)) {
        await openRoom(legacyRoom.id, currentUserId, legacyRoom);
        setQueue(createInitialQueue(profileToUse));
        return;
      }
    }

    stopRoomSubscriptions();
    setRoom(null);
    writeStoredMatchTransition(null);
    setQueue(storedQueue.active ? storedQueue : createInitialQueue(profileToUse));

  }

  async function hydrateRoomPartner(nextRoom: RoomSession, currentUserId: string) {
    const messages = await loadRoomMessages(nextRoom.id);

    setRoom({
      ...nextRoom,
      partner: null,
      messages: messages.length
        ? messages
        : [createSystemMessage(nextRoom.id, language === "en" ? "Connection opened. Stay curious and respectful." : "Η σύνδεση άνοιξε. Μείνε περίεργος και με σεβασμό.")],
      status: nextRoom.endedAt ? "ended" : "active",
    });
  }

  function stopRoomSubscriptions() {
    roomChannelRef.current?.unsubscribe();
    roomChannelRef.current = null;
  }

  function stopQueueSubscriptions() {
    queueChannelRef.current?.unsubscribe();
    queueChannelRef.current = null;
  }

  function subscribeToQueueChanges(currentUserId: string) {
    stopQueueSubscriptions();

    const channel = supabase
      .channel(`presence-queue-${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "queue" }, () => {
        if (!matchingEnabledRef.current) {
          return;
        }
        const relaxed = queue.joinedAt ? Date.now() - new Date(queue.joinedAt).getTime() >= 12000 : false;
        void attemptRealtimeMatch(currentUserId, relaxed);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "queue" }, () => {
        if (!matchingEnabledRef.current) {
          return;
        }
        const relaxed = queue.joinedAt ? Date.now() - new Date(queue.joinedAt).getTime() >= 12000 : false;
        void attemptRealtimeMatch(currentUserId, relaxed);
      })
      .subscribe();

    queueChannelRef.current = channel;
  }

  async function attemptRealtimeMatch(currentUserId: string, relaxed = false, force = false) {
    if (!authenticated || !profile || room || (!queue.active && !force) || matchmakingInFlightRef.current) {
      return;
    }

    matchmakingInFlightRef.current = true;

    try {
      let match;
      try {
        match = await matchQueueUser(currentUserId, relaxed);
      } catch (error) {
        const maybeStatus = (error as { status?: number; code?: string } | null)?.status;
        if (maybeStatus === 409 || (error as { code?: string } | null)?.code === "409") {
          return;
        }
        throw error;
      }

      if (!match.roomId) {
        return;
      }

      if (matchedRoomIdsRef.current.has(match.roomId)) {
        return;
      }

      const activeRoom = await loadRoomById(match.roomId);
      if (!activeRoom || activeRoom.endedAt || (activeRoom.userA !== currentUserId && activeRoom.userB !== currentUserId)) {
        return;
      }

      matchedRoomIdsRef.current.add(activeRoom.id);
      stopQueueSubscriptions();
      setMatchTransition({
        roomId: activeRoom.id,
        secondsLeft: 3,
      });

      if (matchSoundEnabled) {
        playMatchFoundSound();
      }

      await openRoom(activeRoom.id, currentUserId, activeRoom);
      setQueue(createInitialQueue(profile));
      toast.success(copy.misc.sessionReady);
      if (hapticsEnabled) {
        vibrate([60, 40, 80]);
      }
    } finally {
      matchmakingInFlightRef.current = false;
    }
  }

  function subscribeToRoom(roomId: string) {
    stopRoomSubscriptions();

    const channel = supabase
      .channel(`presence-room-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const inserted = payload.new as {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };

        setRoom((current) => {
          if (!current || current.id !== roomId) {
            return current;
          }

          if (current.messages.some((message) => message.id === inserted.id)) {
            return current;
          }

          return {
            ...current,
            messages: [
              ...current.messages,
              {
                id: inserted.id,
                roomId: inserted.room_id,
                senderId: inserted.sender_id,
                content: inserted.content,
                createdAt: inserted.created_at,
                type: "text",
              },
            ],
          };
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as {
          id: string;
          user_a: string;
          user_b: string;
          started_at: string;
          ended_at: string | null;
          voice_enabled: boolean;
          typing_user_id: string | null;
          typing_updated_at: string | null;
        };

        setRoom((current) => {
          if (!current || current.id !== roomId) {
            return current;
          }

          return {
            ...current,
            endedAt: updated.ended_at ?? undefined,
            voiceEnabled: updated.voice_enabled,
            typingUserId: updated.typing_user_id,
            typingUpdatedAt: updated.typing_updated_at,
            status: updated.ended_at ? "ended" : "active",
          };
        });
      })
      .subscribe();

    roomChannelRef.current = channel;
  }

  async function openRoom(roomId: string, currentUserId: string, existingRoom?: RoomRecord) {
    if (!profile) {
      return;
    }

    const roomBase = existingRoom ?? ((await loadActiveRoomForUser(currentUserId)) as RoomRecord | null);
    if (!roomBase) {
      return;
    }

    const roomSession: RoomSession = {
      id: roomBase.id,
      userA: roomBase.userA,
      userB: roomBase.userB,
      startedAt: roomBase.startedAt,
      endedAt: roomBase.endedAt,
      voiceEnabled: roomBase.voiceEnabled,
      status: roomBase.endedAt ? "ended" : "active",
      partner: null,
      messages: [],
      typingUserId: roomBase.typingUserId ?? null,
      typingUpdatedAt: roomBase.typingUpdatedAt ?? null,
    };

    setRoom(roomSession);
    await hydrateRoomPartner(roomSession, currentUserId);
    subscribeToRoom(roomId);
  }

  useEffect(() => {
    if (!matchTransition) {
      return;
    }

    if (matchTransition.secondsLeft <= 0) {
      setMatchTransition(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      setMatchTransition((current) => {
        if (!current) {
          return current;
        }

        if (current.secondsLeft <= 1) {
          return null;
        }

        return {
          ...current,
          secondsLeft: current.secondsLeft - 1,
        };
      });
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [matchTransition]);

  useEffect(() => {
    if (!authenticated || !profile || !userId || !queue.active || room) {
      matchingEnabledRef.current = false;
      stopQueueSubscriptions();
      if (matchingStartTimeoutRef.current) {
        window.clearTimeout(matchingStartTimeoutRef.current);
        matchingStartTimeoutRef.current = null;
      }
      if (matchingIntervalRef.current) {
        window.clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }
      return;
    }

    matchingEnabledRef.current = true;
    subscribeToQueueChanges(userId);

    if (matchingStartTimeoutRef.current) {
      window.clearTimeout(matchingStartTimeoutRef.current);
    }
    if (matchingIntervalRef.current) {
      window.clearInterval(matchingIntervalRef.current);
    }

    matchingStartTimeoutRef.current = window.setTimeout(() => {
      const relaxed = queue.joinedAt ? Date.now() - new Date(queue.joinedAt).getTime() >= 12000 : false;
      void attemptRealtimeMatch(userId, relaxed, true).catch(() => undefined);
    }, 100);

    matchingIntervalRef.current = window.setInterval(() => {
      const relaxed = queue.joinedAt ? Date.now() - new Date(queue.joinedAt).getTime() >= 12000 : false;
      void attemptRealtimeMatch(userId, relaxed).catch(() => undefined);
    }, 3000);

    return () => {
      if (matchingStartTimeoutRef.current) {
        window.clearTimeout(matchingStartTimeoutRef.current);
        matchingStartTimeoutRef.current = null;
      }
      if (matchingIntervalRef.current) {
        window.clearInterval(matchingIntervalRef.current);
        matchingIntervalRef.current = null;
      }
      matchingEnabledRef.current = false;
      stopQueueSubscriptions();
    };
  }, [authenticated, profile, queue.active, queue.joinedAt, room?.id, userId]);

  async function refreshAdminMetrics() {
    const liveUsers = smoothedOnlineCount;
    const liveSearching = smoothedSearchingCount;
    const liveRooms = smoothedRoomCount;

    if (!hasSupabaseConfig) {
      setAdminMetrics({
        totalUsers: 1842,
        activeUsers: liveSearching + liveRooms,
        queueCount: liveSearching,
        activeRooms: liveRooms,
        averageSessionDuration: 7,
        reportsCount: 18 + reportsCount,
        dailySignups: 73,
        usersOnlineNow: liveUsers,
        avgWaitTimeSeconds: queue.active ? queue.estimatedWaitSeconds : 22,
      });
      return;
    }

    const [{ count: totalUsers }, { count: reportsTotal }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }),
    ]);

    setAdminMetrics({
      totalUsers: totalUsers ?? 0,
      activeUsers: liveSearching + liveRooms,
      queueCount: liveSearching,
      activeRooms: liveRooms,
      averageSessionDuration: 7,
      reportsCount: reportsTotal ?? 0,
      dailySignups: 73,
      usersOnlineNow: liveUsers,
      avgWaitTimeSeconds: queue.active ? queue.estimatedWaitSeconds : 22,
    });
  }

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const login = useCallback(
    async (method: AuthMethod, email?: string) => {
      if (method === "guest") {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          toast.error(error.message);
          return;
        }

        setGuestMode(true);
        writeStoredGuestSession(true);
        toast.success(language === "en" ? "Guest session ready." : "Η guest συνεδρία είναι έτοιμη.");
        return;
      }

      if (method === "google") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) {
          toast.error(error.message);
        }
        return;
      }

      if (!email) {
        toast.error(language === "en" ? "Add an email address to receive the magic link." : "Πρόσθεσε ένα email για να λάβεις το magic link.");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(language === "en" ? "Magic link sent." : "Το magic link στάλθηκε.");
    },
    [language],
  );

  const logout = useCallback(async () => {
    matchedRoomIdsRef.current.clear();
    setMatchTransition(null);
    stopQueueSubscriptions();
    stopRoomSubscriptions();
    writeStoredRoomState(null, null);
    writeStoredMatchTransition(null);
    writeStoredQueueState(null);
    setQueue(createInitialQueue(profile));
    setRoom(null);
    setVoiceState("idle");
    setIsAdmin(false);
    setGuestMode(false);
    writeStoredGuestSession(false);
    writeStoredGuestProfile(null);

    void supabase.auth.signOut();

    setAuthenticated(false);
    setUserId(null);
    setProfile(null);
    toast(copy.misc.signedOut);
  }, [copy.misc.signedOut]);


  const rerollUsername = useCallback(() => {
    setProfile((current) => {
      const nextProfile = {
        ...(current ?? createDefaultProfile(userId ?? undefined)),
        username: generateUsername(),
      };
      void syncProfile(nextProfile);
      return nextProfile;
    });
    if (hapticsEnabled) {
      vibrate(20);
    }
  }, [hapticsEnabled, userId]);

  const updateProfile = useCallback(
    (updates: Partial<PresenceProfile>) => {
      setProfile((current) => {
        const nextProfile = {
          ...(current ?? createDefaultProfile(userId ?? undefined)),
          ...updates,
        };
        void syncProfile(nextProfile);
        return nextProfile;
      });
      if (updates.preference || updates.language) {
        setQueue((current) => ({
          ...current,
          filters: {
            preference: (updates.preference as QueueFilters["preference"]) ?? current.filters.preference,
            language: (updates.language as QueueFilters["language"]) ?? current.filters.language,
          },
        }));
      }
      toast(copy.misc.profileSaved);
    },
    [copy.misc.profileSaved, userId],
  );

  const setQueueFilters = useCallback((filters: Partial<QueueFilters>) => {
    setQueue((current) => ({
      ...current,
      filters: {
        ...current.filters,
        ...filters,
      },
    }));
  }, []);

  const startQueue = useCallback(async () => {
    if (!authenticated) {
      return;
    }

    const activeProfile =
      profile ??
      (userId
        ? {
            ...(createDefaultProfile(userId)),
          }
        : null);

    if (!activeProfile) {
      return;
    }

    if (!profile) {
      setProfile(activeProfile);
      await syncProfile(activeProfile);
    }

    stopQueueSubscriptions();
    stopRoomSubscriptions();
    matchingEnabledRef.current = false;
    matchedRoomIdsRef.current.clear();
    setMatchTransition(null);
    setRoom(null);

    await cleanupUserSession(activeProfile.id);

    const nextQueue: QueueState = {
      active: true,
      joinedAt: new Date().toISOString(),
      estimatedWaitSeconds: 18,
      filters: {
        preference: activeProfile.preference,
        language: activeProfile.language,
      },
      messageIndex: 0,
      softRelaxed: false,
    };

    setQueue(nextQueue);
    writeStoredQueueState(nextQueue);

    await joinQueue(activeProfile.id, {
      preference: activeProfile.preference,
      language: activeProfile.language,
    });

    matchingEnabledRef.current = true;
    void attemptRealtimeMatch(activeProfile.id, false, true).catch(() => undefined);

    if (hapticsEnabled) {
      vibrate([40, 20, 40]);
    }
  }, [authenticated, hapticsEnabled, profile, userId]);

  const cancelQueue = useCallback(async () => {
    stopQueueSubscriptions();
    matchingEnabledRef.current = false;
    matchedRoomIdsRef.current.clear();
    setMatchTransition(null);
    if (matchingStartTimeoutRef.current) {
      window.clearTimeout(matchingStartTimeoutRef.current);
      matchingStartTimeoutRef.current = null;
    }
    if (matchingIntervalRef.current) {
      window.clearInterval(matchingIntervalRef.current);
      matchingIntervalRef.current = null;
    }
    if (profile) {
      await leaveQueue(profile.id);
    }
    const nextQueue = createInitialQueue(profile);
    setQueue(nextQueue);
    writeStoredQueueState(nextQueue);
  }, [profile]);

  const unlockVoice = useCallback(() => {
    setRoom((current) => {
      if (!current || current.voiceEnabled) {
        return current;
      }

      const nextRoom = {
        ...current,
        voiceEnabled: true,
      };
      void persistRoom(nextRoom);
      toast.success(copy.session.voiceUnlocked);
      return nextRoom;
    });
  }, [copy.session.voiceUnlocked]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!room || !profile || !content.trim()) {
        return;
      }

      const userMessage: ChatMessage = {
        id: createId(),
        roomId: room.id,
        senderId: profile.id,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        type: "text",
      };

      setRoom((current) =>
        current
          ? {
              ...current,
              messages: current.messages.some((message) => message.id === userMessage.id)
                ? current.messages
                : [...current.messages, userMessage],
            }
          : current,
      );
      await persistMessage(userMessage);
    },
    [profile, room],
  );

  const stopVoiceChat = useCallback(() => {
    voiceControllerRef.current?.stop();
    voiceControllerRef.current = null;
    setVoiceState("idle");
  }, []);

  const startVoiceChat = useCallback(
    async (audioElement: HTMLAudioElement) => {
      setVoiceState("connecting");
      toast(copy.session.voiceStarting);

      try {
        voiceControllerRef.current?.stop();
        voiceControllerRef.current = await createVoiceLoopback(audioElement);
        setVoiceState("connected");
        toast.success(copy.session.connected);
        if (hapticsEnabled) {
          vibrate([40, 30, 60]);
        }
      } catch {
        setVoiceState("error");
        toast.error(language === "en" ? "Microphone permission was not granted." : "Δεν δόθηκε άδεια στο μικρόφωνο.");
      }
    },
    [copy.session.connected, copy.session.voiceStarting, hapticsEnabled, language],
  );

  const leaveRoom = useCallback(
    (reason?: string) => {
      stopVoiceChat();
      if (!room) {
        return;
      }

      const nextRoom = {
        ...room,
        status: "ended" as const,
        endedAt: new Date().toISOString(),
        messages: reason
          ? [...room.messages, createSystemMessage(room.id, reason)]
          : room.messages,
      };

      void endRoom(nextRoom);
      void persistRoom(nextRoom);
      if (profile) {
        void leaveQueue(profile.id);
      }
      matchedRoomIdsRef.current.clear();
      setMatchTransition(null);
      setRoom(nextRoom);
      setQueue(createInitialQueue(profile));
      writeStoredRoomState(profile?.id ?? null, nextRoom);
      writeStoredMatchTransition(null);
    },
    [profile, room, stopVoiceChat],
  );

  const rateRoom = useCallback(
    async (score: RatingScore) => {
      if (!room || !userId) {
        return;
      }

      setRoom((current) => (current ? { ...current, rating: score } : current));
      setRatings((current) => [...current, score]);
      await persistRating(room.id, userId, score);
      toast.success(copy.misc.ratingSaved);
    },
    [copy.misc.ratingSaved, room, userId],
  );

  const reportCurrentRoom = useCallback(
    async (reason: string) => {
      if (!room || !userId) {
        return;
      }

      const partnerId = room.userA === userId ? room.userB : room.userA;
      setReportsCount((current) => current + 1);
      await persistReport(room.id, userId, partnerId, reason);
      toast.success(copy.misc.reported);
      leaveRoom(language === "en" ? "Conversation ended after a report." : "Η συνομιλία ολοκληρώθηκε μετά από αναφορά.");
    },
    [copy.misc.reported, language, leaveRoom, room, userId],
  );

  const blockCurrentPartner = useCallback(() => {
    toast.success(copy.misc.blocked);
    leaveRoom(language === "en" ? "Connection closed and partner blocked." : "Η σύνδεση έκλεισε και ο χρήστης μπλοκαρίστηκε.");
  }, [copy.misc.blocked, language, leaveRoom]);

  const startNewSessionFromEndedRoom = useCallback(async () => {
    if (room) {
      const endedRoom = {
        ...room,
        status: "ended" as const,
        endedAt: room.endedAt ?? new Date().toISOString(),
      };
      void endRoom(endedRoom);
      void persistRoom(endedRoom);
    }

    matchedRoomIdsRef.current.clear();
    setMatchTransition(null);
    setRoom(null);
    writeStoredRoomState(null, null);
    writeStoredMatchTransition(null);

    await startQueue();
  }, [room, startQueue]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      language,
      setLanguage,
      copy,
      authenticated,
      guestMode,
      profile,
      queue,
      room,
      matchTransition,
      voiceState,
      online,
      hapticsEnabled,
      reconnectEnabled,
      matchSoundEnabled,
      initializing,
      authLoaded,
      roomLoaded,
      appReady,
      sessionReady,
      presenceStats,
      adminMetrics,
      userId,
      isAdmin,
      login,
      logout,
      rerollUsername,
      updateProfile,
      startQueue,
      cancelQueue,
      unlockVoice,
      sendMessage,
      leaveRoom,
      rateRoom,
      reportCurrentRoom,
      blockCurrentPartner,
      setQueueFilters,
      setHapticsEnabled,
      setReconnectEnabled,
      setMatchSoundEnabled: setMatchSoundEnabledState,
      startVoiceChat,
      stopVoiceChat,
      startNewSessionFromEndedRoom,
    }),
    [
      adminMetrics,
      appReady,
      authenticated,
      blockCurrentPartner,
      cancelQueue,
      copy,
      hapticsEnabled,
      initializing,
      isAdmin,
      language,
      leaveRoom,
      login,
      logout,
      matchSoundEnabled,
      matchTransition,
      online,
      presenceStats,
      profile,
      queue,
      rateRoom,
      reconnectEnabled,
      reportCurrentRoom,
      room,
      roomLoaded,
      userId,
      sendMessage,
      sessionReady,
      setLanguage,
      setQueueFilters,
      setHapticsEnabled,
      setReconnectEnabled,
      setMatchSoundEnabledState,
      startNewSessionFromEndedRoom,
      startQueue,
      startVoiceChat,
      stopVoiceChat,
      unlockVoice,
      voiceState,
      guestMode,
    ],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence must be used within PresenceProvider");
  }
  return context;
}

export type { PresenceContextValue };