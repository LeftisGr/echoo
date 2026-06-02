import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
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
  loadBlockedUserIds,
  loadModerationState,
  loadProfile,
  loadRoomById,

  loadRoomMessages,
  matchQueueUser,
  persistBlock,
  persistMessage,
  persistRating,
  persistReport,
  persistRoom,
  persistRoomTyping,
  recordSafetyEvent,
  syncProfile,
  cleanupUserSession,
} from "@/lib/presence-backend";

import { createPeerToPeerVoiceSession, type VoiceSessionController, type VoiceTransmissionDiagnostics } from "@/lib/presence-rtc";
import { cleanupExpiredEphemeralContent } from "@/lib/content-api";
import { createFeatureGateSnapshot, FeatureGateKey } from "@/lib/feature-gates";
import { EPHEMERAL_CONTENT_CLEANUP_INTERVAL_MS, getEphemeralContentExpiresAt } from "@/lib/ephemeral-content";
import { logAnalyticsEvent, logErrorEvent } from "@/lib/operational-logs";
import { supporterStorageKey } from "@/lib/support";
import { playSoundFeedback } from "@/lib/sound-feedback";

import {
  MEDIA_UPLOAD_BUCKET,
  MEDIA_UPLOAD_COOLDOWN_MS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_MEDIA_MESSAGES_PER_SESSION,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  isSupportedAudioType,
  isSupportedImageType,
  isSupportedVideoType,
  sanitizeMediaFileName,
  type MediaPreviewData,
} from "@/lib/session-media";

import type {
  AccountRestriction,
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
  rtcState?: RoomSession["rtcState"];
  rtcConnectionId?: string | null;
  rtcUpdatedAt?: string | null;
  voiceUnlockedAt?: string | null;
  typingUserId?: string | null;
  typingUpdatedAt?: string | null;
}

interface TypingIndicatorState {
  roomId: string;
  senderId: string;
  displayName: string;
  updatedAt: string;
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
  voiceMuted: boolean;
  voicePlaybackBlocked: boolean;
  voiceDiagnostics: VoiceTransmissionDiagnostics | null;
  typingIndicator: TypingIndicatorState | null;

  online: boolean;
  hapticsEnabled: boolean;
  reconnectEnabled: boolean;
  matchSoundEnabled: boolean;
  supporter: boolean;
  setSupporter: (enabled: boolean) => void;

  initializing: boolean;
  authLoaded: boolean;
  roomLoaded: boolean;
  appReady: boolean;
  sessionReady: boolean;
  presenceStats: RealtimePresenceStats;
  adminMetrics: AdminMetrics;
  userId: string | null;
  isAdmin: boolean;
  blockedUserCount: number;
  blockedUserIds: string[];
  accountRestriction: AccountRestriction;

  login: (method: AuthMethod, email?: string) => Promise<void>;

  logout: () => void;

  rerollUsername: () => void;
  updateProfile: (updates: Partial<PresenceProfile>) => void;
  startQueue: () => Promise<void>;
  cancelQueue: () => Promise<void>;
  unlockVoice: () => void;
  sendMessage: (content: string) => Promise<boolean>;

  sendMediaMessage: (input: { file: File; caption: string; preview: MediaPreviewData }) => Promise<void>;
  leaveRoom: (reason?: string) => void;
  rateRoom: (score: RatingScore) => Promise<void>;
  reportCurrentRoom: (reason: string) => Promise<void>;
  blockCurrentPartner: () => Promise<void>;

  setQueueFilters: (filters: Partial<QueueFilters>) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReconnectEnabled: (enabled: boolean) => void;
  setMatchSoundEnabled: (enabled: boolean) => void;
  startVoiceChat: () => Promise<void>;
  stopVoiceChat: () => void;
  enableVoicePlayback: () => Promise<void>;
  setVoiceMuted: (muted: boolean) => void;
  setVoiceTransmissionEnabled: (enabled: boolean) => void;
  sendTypingState: (typing: boolean, updatedAt?: string) => void;

  appendSystemMessage: (content: string) => void;

  startNewSessionFromEndedRoom: () => Promise<void>;

}

const PresenceContext = createContext<PresenceContextValue | null>(null);
const storageKey = "presence-mvp-state";
const roomStorageKey = "presence-mvp-room";
const queueStorageKey = "presence-mvp-queue";
const guestProfileStorageKey = "presence-mvp-guest-profile";
const guestSessionStorageKey = "presence-mvp-guest-session";
const blockedUsersStorageKey = "presence-mvp-blocked-users";
const routeStorageKey = "presence-mvp-route";
const matchTransitionStorageKey = "presence-mvp-match-transition";


function readStoredBlockedUsers(userId: string | null) {
  if (typeof window === "undefined" || !userId) {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(blockedUsersStorageKey);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed[userId] ?? [];
  } catch {
    return [] as string[];
  }
}

function writeStoredBlockedUsers(userId: string | null, blockedUserIds: string[]) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  const raw = window.localStorage.getItem(blockedUsersStorageKey);
  let parsed: Record<string, string[]> = {};

  if (raw) {
    try {
      parsed = JSON.parse(raw) as Record<string, string[]>;
    } catch {
      parsed = {};
    }
  }

  parsed[userId] = blockedUserIds;
  window.localStorage.setItem(blockedUsersStorageKey, JSON.stringify(parsed));
}

function createId() {

  return crypto.randomUUID();
}

function PersistentVoiceAudio({ audioRef }: { audioRef: RefObject<HTMLAudioElement | null> }) {

  useEffect(() => {
    console.info("[rtc] audio element mounted");
    return () => {
      console.info("[rtc] audio element unmounted");
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      aria-hidden="true"
      className="pointer-events-none absolute h-px w-px opacity-0"
    />
  );
}

function vibrate(pattern: number | number[]) {

  if (typeof window === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  if (navigator.userActivation && !navigator.userActivation.isActive) {
    return;
  }

  navigator.vibrate(pattern);
}

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

const guestAvatarEmojis = ["🌙", "✨", "☁️", "🫧", "🪩", "🌿"] as const;
const vibeLabels = ["night owl", "deep talker", "soft listener", "curious mind"] as const;

function generateUsername() {
  return `${randomFrom(usernamePrefixes)}${randomFrom(usernameSuffixes)}`;
}

function createDefaultProfile(userId?: string, profileMode: PresenceProfile["profileMode"] = "guest", email: string | null = null): PresenceProfile {
  const createdAt = new Date().toISOString();
  return {
    id: userId ?? createId(),
    username: generateUsername(),
    email,
    profileMode,
    bio: null,
    avatarEmoji: randomFrom(guestAvatarEmojis),
    avatarUrl: null,
    ageRange: "25-34",
    gender: "prefer-not",
    preference: "anyone",
    language: "both",
    interests: ["music", "deep talks", "travel"],
    vibeLabel: randomFrom(vibeLabels),
    conversationsCompleted: 0,
    streakDays: 0,
    lastCompletedAt: null,
    role: "member",
    createdAt,
    updatedAt: createdAt,
  };
}

function ensureProfileAvatar(profile: PresenceProfile): PresenceProfile {
  if (profile.avatarEmoji) {
    return profile;
  }

  return {
    ...profile,
    avatarEmoji: randomFrom(guestAvatarEmojis),
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
    const parsed = JSON.parse(raw) as Partial<PresenceProfile>;
    const fallback = createDefaultProfile(parsed.id ?? undefined, parsed.profileMode ?? "guest", parsed.email ?? null);
    return {
      ...fallback,
      ...parsed,
      profileMode: parsed.profileMode ?? fallback.profileMode,
      bio: parsed.bio ?? fallback.bio,
      avatarEmoji: parsed.avatarEmoji ?? fallback.avatarEmoji,
      avatarUrl: parsed.avatarUrl ?? fallback.avatarUrl,
      interests: parsed.interests ?? fallback.interests,
      vibeLabel: parsed.vibeLabel ?? fallback.vibeLabel,
      conversationsCompleted: parsed.conversationsCompleted ?? fallback.conversationsCompleted,
      streakDays: parsed.streakDays ?? fallback.streakDays,
      lastCompletedAt: parsed.lastCompletedAt ?? fallback.lastCompletedAt,
      updatedAt: parsed.updatedAt ?? fallback.updatedAt,
    } satisfies PresenceProfile;
  } catch {
    return null;
  }
}

function promoteGuestProfile(profile: PresenceProfile, userId: string, email: string | null): PresenceProfile {
  return {
    ...profile,
    id: userId,
    email,
    profileMode: "registered",
    updatedAt: new Date().toISOString(),
  };
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

function readStoredSupporter() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(supporterStorageKey) === "true";
}

function writeStoredSupporter(supporter: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (!supporter) {
    window.localStorage.removeItem(supporterStorageKey);
    return;
  }

  window.localStorage.setItem(supporterStorageKey, "true");
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
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedUsersLoaded, setBlockedUsersLoaded] = useState(false);

  const [queue, setQueue] = useState<QueueState>(storedQueue);

  const [room, setRoom] = useState<RoomSession | null>(storedRoomState?.room ?? null);
  const [matchTransition, setMatchTransition] = useState<MatchTransitionState | null>(null);
  const [guestMode, setGuestMode] = useState(readStoredGuestSession());
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountRestriction, setAccountRestriction] = useState<AccountRestriction>({
    status: "ok",
    reason: null,
    expiresAt: null,
  });

  const [reportsCount, setReportsCount] = useState(stored.reportsCount ?? 0);

  const [ratings, setRatings] = useState<RatingScore[]>(stored.ratings ?? []);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceMuted, setVoiceMutedState] = useState(false);
  const [voicePlaybackBlocked, setVoicePlaybackBlocked] = useState(false);
  const [voiceDiagnostics, setVoiceDiagnostics] = useState<VoiceTransmissionDiagnostics | null>(null);

  const [typingIndicator, setTypingIndicator] = useState<TypingIndicatorState | null>(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [reconnectEnabled, setReconnectEnabled] = useState(true);
  const [matchSoundEnabled, setMatchSoundEnabledState] = useState(stored.matchSoundEnabled ?? true);
  const [supporter, setSupporterState] = useState(readStoredSupporter());
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
  const voiceSessionTokenRef = useRef<string | null>(null);
  const voiceStartInFlightRef = useRef(false);
  const voiceReconnectAttemptedRoomIdRef = useRef<string | null>(null);
  const loggedRoomCreatedIdsRef = useRef<Set<string>>(new Set());
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const queueTimersRef = useRef<number[]>([]);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingIndicatorTimeoutRef = useRef<number | null>(null);
  const typingIsActiveRef = useRef(false);
  const mediaUploadCooldownRef = useRef(0);

  const mediaUploadCountRef = useRef(0);
  const mediaUploadInFlightRef = useRef(false);
  const contentCleanupIntervalRef = useRef<number | null>(null);
  const contentCleanupInFlightRef = useRef(false);

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

  const refreshBlockedUsers = useCallback(async () => {
    if (!userId) {
      setBlockedUserIds([]);
      setBlockedUsersLoaded(false);
      return [] as string[];
    }

    const blockedIds = await loadBlockedUserIds(userId);
    setBlockedUserIds(blockedIds);
    setBlockedUsersLoaded(true);
    writeStoredBlockedUsers(userId, blockedIds);
    return blockedIds;
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setBlockedUserIds([]);
      setBlockedUsersLoaded(false);
      return () => {
        cancelled = true;
      };
    }

    const hydrateBlockedUsers = async () => {
      try {
        const blockedIds = await loadBlockedUserIds(userId);
        if (cancelled) {
          return;
        }

        setBlockedUserIds(blockedIds);
        setBlockedUsersLoaded(true);
        writeStoredBlockedUsers(userId, blockedIds);
      } catch {
        if (cancelled) {
          return;
        }

        setBlockedUserIds(readStoredBlockedUsers(userId));
        setBlockedUsersLoaded(true);
      }
    };

    void hydrateBlockedUsers();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const stopVoiceChat = useCallback(() => {

    voiceSessionTokenRef.current = null;
    voiceStartInFlightRef.current = false;
    setVoicePlaybackBlocked(false);
    setVoiceDiagnostics(null);
    voiceControllerRef.current?.stop();
    voiceControllerRef.current = null;
    setVoiceState("idle");
  }, []);

  const setVoiceMuted = useCallback((muted: boolean) => {
    setVoiceMutedState(muted);
    if (voiceAudioRef.current) {
      voiceAudioRef.current.muted = muted;
    }
  }, []);

  const enableVoicePlayback = useCallback(async () => {
    const audioElement = voiceAudioRef.current;
    if (!audioElement) {
      return;
    }

    console.info("[rtc] manual audio enable requested");
    try {
      setVoiceMutedState(false);
      audioElement.muted = false;
      audioElement.volume = 1;
      await audioElement.play();
      setVoicePlaybackBlocked(false);
      console.info("[rtc] manual audio enable success");
    } catch (error) {
      console.info("[rtc] manual audio enable failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const setVoiceTransmissionEnabled = useCallback((enabled: boolean) => {
    const controller = voiceControllerRef.current;
    if (!controller) {
      return;
    }

    void controller.setLocalAudioEnabled(enabled).catch(() => undefined);
  }, []);

  const clearTypingIndicator = useCallback((reason = "manual") => {
    if (typingStopTimeoutRef.current !== null) {
      window.clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    if (typingIndicatorTimeoutRef.current !== null) {
      window.clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }

    typingIsActiveRef.current = false;
    setTypingIndicator(null);

  }, []);

  const syncTypingIndicatorFromRoom = useCallback(() => {
    const currentRoom = roomSnapshotRef.current;

    if (!currentRoom || currentRoom.status !== "active") {
      clearTypingIndicator("room-sync-clear");
      return;
    }

    if (!currentRoom.typingUserId || currentRoom.typingUserId === userId) {
      setTypingIndicator(null);
      return;
    }

    const updatedAt = currentRoom.typingUpdatedAt ?? new Date().toISOString();
    if (Date.now() - new Date(updatedAt).getTime() > 2000) {
      clearTypingIndicator("room-sync-stale");
      return;
    }

    setTypingIndicator({
      roomId: currentRoom.id,
      senderId: currentRoom.typingUserId,
      displayName: currentRoom.partner?.username ?? "Someone",
      updatedAt,
    });
  }, [clearTypingIndicator, userId]);

  const sendTypingState = useCallback(
    (typing: boolean, updatedAt = new Date().toISOString()) => {
      const currentRoom = roomSnapshotRef.current;
      const currentUser = userId;
      const channel = roomChannelRef.current;

      if (!currentRoom || !currentUser || (typing && currentRoom.status !== "active")) {
        return;
      }

      typingIsActiveRef.current = typing;

      void persistRoomTyping(currentRoom, typing ? currentUser : null, updatedAt).catch(() => undefined);

      setRoom((current) => {
        if (!current || current.id !== currentRoom.id) {
          return current;
        }

        return {
          ...current,
          typingUserId: typing ? currentUser : null,
          typingUpdatedAt: typing ? updatedAt : null,
        };
      });

      if (!typing) {
        clearTypingIndicator("local-stop");
      }

      if (!channel) {
        return;
      }

      void channel.send({
        type: "broadcast",
        event: typing ? "typing:start" : "typing:stop",
        payload: {
          roomId: currentRoom.id,
          userId: currentUser,
          updatedAt,
        },
      });

    },
    [clearTypingIndicator, userId],
  );

  useEffect(() => {

    queueSnapshotRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.muted = voiceMuted;
      voiceAudioRef.current.volume = voiceMuted ? 0 : 1;
    }
  }, [voiceMuted]);

  useEffect(() => {
    roomSnapshotRef.current = room;
  }, [room]);

  useEffect(() => {
    mediaUploadCooldownRef.current = 0;
    mediaUploadCountRef.current = 0;
  }, [room?.id]);

  useEffect(() => {
    if (!room?.rtcState || room.rtcState === "idle") {
      return;
    }

    setVoiceState((current) => (current === room.rtcState ? current : room.rtcState));
  }, [room?.rtcState]);

  useEffect(() => {
    if (!room?.endedAt) {
      return;
    }

    if (room.status === "active") {
      void logErrorEvent("unexpected_room_closure", {
        userId,
        roomId: room.id,
        severity: "warn",
        errorMessage: "Room ended unexpectedly.",
        properties: { voiceEnabled: room.voiceEnabled, rtcState: room.rtcState ?? "idle" },
      });
    }

    stopVoiceChat();
  }, [room?.endedAt, room?.id, room?.status, room?.voiceEnabled, room?.rtcState, stopVoiceChat, userId]);

  useEffect(() => {
    syncTypingIndicatorFromRoom();
  }, [room?.id, room?.status, room?.typingUpdatedAt, room?.typingUserId, syncTypingIndicatorFromRoom]);

  useEffect(() => {
    if (typingIndicatorTimeoutRef.current !== null) {
      window.clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }

    if (!typingIndicator) {
      return;
    }

    typingIndicatorTimeoutRef.current = window.setTimeout(() => {
      clearTypingIndicator("failsafe-timeout");
    }, 2000);

    return () => {
      if (typingIndicatorTimeoutRef.current !== null) {
        window.clearTimeout(typingIndicatorTimeoutRef.current);
        typingIndicatorTimeoutRef.current = null;
      }
    };
  }, [clearTypingIndicator, typingIndicator?.roomId, typingIndicator?.senderId, typingIndicator?.updatedAt]);

  useEffect(() => {

    if (voiceState === "failed" || voiceState === "error") {
      clearTypingIndicator("voice-failed");
    }
  }, [clearTypingIndicator, voiceState]);

  useEffect(() => {
    if (!online) {
      clearTypingIndicator("offline");
    }
  }, [clearTypingIndicator, online]);

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
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        language,
        authenticated,
        reportsCount,
        ratings,
        matchSoundEnabled,
      }),
    );
  }, [authenticated, language, matchSoundEnabled, ratings, reportsCount]);

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

      vibrate(8);

    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const initializeSession = async (sessionUser: { id: string; email?: string | null; is_anonymous?: boolean } | null) => {
      const isAnonymousSession = Boolean(sessionUser?.is_anonymous);

      setInitializing(true);
      setAppReady(false);
      setAuthLoaded(false);
      setRoomLoaded(false);
      setSessionReady(false);

      setAuthenticated(Boolean(sessionUser));
      setGuestMode(isAnonymousSession);
      setUserId(sessionUser?.id ?? null);

      if (!sessionUser) {
        hydratedSessionUserIdRef.current = null;
        stopQueueSubscriptions();
        stopRoomSubscriptions();
        matchedRoomIdsRef.current.clear();
        setGuestMode(false);
        setProfile(null);
        setRoom(null);
        setQueue(createInitialQueue(null));
        setMatchTransition(null);
        setVoiceState("idle");
        setVoiceDiagnostics(null);
        setIsAdmin(false);
        setAccountRestriction({ status: "ok", reason: null, expiresAt: null });
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
          await hydrateAuthenticatedUser(sessionUser.id, isAnonymousSession, sessionUser.email ?? null);
        }
      } catch {
        hydratedSessionUserIdRef.current = null;
        await supabase.auth.signOut();
        stopQueueSubscriptions();
        stopRoomSubscriptions();
        matchedRoomIdsRef.current.clear();
        setAuthenticated(false);
        setGuestMode(false);
        setUserId(null);
        setProfile(null);
        setRoom(null);
        setQueue(createInitialQueue(null));
        setMatchTransition(null);
        setVoiceState("idle");
        setVoiceDiagnostics(null);
        setIsAdmin(false);
        setAccountRestriction({ status: "ok", reason: null, expiresAt: null });
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
        void logAnalyticsEvent("reconnect_failed", {
          userId,
          properties: { channel: "presence", status },
        });
        void logErrorEvent("websocket_disconnect", {
          userId,
          severity: "warn",
          errorMessage: `Presence channel status: ${status}`,
          properties: { channel: "presence", status },
        });
        return;
      }

      void logAnalyticsEvent("reconnect_success", {
        userId,
        properties: { channel: "presence" },
      });

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
    const handleVisibilityChange = () => {
      const channel = presenceChannelRef.current;
      if (!channel || !authenticated || !sessionReady || !userId || initializing) {
        return;
      }

      if (document.visibilityState === "hidden") {
        void channel.untrack?.();
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
    };

    const handlePageShow = () => {
      handleVisibilityChange();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [authenticated, initializing, sessionReady, userId]);

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
    if (!authenticated || !sessionReady || !userId) {
      if (contentCleanupIntervalRef.current) {
        window.clearInterval(contentCleanupIntervalRef.current);
        contentCleanupIntervalRef.current = null;
      }
      return;
    }

    const runCleanup = () => {
      if (contentCleanupInFlightRef.current) {
        return;
      }

      contentCleanupInFlightRef.current = true;
      void cleanupExpiredEphemeralContent()
        .then((result) => {
          if (result) {
            console.info("[media] cleanup success", result);
          }
        })

        .catch(() => undefined)
        .finally(() => {
          contentCleanupInFlightRef.current = false;
        });
    };

    runCleanup();
    contentCleanupIntervalRef.current = window.setInterval(runCleanup, EPHEMERAL_CONTENT_CLEANUP_INTERVAL_MS);

    return () => {
      if (contentCleanupIntervalRef.current) {
        window.clearInterval(contentCleanupIntervalRef.current);
        contentCleanupIntervalRef.current = null;
      }
    };
  }, [authenticated, sessionReady, userId]);

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
    if (!room?.id || !reconnectEnabled || !hasSupabaseConfig) {
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
            rtcState: latestRoom.rtcState ?? current.rtcState,
            rtcConnectionId: latestRoom.rtcConnectionId ?? current.rtcConnectionId,
            rtcUpdatedAt: latestRoom.rtcUpdatedAt ?? current.rtcUpdatedAt,
            voiceUnlockedAt: latestRoom.voiceUnlockedAt ?? current.voiceUnlockedAt,
            typingUserId: latestRoom.typingUserId ?? current.typingUserId,
            typingUpdatedAt: latestRoom.typingUpdatedAt ?? current.typingUpdatedAt,
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
  }, [reconnectEnabled, room?.id]);

  async function hydrateAuthenticatedUser(currentUserId: string, isAnonymousSession: boolean, email: string | null) {
    const loadedProfile = await loadProfile(currentUserId);
    const storedGuestProfile = readStoredGuestProfile();
    const profileToUse: PresenceProfile =
      loadedProfile
        ? !isAnonymousSession && (loadedProfile.profileMode !== "registered" || loadedProfile.email !== email)
          ? promoteGuestProfile(loadedProfile, currentUserId, email ?? loadedProfile.email ?? null)
          : { ...loadedProfile, email: email ?? loadedProfile.email }
        : storedGuestProfile
          ? isAnonymousSession
            ? {
                ...storedGuestProfile,
                id: currentUserId,
                email: null,
                profileMode: "guest",
              }
            : promoteGuestProfile(storedGuestProfile, currentUserId, email ?? storedGuestProfile.email ?? null)
          : createDefaultProfile(currentUserId, isAnonymousSession ? "guest" : "registered", email);
    const profileWithAvatar = ensureProfileAvatar(profileToUse);

    setIsAdmin(profileWithAvatar.role === "admin");
    setAccountRestriction(await loadModerationState(currentUserId).catch(() => ({ status: "ok" as const, reason: null, expiresAt: null })));

    setProfile(profileWithAvatar);
    setQueue((current) => ({
      ...current,
      filters: {
        preference: profileWithAvatar.preference,
        language: profileWithAvatar.language,
      },
    }));

    if (!loadedProfile || profileWithAvatar.profileMode !== loadedProfile.profileMode || profileWithAvatar.avatarEmoji !== loadedProfile.avatarEmoji || profileWithAvatar.email !== loadedProfile.email) {
      await syncProfile(profileWithAvatar);
    }

    if (!isAnonymousSession) {
      writeStoredGuestSession(false);
      writeStoredGuestProfile(null);
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
      setQueue(createInitialQueue(profileWithAvatar));
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
    const partnerId = nextRoom.userA === currentUserId ? nextRoom.userB : nextRoom.userA;
    const loadedPartner = partnerId ? await loadProfile(partnerId) : null;
    const partnerProfile = loadedPartner ? ensureProfileAvatar(loadedPartner) : null;

    setRoom({
      ...nextRoom,
      partner: partnerProfile
        ? {
            id: partnerProfile.id,
            username: partnerProfile.username,
            avatarEmoji: partnerProfile.avatarEmoji,
            avatarUrl: partnerProfile.avatarUrl,
            ageRange: partnerProfile.ageRange,
            gender: partnerProfile.gender,
            language: partnerProfile.language,
            interests: partnerProfile.interests,
          }
        : null,
      messages: messages.length
        ? messages
        : [createSystemMessage(nextRoom.id, language === "en" ? "Connection opened. Stay curious and respectful." : "Η σύνδεση άνοιξε. Μείνε περίεργος και με σεβασμό.")],
      status: nextRoom.endedAt ? "ended" : "active",
    });
  }

  function stopRoomSubscriptions() {
    if (typingIsActiveRef.current) {
      void sendTypingState(false, new Date().toISOString());
    }

    roomChannelRef.current?.unsubscribe();
    roomChannelRef.current = null;
    clearTypingIndicator("room-stop");
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
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void logAnalyticsEvent("reconnect_success", {
            userId: currentUserId,
            properties: { channel: "queue" },
          });
          return;
        }

        void logAnalyticsEvent("reconnect_failed", {
          userId: currentUserId,
          properties: { channel: "queue", status },
        });
        void logErrorEvent("websocket_disconnect", {
          userId: currentUserId,
          severity: "warn",
          errorMessage: `Queue channel status: ${status}`,
          properties: { channel: "queue", status },
        });
      });

    queueChannelRef.current = channel;
  }

  async function attemptRealtimeMatch(currentUserId: string, relaxed = false, force = false) {
    if (!authenticated || !profile || !blockedUsersLoaded || room || (!queue.active && !force) || matchmakingInFlightRef.current) {
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

      if (match.partnerId && blockedUserIds.includes(match.partnerId)) {
        if (match.roomId) {
          const blockedRoom = (await loadRoomById(match.roomId)) as RoomRecord | null;
          if (blockedRoom && !blockedRoom.endedAt) {
            const endedAt = new Date().toISOString();
            const endedBlockedRoom: RoomSession = {
              id: blockedRoom.id,
              userA: blockedRoom.userA,
              userB: blockedRoom.userB,
              startedAt: blockedRoom.startedAt,
              endedAt,
              voiceEnabled: blockedRoom.voiceEnabled,
              rtcState: blockedRoom.rtcState ?? "idle",
              rtcConnectionId: blockedRoom.rtcConnectionId ?? null,
              rtcUpdatedAt: blockedRoom.rtcUpdatedAt ?? null,
              voiceUnlockedAt: blockedRoom.voiceUnlockedAt ?? null,
              status: "ended",
              partner: null,
              messages: [],
              typingUserId: blockedRoom.typingUserId ?? null,
              typingUpdatedAt: blockedRoom.typingUpdatedAt ?? null,
            };
            void endRoom(endedBlockedRoom);
            void persistRoom(endedBlockedRoom);
          }
        }
        return;
      }

      if (matchedRoomIdsRef.current.has(match.roomId)) {
        return;
      }

      let activeRoom: RoomRecord | null = (await loadRoomById(match.roomId)) as RoomRecord | null;
      if (!activeRoom) {
        activeRoom = (await loadActiveRoomForUser(currentUserId)) as RoomRecord | null;
      }

      if (!activeRoom || activeRoom.endedAt || (activeRoom.userA !== currentUserId && activeRoom.userB !== currentUserId)) {
        return;
      }

      matchedRoomIdsRef.current.add(activeRoom.id);
      stopQueueSubscriptions();
      setMatchTransition({
        roomId: activeRoom.id,
        secondsLeft: 3,
      });

      playSoundFeedback("match", matchSoundEnabled);

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

  function subscribeToRoom(roomId: string, currentUserId: string) {
    stopRoomSubscriptions();

    const channel = supabase
      .channel(`presence-room-${roomId}`, {
        config: {
          broadcast: {
            self: false,
            ack: true,
          },
        },
      })
      .on("broadcast", { event: "typing:start" }, (payload) => {
        const nextTyping = ((payload as { payload?: unknown })?.payload ?? payload) as {
          roomId?: string;
          userId?: string;
          updatedAt?: string;
        } | null;
        const currentRoom = roomSnapshotRef.current;

        if (!currentRoom || currentRoom.id !== roomId || !nextTyping || nextTyping.roomId !== roomId || !nextTyping.userId || nextTyping.userId === currentUserId) {
          return;
        }

        setTypingIndicator({
          roomId: currentRoom.id,
          senderId: nextTyping.userId,
          displayName: currentRoom.partner?.username ?? "Someone",
          updatedAt: nextTyping.updatedAt ?? new Date().toISOString(),
        });
      })
      .on("broadcast", { event: "typing:stop" }, (payload) => {
        const nextTyping = ((payload as { payload?: unknown })?.payload ?? payload) as {
          roomId?: string;
          userId?: string;
        } | null;
        const currentRoom = roomSnapshotRef.current;

        if (!currentRoom || currentRoom.id !== roomId || !nextTyping || nextTyping.roomId !== roomId || !nextTyping.userId || nextTyping.userId === currentUserId) {
          return;
        }

        clearTypingIndicator("broadcast-stop");
      })

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {

        const inserted = payload.new as {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          type: "text" | "system" | "media";
          media_url: string | null;
          media_path: string | null;
          media_bucket: string | null;
          media_mime_type: string | null;
          media_name: string | null;
          media_size: number | null;
          media_duration_seconds: number | null;
          media_width: number | null;
          media_height: number | null;
          expires_at: string | null;
          media_consumed_at: string | null;
        };

        setRoom((current) => {
          if (!current || current.id !== roomId) {
            return current;
          }

          if (current.messages.some((message) => message.id === inserted.id)) {
            return current;
          }

          if (inserted.type === "media" && inserted.media_path && inserted.media_mime_type && inserted.media_name && inserted.media_size !== null) {
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
                  expiresAt: inserted.expires_at ?? undefined,
                  type: "media",
                  mediaConsumedAt: inserted.media_consumed_at ?? undefined,
                  media: {
                    url: inserted.media_url,
                    path: inserted.media_path,
                    bucket: inserted.media_bucket ?? MEDIA_UPLOAD_BUCKET,
                    mimeType: inserted.media_mime_type,
                    name: inserted.media_name,
                    size: Number(inserted.media_size),
                    kind: (inserted.media_mime_type.startsWith("audio/")
                      ? "audio"
                      : inserted.media_mime_type.startsWith("video/")
                        ? "video"
                        : "image") as "image" | "audio" | "video",

                    durationSeconds: inserted.media_duration_seconds ?? undefined,
                    width: inserted.media_width ?? undefined,
                    height: inserted.media_height ?? undefined,
                  },
                },
              ],
            };
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
                expiresAt: inserted.expires_at ?? undefined,
                type: (inserted.type as "text" | "system") ?? "text",
              },
            ],
          };
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          type: "text" | "system" | "media";
          media_url: string | null;
          media_path: string | null;
          media_bucket: string | null;
          media_mime_type: string | null;
          media_name: string | null;
          media_size: number | null;
          media_duration_seconds: number | null;
          media_width: number | null;
          media_height: number | null;
          expires_at: string | null;
          media_consumed_at: string | null;
        };

        setRoom((current) => {
          if (!current || current.id !== roomId) {
            return current;
          }

          const nextMessages = current.messages.map((message) => {
            if (message.id !== updated.id) {
              return message;
            }

            if (updated.type === "media" && updated.media_path && updated.media_mime_type && updated.media_name && updated.media_size !== null) {
              return {
                ...message,
                content: updated.content,
                createdAt: updated.created_at,
                expiresAt: updated.expires_at ?? undefined,
                mediaConsumedAt: updated.media_consumed_at ?? undefined,
                media: {
                  url: updated.media_url ?? (message.type === "media" ? message.media.url : null),

                  path: updated.media_path,
                  bucket: updated.media_bucket ?? MEDIA_UPLOAD_BUCKET,
                  mimeType: updated.media_mime_type,
                  name: updated.media_name,
                  size: Number(updated.media_size),
                  kind: (updated.media_mime_type.startsWith("audio/")
                    ? "audio"
                    : updated.media_mime_type.startsWith("video/")
                      ? "video"
                      : "image") as "image" | "audio" | "video",

                  durationSeconds: updated.media_duration_seconds ?? undefined,
                  width: updated.media_width ?? undefined,
                  height: updated.media_height ?? undefined,
                },
              };
            }

            return {
              ...message,
              content: updated.content,
              createdAt: updated.created_at,
              expiresAt: updated.expires_at ?? undefined,
            };
          });

          return {
            ...current,
            messages: nextMessages,
          };
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const deleted = payload.old as { id?: string } | null;
        if (!deleted?.id) {
          return;
        }

        setRoom((current) => {
          if (!current || current.id !== roomId) {
            return current;
          }

          return {
            ...current,
            messages: current.messages.filter((message) => message.id !== deleted.id),
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
          rtc_state: RoomSession["rtcState"] | null;
          rtc_connection_id: string | null;
          rtc_updated_at: string | null;
          voice_unlocked_at: string | null;
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
            rtcState: updated.rtc_state ?? current.rtcState,
            rtcConnectionId: updated.rtc_connection_id,
            rtcUpdatedAt: updated.rtc_updated_at,
            voiceUnlockedAt: updated.voice_unlocked_at,
            typingUserId: updated.typing_user_id,
            typingUpdatedAt: updated.typing_updated_at,
            status: updated.ended_at ? "ended" : "active",
          };
        });
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void logAnalyticsEvent("reconnect_success", {
            userId: currentUserId,
            roomId,
            properties: { channel: "room" },
          });
          return;
        }

        void logAnalyticsEvent("reconnect_failed", {
          userId: currentUserId,
          roomId,
          properties: { channel: "room", status },
        });
        void logErrorEvent("websocket_disconnect", {
          userId: currentUserId,
          roomId,
          severity: "warn",
          errorMessage: `Room channel status: ${status}`,
          properties: { channel: "room", status },
        });
      });

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
      rtcState: roomBase.rtcState ?? "idle",
      rtcConnectionId: roomBase.rtcConnectionId ?? null,
      rtcUpdatedAt: roomBase.rtcUpdatedAt ?? null,
      voiceUnlockedAt: roomBase.voiceUnlockedAt ?? null,
      status: roomBase.endedAt ? "ended" : "active",
      partner: null,
      messages: [],
      typingUserId: roomBase.typingUserId ?? null,
      typingUpdatedAt: roomBase.typingUpdatedAt ?? null,
    };

    if (!loggedRoomCreatedIdsRef.current.has(roomSession.id)) {
      loggedRoomCreatedIdsRef.current.add(roomSession.id);
      void logAnalyticsEvent("room_created", {
        userId: currentUserId,
        roomId: roomSession.id,
        properties: {
          active: roomSession.status === "active",
        },
      });
    }

    setRoom(roomSession);
    await hydrateRoomPartner(roomSession, currentUserId);
    subscribeToRoom(roomId, currentUserId);

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
  }, [authenticated, blockedUserIds, blockedUsersLoaded, profile, queue.active, queue.joinedAt, room?.id, userId]);

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
    async (method: AuthMethod) => {
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
      }
    },
    [language],
  );

  const logout = useCallback(async () => {
    stopVoiceChat();
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
    setVoiceDiagnostics(null);
    setIsAdmin(false);
    setGuestMode(false);
    writeStoredGuestSession(false);
    writeStoredGuestProfile(null);

    void supabase.auth.signOut();

    setAuthenticated(false);
    setUserId(null);
    setProfile(null);
    toast(copy.misc.signedOut);
  }, [copy.misc.signedOut, profile, stopVoiceChat]);


  const rerollUsername = useCallback(() => {}, []);

  const setSupporter = useCallback((enabled: boolean) => {
    setSupporterState(enabled);
    writeStoredSupporter(enabled);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<PresenceProfile>) => {
      const safeUpdates = { ...updates };
      delete safeUpdates.username;
      setProfile((current) => {
        const nextProfile = {
          ...(current ?? createDefaultProfile(userId ?? undefined, guestMode ? "guest" : "registered", current?.email ?? null)),
          ...safeUpdates,
          updatedAt: new Date().toISOString(),
        };
        void syncProfile(nextProfile);
        return nextProfile;
      });
      if (safeUpdates.preference || safeUpdates.language) {
        setQueue((current) => ({
          ...current,
          filters: {
            preference: (safeUpdates.preference as QueueFilters["preference"]) ?? current.filters.preference,
            language: (safeUpdates.language as QueueFilters["language"]) ?? current.filters.language,
          },
        }));
      }
      toast(copy.misc.profileSaved);
    },
    [copy.misc.profileSaved, guestMode, userId],
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

    const activeProfile = profile ?? (userId ? createDefaultProfile(userId, guestMode ? "guest" : "registered", profile?.email ?? null) : null);

    if (!activeProfile) {
      return;
    }

    if (!profile) {
      setProfile(activeProfile);
      await syncProfile(activeProfile);
    }

    if (accountRestriction.status === "suspended") {
      toast.error(
        accountRestriction.reason ??
          (language === "en"
            ? "Your account is temporarily paused from joining rooms."
            : "Ο λογαριασμός σου έχει προσωρινά παγώσει από τα rooms."),
      );
      return;
    }

    if (accountRestriction.status === "banned") {
      toast.error(
        accountRestriction.reason ??
          (language === "en"
            ? "Your account can’t enter matchmaking."
            : "Ο λογαριασμός σου δεν μπορεί να μπει στο matchmaking."),
      );
      return;
    }

    const safety = await recordSafetyEvent("queue_join", null, null, {

      preference: activeProfile.preference,
      language: activeProfile.language,
    });
    if (!safety.allowed) {
      toast.error(language === "en" ? "Please wait a moment before starting another room." : "Περίμενε λίγο πριν ξεκινήσεις άλλο room.");
      return;
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
  }, [authenticated, hapticsEnabled, language, profile, userId]);

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

  useEffect(() => {
    if (queue.active && (accountRestriction.status === "suspended" || accountRestriction.status === "banned")) {
      void cancelQueue().catch(() => undefined);
    }
  }, [accountRestriction.status, cancelQueue, queue.active]);

  const unlockVoice = useCallback(() => {

    let nextRoom: RoomSession | null = null;

    setRoom((current) => {
      if (!current || current.voiceEnabled) {
        return current;
      }

      const unlockedAt = new Date().toISOString();
      nextRoom = {
        ...current,
        voiceEnabled: true,
        voiceUnlockedAt: unlockedAt,
      };
      return nextRoom;
    });

    if (!nextRoom) {
      return;
    }

    void persistRoom(nextRoom);
    void logAnalyticsEvent("voice_unlocked", {
      userId,
      roomId: nextRoom.id,
      properties: {
        startedAt: nextRoom.startedAt,
      },
    });
    toast.success(copy.session.voiceUnlocked);
    playSoundFeedback("unlock", matchSoundEnabled);
  }, [copy.session.voiceUnlocked, matchSoundEnabled, userId]);
  const sendMessage = useCallback(
    async (content: string) => {
      if (!room || !profile || !content.trim()) {
        return false;
      }

      const textGate = createFeatureGateSnapshot(room.startedAt, room.status)[FeatureGateKey.RealtimeTextChat];
      if (!textGate.unlocked) {
        console.info("[gate] feature locked", {
          feature: FeatureGateKey.RealtimeTextChat,
          roomId: room.id,
        });
        return false;
      }

      const safety = await recordSafetyEvent("text_send", room.id, null, { length: content.trim().length });
      if (!safety.allowed) {
        toast.error(language === "en" ? "Slow down a little." : "Πήγαινε λίγο πιο αργά.");
        return false;
      }

      const createdAt = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: createId(),
        roomId: room.id,
        senderId: profile.id,
        content: content.trim(),
        createdAt,
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
      if (typingIsActiveRef.current) {
        void sendTypingState(false, createdAt);
      }
      return true;
    },
    [language, profile, room, sendTypingState],
  );

  const sendMediaMessage = useCallback(async ({ file, caption, preview }: { file: File; caption: string; preview: MediaPreviewData }) => {
    const currentRoom = roomSnapshotRef.current;
    const currentUser = userId;
    if (!currentRoom || !currentUser) {
      return;
    }

    const featureGates = createFeatureGateSnapshot(currentRoom.startedAt, currentRoom.status);
    const mediaGate =
      preview.kind === "image"
        ? featureGates[FeatureGateKey.ImageSending]
        : preview.kind === "audio"
          ? featureGates[FeatureGateKey.AudioContentSending]
          : featureGates[FeatureGateKey.EphemeralContent];

    if (!mediaGate.unlocked) {
      console.info("[media] upload failed", {
        roomId: currentRoom.id,
        userId: currentUser,
        reason: "blocked",
        feature: mediaGate.key,
        status: mediaGate.status,
      });
      void logAnalyticsEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          reason: "blocked",
        },
      });
      void logErrorEvent("permission_denied", {
        userId: currentUser,
        roomId: currentRoom.id,
        severity: "warn",
        errorMessage: "Media sharing is not available yet.",
        properties: {
          kind: preview.kind,
          reason: "blocked",
        },
      });
      throw new Error("Media sharing is not available yet.");
    }

    const isValidType = preview.kind === "image"
      ? isSupportedImageType(file.type)
      : preview.kind === "audio"
        ? isSupportedAudioType(file.type)
        : isSupportedVideoType(file.type);

    const isValidSize = preview.kind === "image"
      ? file.size <= MAX_IMAGE_SIZE_BYTES
      : preview.kind === "audio"
        ? file.size <= 12 * 1024 * 1024
        : file.size <= MAX_VIDEO_SIZE_BYTES;
    const isValidDuration = preview.kind === "video" ? (preview.durationSeconds ?? 0) <= MAX_VIDEO_DURATION_SECONDS : true;

    if (!isValidType || !isValidSize || !isValidDuration) {
      console.info("[media] upload failed", {
        roomId: currentRoom.id,
        userId: currentUser,
        reason: "validation",
      });
      void logAnalyticsEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          reason: "validation",
        },
      });
      void logErrorEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        severity: "warn",
        errorMessage: "Unsupported media file.",
        properties: {
          kind: preview.kind,
          reason: "validation",
        },
      });
      throw new Error("Unsupported media file.");
    }

    const now = Date.now();

    if (mediaUploadInFlightRef.current) {
      console.info("[media] upload failed", {
        roomId: currentRoom.id,
        userId: currentUser,
        reason: "in-flight",
      });
      void logAnalyticsEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          reason: "in-flight",
        },
      });
      void logErrorEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        severity: "warn",
        errorMessage: "A media upload is already in progress.",
        properties: {
          kind: preview.kind,
          reason: "in-flight",
        },
      });
      throw new Error("A media upload is already in progress.");
    }

    if (mediaUploadCooldownRef.current && now - mediaUploadCooldownRef.current < MEDIA_UPLOAD_COOLDOWN_MS) {
      console.info("[media] upload failed", {
        roomId: currentRoom.id,
        userId: currentUser,
        reason: "cooldown",
      });
      void logAnalyticsEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          reason: "cooldown",
        },
      });
      void logErrorEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        severity: "warn",
        errorMessage: "Please wait a moment before sending another media item.",
        properties: {
          kind: preview.kind,
          reason: "cooldown",
        },
      });
      throw new Error("Please wait a moment before sending another media item.");
    }

    if (mediaUploadCountRef.current >= MAX_MEDIA_MESSAGES_PER_SESSION) {
      console.info("[media] upload failed", {
        roomId: currentRoom.id,
        userId: currentUser,
        reason: "limit-reached",
      });
      void logAnalyticsEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          reason: "limit-reached",
        },
      });
      void logErrorEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        severity: "warn",
        errorMessage: "Media sharing limit reached for this session.",
        properties: {
          kind: preview.kind,
          reason: "limit-reached",
        },
      });
      throw new Error("Media sharing limit reached for this session.");
    }

    const safety = await recordSafetyEvent("media_upload", currentRoom.id, null, {
      kind: preview.kind,
      size: file.size,
    });
    if (!safety.allowed) {
      console.info("[media] upload failed", {
        roomId: currentRoom.id,
        userId: currentUser,
        reason: "rate-limited",
      });
      void logAnalyticsEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          reason: "rate-limited",
        },
      });
      void logErrorEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        severity: "warn",
        errorMessage: "Please wait a moment before sending another media item.",
        properties: {
          kind: preview.kind,
          reason: "rate-limited",
        },
      });
      throw new Error("Please wait a moment before sending another media item.");
    }

    console.info("[media] upload started", {

      roomId: currentRoom.id,
      userId: currentUser,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      kind: preview.kind,
    });
    void logAnalyticsEvent("upload_started", {
      userId: currentUser,
      roomId: currentRoom.id,
      properties: {
        kind: preview.kind,
        size: file.size,
      },
    });

    mediaUploadInFlightRef.current = true;
    try {
      const uploadPath = `${currentUser}/${currentRoom.id}/${Date.now()}-${sanitizeMediaFileName(preview.displayName)}`;
      const { error: uploadError } = await supabase.storage.from(MEDIA_UPLOAD_BUCKET).upload(uploadPath, file, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      const localPreviewUrl = URL.createObjectURL(file);
      const createdAt = new Date().toISOString();
      const messageId = createId();
      const mediaMessage: ChatMessage = {
        id: messageId,
        roomId: currentRoom.id,
        senderId: currentUser,
        content: caption.trim() || (preview.kind === "image" ? "Photo" : preview.kind === "audio" ? "Audio" : "Video"),
        createdAt,
        expiresAt: getEphemeralContentExpiresAt(createdAt),
        type: "media",
        mediaConsumedAt: null,
        media: {
          url: localPreviewUrl,
          path: uploadPath,
          bucket: MEDIA_UPLOAD_BUCKET,
          mimeType: file.type,
          name: preview.displayName,
          size: file.size,
          kind: preview.kind,
          durationSeconds: preview.durationSeconds,
          width: preview.width,
          height: preview.height,
        },
      };

      const storedMediaMessage: ChatMessage = {
        ...mediaMessage,
        media: {
          ...mediaMessage.media,
          url: null,
        },
      };

      setRoom((current) =>
        current && current.id === currentRoom.id
          ? {
              ...current,
              messages: current.messages.some((message) => message.id === mediaMessage.id)
                ? current.messages
                : [...current.messages, mediaMessage],
            }
          : current,
      );

      await persistMessage(storedMediaMessage);
      mediaUploadCooldownRef.current = Date.now();
      mediaUploadCountRef.current += 1;

      console.info("[media] upload success", {
        roomId: currentRoom.id,
        userId: currentUser,
        messageId: mediaMessage.id,
        kind: preview.kind,
      });
      void logAnalyticsEvent("upload_success", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          size: file.size,
        },
      });
      playSoundFeedback("content-reveal", matchSoundEnabled);

    } catch (error) {
      console.info("[media] upload failed", {
        roomId: currentRoom.id,
        userId: currentUser,
        error: error instanceof Error ? error.message : String(error),
      });
      void logAnalyticsEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        properties: {
          kind: preview.kind,
          size: file.size,
        },
      });
      void logErrorEvent("upload_failed", {
        userId: currentUser,
        roomId: currentRoom.id,
        severity: "error",
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        properties: {
          kind: preview.kind,
          size: file.size,
        },
      });
      throw error;
    } finally {

      mediaUploadInFlightRef.current = false;
    }
  }, [userId]);

  const appendSystemMessage = useCallback((content: string) => {
    const currentRoom = roomSnapshotRef.current;
    if (!currentRoom) {
      return;
    }

    setRoom((current) => {
      if (!current || current.id !== currentRoom.id) {
        return current;
      }

      const systemMessage = createSystemMessage(currentRoom.id, content);
      if (current.messages.some((message) => message.type === "system" && message.content === content)) {
        return current;
      }

      return {
        ...current,
        messages: [...current.messages, systemMessage],
      };
    });
  }, []);

  const startVoiceChat = useCallback(

    async () => {
      if (!room || !userId || voiceStartInFlightRef.current) {
        return;
      }

      const sessionToken = createId();
      voiceSessionTokenRef.current = sessionToken;
      voiceStartInFlightRef.current = true;
      setVoicePlaybackBlocked(false);
      setVoiceMutedState(false);
      voiceControllerRef.current?.stop();

      voiceControllerRef.current = null;
      setVoiceDiagnostics(null);
      setVoiceState("requesting-microphone");

      toast(copy.session.voiceStarting);

      try {
        const audioElement = voiceAudioRef.current;
        if (!audioElement) {
          throw new Error("Audio element is unavailable");
        }

        const controller = await createPeerToPeerVoiceSession({
          audioElement,
          roomId: room.id,
          currentUserId: userId,
          userA: room.userA,
          userB: room.userB,
          connectionId: room.rtcConnectionId ?? null,
          roomRtcUpdatedAt: room.rtcUpdatedAt ?? null,
          isCurrentSession: () => voiceSessionTokenRef.current === sessionToken,

          onStateChange: (nextState) => {
            if (voiceSessionTokenRef.current !== sessionToken) {
              return;
            }

            setVoiceState(nextState);

            if (nextState === "connected") {
              toast.success(copy.session.connected);
              void logAnalyticsEvent("reconnect_success", {
                userId,
                roomId: room.id,
                properties: { channel: "rtc" },
              });
              if (hapticsEnabled) {
                vibrate([40, 30, 60]);
              }
            }

            if (nextState === "failed") {
              void logAnalyticsEvent("reconnect_failed", {
                userId,
                roomId: room.id,
                properties: { channel: "rtc", state: nextState },
              });
              void logErrorEvent("rtc_failure", {
                userId,
                roomId: room.id,
                severity: "warn",
                errorMessage: language === "en" ? "Voice connection failed." : "Η σύνδεση φωνής απέτυχε.",
                properties: { state: nextState, channel: "rtc" },
              });
              toast.error(language === "en" ? "Voice connection failed." : "Η σύνδεση φωνής απέτυχε.");
            }

            if (nextState === "error") {
              void logAnalyticsEvent("reconnect_failed", {
                userId,
                roomId: room.id,
                properties: { channel: "rtc", state: nextState },
              });
              void logErrorEvent("rtc_failure", {
                userId,
                roomId: room.id,
                severity: "error",
                errorMessage: language === "en" ? "Voice playback or microphone setup failed." : "Η ρύθμιση φωνής ή αναπαραγωγής απέτυχε.",
                properties: { state: nextState, channel: "rtc" },
              });
              toast.error(language === "en" ? "Voice playback or microphone setup failed." : "Η ρύθμιση φωνής ή αναπαραγωγής απέτυχε.");
            }
          },
          onPlaybackFailure: () => {
            if (voiceSessionTokenRef.current !== sessionToken) {
              return;
            }

            setVoicePlaybackBlocked(true);
          },
          onDiagnosticsChange: (diagnostics) => {
            if (voiceSessionTokenRef.current !== sessionToken) {
              return;
            }

            setVoiceDiagnostics(diagnostics);
          },
        });

        if (voiceSessionTokenRef.current !== sessionToken) {
          controller.stop();
          return;
        }

        voiceControllerRef.current = controller;
        void voiceControllerRef.current.setLocalAudioEnabled(false).catch(() => undefined);

      } catch (error) {

        if (voiceSessionTokenRef.current !== sessionToken) {
          return;
        }

        setVoiceState("error");
        const errorMessage =
          error instanceof DOMException
            ? error.name === "NotAllowedError"
              ? language === "en"
                ? "Microphone permission was not granted."
                : "Δεν δόθηκε άδεια στο μικρόφωνο."
              : error.name === "NotFoundError"
                ? language === "en"
                  ? "No microphone was found."
                  : "Δεν βρέθηκε μικρόφωνο."
                : error.message
            : error instanceof Error
              ? error.message
              : language === "en"
                ? "Voice could not start."
                : "Η φωνή δεν μπόρεσε να ξεκινήσει.";
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          void logErrorEvent("permission_denied", {
            userId,
            roomId: room.id,
            severity: "warn",
            error,
            errorMessage,
            properties: { feature: "microphone" },
          });
        } else {
          void logErrorEvent("rtc_failure", {
            userId,
            roomId: room.id,
            severity: "error",
            error,
            errorMessage,
            properties: { feature: "voice" },
          });
        }
        toast.error(errorMessage);
      } finally {
        if (voiceSessionTokenRef.current === sessionToken) {
          voiceStartInFlightRef.current = false;
        }
      }
    },
    [copy.session.connected, copy.session.voiceStarting, hapticsEnabled, language, room, userId],
  );

  useEffect(() => {
    if (!room || !room.voiceEnabled || room.status !== "active") {
      voiceReconnectAttemptedRoomIdRef.current = null;
      return;
    }

    if (voiceControllerRef.current || voiceStartInFlightRef.current || voiceState !== "idle") {
      return;
    }

    const shouldReconnect =
      room.voiceUnlockedAt || room.rtcState === "connected" || room.rtcState === "connecting" || room.rtcState === "reconnecting";
    if (!shouldReconnect || voiceReconnectAttemptedRoomIdRef.current === room.id) {
      return;
    }

    voiceReconnectAttemptedRoomIdRef.current = room.id;
    void startVoiceChat().catch(() => undefined);
  }, [room, startVoiceChat, voiceState]);

  const leaveRoom = useCallback(
    (reason?: string) => {
      stopVoiceChat();
      clearTypingIndicator("room-leave");
      if (typingIsActiveRef.current) {
        void sendTypingState(false, new Date().toISOString());
      }
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
    [clearTypingIndicator, profile, room, sendTypingState, stopVoiceChat],
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
      await persistReport(room.id, userId, partnerId, reason);
      setReportsCount((current) => current + 1);
      toast.success(copy.misc.reported);
      leaveRoom(language === "en" ? "Conversation ended after a report." : "Η συνομιλία ολοκληρώθηκε μετά από αναφορά.");
    },
    [copy.misc.reported, language, leaveRoom, room, userId],
  );

  const blockCurrentPartner = useCallback(async () => {
    if (!room || !userId) {
      return;
    }

    const partnerId = room.userA === userId ? room.userB : room.userA;
    const nextBlockedIds = blockedUserIds.includes(partnerId) ? blockedUserIds : [...blockedUserIds, partnerId];

    setBlockedUserIds(nextBlockedIds);
    setBlockedUsersLoaded(true);
    writeStoredBlockedUsers(userId, nextBlockedIds);

    let blockPersisted = false;
    try {
      await persistBlock(room.id, userId, partnerId);
      blockPersisted = true;
      await refreshBlockedUsers();
    } catch {
      // Guest sessions and transient auth failures still get a local block.
    }

    if (!blockPersisted) {
      setBlockedUserIds(nextBlockedIds);
      setBlockedUsersLoaded(true);
      writeStoredBlockedUsers(userId, nextBlockedIds);
    }

    toast.success(copy.misc.blocked);
    leaveRoom(language === "en" ? "Connection closed and partner blocked." : "Η σύνδεση έκλεισε και ο χρήστης μπλοκαρίστηκε.");
  }, [blockedUserIds, copy.misc.blocked, language, leaveRoom, refreshBlockedUsers, room, userId]);

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
      voiceMuted,
      voicePlaybackBlocked,
      voiceDiagnostics,
      typingIndicator,

      online,

      hapticsEnabled,

      reconnectEnabled,
      matchSoundEnabled,
      supporter,
      setSupporter,
      initializing,
      authLoaded,
      roomLoaded,
      appReady,
      sessionReady,
      presenceStats,
      adminMetrics,
      userId,
      isAdmin,
      blockedUserCount: blockedUserIds.length,
      blockedUserIds,
      accountRestriction,

      login,

      logout,
      rerollUsername,
      updateProfile,
      startQueue,
      cancelQueue,
      unlockVoice,
      sendMessage,
      sendMediaMessage,
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
      enableVoicePlayback,
      setVoiceMuted,
      setVoiceTransmissionEnabled,
      sendTypingState,
      appendSystemMessage,
      startNewSessionFromEndedRoom,

    }),

    [
      adminMetrics,
      appReady,
      authenticated,
      blockCurrentPartner,
      blockedUserIds.length,
      accountRestriction,
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
      sendMediaMessage,
      sessionReady,
      setLanguage,
      setQueueFilters,
      setHapticsEnabled,
      setReconnectEnabled,
      setMatchSoundEnabledState,
      setSupporter,
      supporter,
      startNewSessionFromEndedRoom,
      startQueue,
      startVoiceChat,
      stopVoiceChat,
      enableVoicePlayback,
      setVoiceMuted,
      setVoiceTransmissionEnabled,
      unlockVoice,
      voiceMuted,
      voicePlaybackBlocked,
      voiceDiagnostics,
      typingIndicator,

      voiceState,
      guestMode,
      sendTypingState,
      appendSystemMessage,
    ],

  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
      <PersistentVoiceAudio audioRef={voiceAudioRef} />
    </PresenceContext.Provider>
  );

}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence must be used within PresenceProvider");
  }
  return context;
}

export type { PresenceContextValue };