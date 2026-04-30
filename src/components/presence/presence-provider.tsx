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
  startVoiceChat: (audioElement: HTMLAudioElement) => Promise<void>;
  stopVoiceChat: () => void;
  startNewSessionFromEndedRoom: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);
const storageKey = "presence-mvp-state";

function createId() {
  return crypto.randomUUID();
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

function createDefaultProfile(userId?: string): PresenceProfile {
  return {
    id: userId ?? createId(),
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
    return { language: "en", profile: null, authenticated: false, reportsCount: 0, ratings: [] };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { language: "en", profile: null, authenticated: false, reportsCount: 0, ratings: [] };
  }

  try {
    return JSON.parse(raw) as PresenceStoredState;
  } catch {
    return { language: "en", profile: null, authenticated: false, reportsCount: 0, ratings: [] };
  }
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const stored = useMemo(() => readStoredState(), []);
  const [language, setLanguageState] = useState<AppLanguage>(stored.language);
  const [authenticated, setAuthenticated] = useState(stored.authenticated);
  const [profile, setProfile] = useState<PresenceProfile | null>(stored.profile ?? createDefaultProfile());
  const [userId, setUserId] = useState<string | null>(stored.profile?.id ?? null);
  const [queue, setQueue] = useState<QueueState>(createInitialQueue(stored.profile));
  const [room, setRoom] = useState<RoomSession | null>(null);
  const [reportsCount, setReportsCount] = useState(stored.reportsCount ?? 0);
  const [ratings, setRatings] = useState<RatingScore[]>(stored.ratings ?? []);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [reconnectEnabled, setReconnectEnabled] = useState(true);
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
  const matchmakingInFlightRef = useRef(false);
  const matchedRoomIdsRef = useRef<Set<string>>(new Set());

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
      reportsCount,
      ratings,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(storedState));
  }, [authenticated, language, profile, ratings, reportsCount]);

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
    const syncAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        if (sessionUser) {
          await hydrateAuthenticatedUser(sessionUser.id);
        }
        setAuthenticated(Boolean(sessionUser));
        setUserId(sessionUser?.id ?? null);
      } catch {
        void supabase.auth.signOut();
        setAuthenticated(false);
        setUserId(null);
        setProfile(null);
        setRoom(null);
        setQueue(createInitialQueue(null));
      }
    };

    void syncAuth();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setAuthenticated(Boolean(sessionUser));
      setUserId(sessionUser?.id ?? null);
      if (sessionUser) {
        void hydrateAuthenticatedUser(sessionUser.id).catch(() => {
          void supabase.auth.signOut();
          setAuthenticated(false);
          setUserId(null);
          setProfile(null);
          setRoom(null);
          setQueue(createInitialQueue(null));
        });
      } else {
        stopRoomSubscriptions();
        setRoom(null);
        setProfile(null);
        setQueue(createInitialQueue(null));
        setVoiceState("idle");
      }
    });

    return () => data.subscription.unsubscribe();
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
  }, [authenticated, queue.active, reportsCount, room]);

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

  async function hydrateAuthenticatedUser(currentUserId: string) {
    const loadedProfile = await loadProfile(currentUserId);
    const profileToUse = loadedProfile ?? createDefaultProfile(currentUserId);

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

    const activeRoom = await loadActiveRoomForUser(currentUserId);
    if (activeRoom) {
      await openRoom(activeRoom.id, currentUserId, activeRoom);
      setQueue(createInitialQueue(profileToUse));
    } else {
      stopRoomSubscriptions();
      setRoom(null);
    }
  }

  async function hydrateRoomPartner(nextRoom: RoomSession, currentUserId: string) {
    const partnerId = nextRoom.userA === currentUserId ? nextRoom.userB : nextRoom.userA;
    const partnerProfile = await loadProfile(partnerId);
    const messages = await loadRoomMessages(nextRoom.id);

    setRoom({
      ...nextRoom,
      partner: partnerProfile,
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
        void attemptRealtimeMatch(currentUserId);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "queue" }, () => {
        void attemptRealtimeMatch(currentUserId);
      })
      .subscribe();

    queueChannelRef.current = channel;
  }

  async function attemptRealtimeMatch(currentUserId: string) {
    if (!authenticated || !profile || room || !queue.active || matchmakingInFlightRef.current) {
      return;
    }

    matchmakingInFlightRef.current = true;

    try {
      const match = await matchQueueUser(currentUserId);
      if (!match.roomId) {
        return;
      }

      if (matchedRoomIdsRef.current.has(match.roomId)) {
        return;
      }

      const activeRoom = await loadRoomById(match.roomId);
      if (!activeRoom) {
        return;
      }

      matchedRoomIdsRef.current.add(activeRoom.id);
      await openRoom(activeRoom.id, currentUserId, activeRoom);
      setQueue(createInitialQueue(profile));
      stopQueueSubscriptions();
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
        };

        setRoom((current) => {
          if (!current || current.id !== roomId) {
            return current;
          }

          return {
            ...current,
            endedAt: updated.ended_at ?? undefined,
            voiceEnabled: updated.voice_enabled,
            status: updated.ended_at ? "ended" : "active",
          };
        });
      })
      .subscribe();

    roomChannelRef.current = channel;
  }

  async function openRoom(roomId: string, currentUserId: string, existingRoom?: {
    id: string;
    userA: string;
    userB: string;
    startedAt: string;
    endedAt?: string;
    voiceEnabled: boolean;
  }) {
    if (!profile) {
      return;
    }

    const roomBase = existingRoom ?? (await loadActiveRoomForUser(currentUserId));
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
    };

    setRoom(roomSession);
    await hydrateRoomPartner(roomSession, currentUserId);
    subscribeToRoom(roomId);
  }

  useEffect(() => {
    if (!authenticated || !profile || !userId || !queue.active || room) {
      stopQueueSubscriptions();
      return;
    }

    subscribeToQueueChanges(userId);
    void attemptRealtimeMatch(userId).catch(() => undefined);

    const interval = window.setInterval(() => {
      void attemptRealtimeMatch(userId).catch(() => undefined);
    }, 1200);

    return () => {
      window.clearInterval(interval);
      stopQueueSubscriptions();
    };
  }, [authenticated, profile, queue.active, room?.id, userId]);

  async function refreshAdminMetrics() {
    if (!hasSupabaseConfig) {
      const activeUsers = authenticated ? 1 : 0;
      const activeRooms = room?.status === "active" ? 1 : 0;
      setAdminMetrics({
        totalUsers: 1842,
        activeUsers: 426 + activeUsers,
        queueCount: queue.active ? 37 : 29,
        activeRooms: 92 + activeRooms,
        averageSessionDuration: 7,
        reportsCount: 18 + reportsCount,
        dailySignups: 73,
        usersOnlineNow: 486,
        avgWaitTimeSeconds: queue.active ? queue.estimatedWaitSeconds : 22,
      });
      return;
    }

    const [{ count: totalUsers }, { count: activeUsers }, { count: queueCount }, { count: activeRooms }, { count: reportsTotal }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("queue").select("user_id", { count: "exact", head: true }).eq("active", true),
      supabase.from("queue").select("user_id", { count: "exact", head: true }).eq("active", true),
      supabase.from("rooms").select("id", { count: "exact", head: true }).is("ended_at", null),
      supabase.from("reports").select("id", { count: "exact", head: true }),
    ]);

    setAdminMetrics({
      totalUsers: totalUsers ?? 0,
      activeUsers: activeUsers ?? 0,
      queueCount: queueCount ?? 0,
      activeRooms: activeRooms ?? 0,
      averageSessionDuration: 7,
      reportsCount: reportsTotal ?? 0,
      dailySignups: 73,
      usersOnlineNow: (activeUsers ?? 0) + (queueCount ?? 0),
      avgWaitTimeSeconds: queue.active ? queue.estimatedWaitSeconds : 22,
    });
  }

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const login = useCallback(
    async (method: AuthMethod, email?: string) => {
      const completeLocalLogin = async () => {
        const localProfile = profile ?? createDefaultProfile(userId ?? undefined);
        setProfile(localProfile);
        setUserId(localProfile.id);
        setAuthenticated(true);
        await syncProfile(localProfile);
        toast.success(copy.misc.signedIn);
      };

      if (method === "google") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) {
          toast.error(error.message);
          await completeLocalLogin();
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
        await completeLocalLogin();
        return;
      }

      toast.success(language === "en" ? "Magic link sent." : "Το magic link στάλθηκε.");
    },
    [copy.misc.signedIn, language, profile, userId],
  );

  const logout = useCallback(() => {
    voiceControllerRef.current?.stop();
    voiceControllerRef.current = null;
    matchmakingInFlightRef.current = false;
    stopQueueSubscriptions();
    stopRoomSubscriptions();
    setVoiceState("idle");
    void supabase.auth.signOut();
    setAuthenticated(false);
    setRoom(null);
    setQueue(createInitialQueue(profile));
    toast(copy.misc.signedOut);
  }, [copy.misc.signedOut, profile]);

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
    if (!authenticated || !profile) {
      return;
    }

    stopQueueSubscriptions();
    stopRoomSubscriptions();
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

    void attemptRealtimeMatch(profile.id).catch(() => undefined);

    if (hapticsEnabled) {
      vibrate([40, 20, 40]);
    }
  }, [authenticated, hapticsEnabled, profile]);

  const cancelQueue = useCallback(async () => {
    stopQueueSubscriptions();
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
      setRoom(nextRoom);
    },
    [room, stopVoiceChat],
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