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

import { getCopy, interestTags, partnerReplies, queueMessages, usernamePrefixes, usernameSuffixes } from "@/lib/presence-content";
import {
  hasSupabaseConfig,
  joinQueue,
  leaveQueue,
  persistMessage,
  persistRating,
  persistReport,
  persistRoom,
  syncProfile,
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

interface PresenceContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  copy: ReturnType<typeof getCopy>;
  authenticated: boolean;
  profile: PresenceProfile | null;
  queue: QueueState;
  room: RoomSession | null;
  voiceState: VoiceState;
  online: boolean;
  hapticsEnabled: boolean;
  reconnectEnabled: boolean;
  adminMetrics: AdminMetrics;
  login: (method: AuthMethod) => Promise<void>;
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
  startVoiceChat: (audioElement: HTMLAudioElement) => Promise<void>;
  stopVoiceChat: () => void;
  startNewSessionFromEndedRoom: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

const storageKey = "presence-mvp-state";

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function vibrate(pattern: number | number[]) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateUsername() {
  return `${randomFrom(usernamePrefixes)}${randomFrom(usernameSuffixes)}`;
}

function createDefaultProfile(): PresenceProfile {
  return {
    id: createId(),
    username: generateUsername(),
    ageRange: "25-34",
    gender: "prefer-not",
    preference: "anyone",
    language: "both",
    interests: ["music", "deep talks", "travel"],
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

function createPartner(profile: PresenceProfile | null): RoomSession["partner"] {
  const language = profile?.language === "both" ? randomFrom(["greek", "english", "both"] as const) : profile?.language ?? "both";

  return {
    id: createId(),
    username: generateUsername(),
    ageRange: randomFrom(["18-24", "25-34", "35-44", "45+"] as const),
    gender: randomFrom(["male", "female", "nonbinary", "prefer-not"] as const),
    language,
    interests: [...interestTags].sort(() => Math.random() - 0.5).slice(0, 3),
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

function readStoredState(): PresenceStoredState {
  if (typeof window === "undefined") {
    return {
      language: "en",
      profile: null,
      authenticated: false,
      room: null,
      reportsCount: 0,
      ratings: [],
    };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return {
      language: "en",
      profile: null,
      authenticated: false,
      room: null,
      reportsCount: 0,
      ratings: [],
    };
  }

  try {
    return JSON.parse(raw) as PresenceStoredState;
  } catch {
    return {
      language: "en",
      profile: null,
      authenticated: false,
      room: null,
      reportsCount: 0,
      ratings: [],
    };
  }
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const stored = useMemo(() => readStoredState(), []);
  const [language, setLanguageState] = useState<AppLanguage>(stored.language);
  const [authenticated, setAuthenticated] = useState(stored.authenticated);
  const [profile, setProfile] = useState<PresenceProfile | null>(stored.profile ?? createDefaultProfile());
  const [queue, setQueue] = useState<QueueState>(createInitialQueue(stored.profile));
  const [room, setRoom] = useState<RoomSession | null>(stored.room);
  const [reportsCount, setReportsCount] = useState(stored.reportsCount ?? 0);
  const [ratings, setRatings] = useState<RatingScore[]>(stored.ratings ?? []);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [reconnectEnabled, setReconnectEnabled] = useState(true);

  const voiceControllerRef = useRef<VoiceSessionController | null>(null);
  const replyTimeoutRef = useRef<number | null>(null);
  const queueTimersRef = useRef<number[]>([]);

  const copy = useMemo(() => getCopy(language), [language]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedState: PresenceStoredState = {
      language,
      profile,
      authenticated,
      room,
      reportsCount,
      ratings,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(storedState));
  }, [authenticated, language, profile, ratings, reportsCount, room]);

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
    if (!queue.active) {
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

    const foundId = window.setTimeout(async () => {
      const nextRoomId = createId();
      const partner = createPartner(profile);
      const systemMessage = createSystemMessage(
        nextRoomId,
        language === "en"
          ? "Connection opened. Stay curious and respectful."
          : "Η σύνδεση άνοιξε. Μείνε περίεργος και με σεβασμό.",
      );

      const nextRoom: RoomSession = {
        id: nextRoomId,
        userA: profile?.id ?? createId(),
        userB: partner.id,
        startedAt: new Date().toISOString(),
        voiceEnabled: false,
        status: "active",
        partner,
        messages: [systemMessage],
      };

      setRoom(nextRoom);
      setQueue(createInitialQueue(profile));
      await persistRoom(nextRoom);
      toast.success(copy.misc.sessionReady);
      if (hapticsEnabled) {
        vibrate([60, 40, 80]);
      }
    }, 6500);

    queueTimersRef.current = [rotationId, relaxId, foundId];

    return () => {
      window.clearInterval(rotationId);
      window.clearTimeout(relaxId);
      window.clearTimeout(foundId);
    };
  }, [copy.misc.noUsers, copy.misc.sessionReady, hapticsEnabled, language, profile, queue.active]);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) {
        window.clearTimeout(replyTimeoutRef.current);
      }
      voiceControllerRef.current?.stop();
    };
  }, []);

  const adminMetrics = useMemo<AdminMetrics>(() => {
    const activeUsers = authenticated ? 1 : 0;
    const activeRooms = room?.status === "active" ? 1 : 0;
    const durationMinutes = room?.endedAt
      ? Math.max(
          1,
          Math.round(
            (new Date(room.endedAt).getTime() - new Date(room.startedAt).getTime()) /
              60000,
          ),
        )
      : 7;

    return {
      totalUsers: 1842,
      activeUsers: 426 + activeUsers,
      queueCount: queue.active ? 37 : 29,
      activeRooms: 92 + activeRooms,
      averageSessionDuration: durationMinutes,
      reportsCount: 18 + reportsCount,
      dailySignups: 73,
      usersOnlineNow: 486,
      avgWaitTimeSeconds: queue.active ? queue.estimatedWaitSeconds : 22,
    };
  }, [authenticated, queue.active, queue.estimatedWaitSeconds, reportsCount, room]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const login = useCallback(
    async (_method: AuthMethod) => {
      const ensuredProfile = profile ?? createDefaultProfile();
      setProfile(ensuredProfile);
      setAuthenticated(true);
      await syncProfile(ensuredProfile);
      toast.success(copy.misc.signedIn);
      if (hapticsEnabled) {
        vibrate(40);
      }
    },
    [copy.misc.signedIn, hapticsEnabled, profile],
  );

  const logout = useCallback(() => {
    voiceControllerRef.current?.stop();
    voiceControllerRef.current = null;
    setVoiceState("idle");
    setAuthenticated(false);
    setQueue(createInitialQueue(profile));
    setRoom(null);
    toast(copy.misc.signedOut);
  }, [copy.misc.signedOut, profile]);

  const rerollUsername = useCallback(() => {
    setProfile((current) => ({
      ...(current ?? createDefaultProfile()),
      username: generateUsername(),
    }));
    if (hapticsEnabled) {
      vibrate(20);
    }
  }, [hapticsEnabled]);

  const updateProfile = useCallback(
    (updates: Partial<PresenceProfile>) => {
      setProfile((current) => {
        const nextProfile = {
          ...(current ?? createDefaultProfile()),
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
    [copy.misc.profileSaved],
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
    if (!authenticated || !profile) {
      return;
    }

    setRoom(null);
    setQueue({
      active: true,
      joinedAt: new Date().toISOString(),
      estimatedWaitSeconds: 18,
      filters: {
        preference: profile.preference,
        language: profile.language,
      },
      messageIndex: 0,
      softRelaxed: false,
    });
    await joinQueue(profile.id, {
      preference: profile.preference,
      language: profile.language,
    });
    if (hapticsEnabled) {
      vibrate([40, 20, 40]);
    }
  }, [authenticated, hapticsEnabled, profile]);

  const cancelQueue = useCallback(async () => {
    if (profile) {
      await leaveQueue(profile.id);
    }
    setQueue(createInitialQueue(profile));
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

      const nextMessages = [...room.messages, userMessage];
      const nextRoom = { ...room, messages: nextMessages };
      setRoom(nextRoom);
      await persistMessage(userMessage);

      if (replyTimeoutRef.current) {
        window.clearTimeout(replyTimeoutRef.current);
      }

      replyTimeoutRef.current = window.setTimeout(() => {
        setRoom((current) => {
          if (!current) {
            return current;
          }

          const reply: ChatMessage = {
            id: createId(),
            roomId: current.id,
            senderId: current.partner.id,
            content: randomFrom(partnerReplies[language]),
            createdAt: new Date().toISOString(),
            type: "text",
          };

          void persistMessage(reply);
          return {
            ...current,
            messages: [...current.messages, reply],
          };
        });
      }, 1400 + Math.floor(Math.random() * 1500));
    },
    [language, profile, room],
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
        toast.error(hasSupabaseConfig ? copy.misc.reconnecting : "Microphone permission was not granted.");
      }
    },
    [copy.misc.reconnecting, copy.session.connected, copy.session.voiceStarting, hapticsEnabled],
  );

  const leaveRoom = useCallback(
    (reason?: string) => {
      stopVoiceChat();
      setRoom((current) => {
        if (!current) {
          return current;
        }

        const nextRoom = {
          ...current,
          status: "ended" as const,
          endedAt: new Date().toISOString(),
          messages: reason
            ? [...current.messages, createSystemMessage(current.id, reason)]
            : current.messages,
        };

        void persistRoom(nextRoom);
        return nextRoom;
      });
    },
    [stopVoiceChat],
  );

  const rateRoom = useCallback(
    async (score: RatingScore) => {
      if (!room) {
        return;
      }

      setRoom((current) => (current ? { ...current, rating: score } : current));
      setRatings((current) => [...current, score]);
      await persistRating(room.id, score);
      toast.success(copy.misc.ratingSaved);
    },
    [copy.misc.ratingSaved, room],
  );

  const reportCurrentRoom = useCallback(
    async (reason: string) => {
      if (!room) {
        return;
      }

      setReportsCount((current) => current + 1);
      await persistReport(room.id, room.partner.id, reason);
      toast.success(copy.misc.reported);
      leaveRoom(language === "en" ? "Conversation ended after a report." : "Η συνομιλία ολοκληρώθηκε μετά από αναφορά.");
    },
    [copy.misc.reported, language, leaveRoom, room],
  );

  const blockCurrentPartner = useCallback(() => {
    toast.success(copy.misc.blocked);
    leaveRoom(language === "en" ? "Connection closed and partner blocked." : "Η σύνδεση έκλεισε και ο χρήστης μπλοκαρίστηκε.");
  }, [copy.misc.blocked, language, leaveRoom]);

  const startNewSessionFromEndedRoom = useCallback(async () => {
    setRoom(null);
    await startQueue();
  }, [startQueue]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      language,
      setLanguage,
      copy,
      authenticated,
      profile,
      queue,
      room,
      voiceState,
      online,
      hapticsEnabled,
      reconnectEnabled,
      adminMetrics,
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
      startVoiceChat,
      stopVoiceChat,
      startNewSessionFromEndedRoom,
    }),
    [
      adminMetrics,
      authenticated,
      blockCurrentPartner,
      cancelQueue,
      copy,
      hapticsEnabled,
      language,
      leaveRoom,
      login,
      online,
      profile,
      queue,
      rateRoom,
      reconnectEnabled,
      rerollUsername,
      room,
      sendMessage,
      setLanguage,
      setQueueFilters,
      startNewSessionFromEndedRoom,
      startQueue,
      startVoiceChat,
      stopVoiceChat,
      unlockVoice,
      updateProfile,
      voiceState,
      reportCurrentRoom,
      logout,
    ],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const context = useContext(PresenceContext);

  if (!context) {
    throw new Error("usePresence must be used inside PresenceProvider");
  }

  return context;
}
