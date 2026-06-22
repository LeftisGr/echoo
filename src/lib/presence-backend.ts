import { supabase } from "@/integrations/supabase/client";
import { EPHEMERAL_CONTENT_TTL_SECONDS } from "@/lib/ephemeral-content";
import { logAnalyticsEvent } from "@/lib/operational-logs";
import { MEDIA_UPLOAD_BUCKET } from "@/lib/session-media";
import type {
  AccountRestriction,
  ChatMessage,
  PresenceProfile,
  ProfileMode,
  ProfileRole,
  QueueFilters,
  RatingScore,
  RoomSession,
} from "@/lib/presence-types";

export const hasSupabaseConfig = true;
const MESSAGE_TTL_SECONDS = EPHEMERAL_CONTENT_TTL_SECONDS;
const PERMANENT_MESSAGE_TTL_SECONDS = 60 * 60 * 24 * 365 * 100;

export const presenceSchemaSql = `
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  email text,
  profile_mode text not null default 'guest',
  bio text,
  avatar_emoji text,
  avatar_url text,
  age_range text not null,
  gender text not null,
  preference text not null,
  language text not null,
  interests text[] not null default '{}',
  vibe_label text not null default 'night owl',
  conversations_completed integer not null default 0,
  streak_days integer not null default 0,
  last_completed_at timestamptz,
  supporter_badge boolean not null default false,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

create table if not exists public.queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_gender text,
  language text,
  joined_at timestamptz not null default now(),
  matched_at timestamptz,
  room_id uuid references public.rooms(id) on delete set null,
  filters jsonb not null,
  active boolean not null default true
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  voice_enabled boolean not null default false,
  typing_user_id uuid references auth.users(id) on delete set null,
  typing_updated_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  type text not null default 'text',
  media_url text,
  media_path text,
  media_bucket text not null default 'echoo-media',
  media_mime_type text,
  media_name text,
  media_size bigint,
  media_duration_seconds integer,
  media_width integer,
  media_height integer,
  media_consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '100 years'),
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id)
);

create table if not exists public.room_presence_signals (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  coarse_latitude numeric(5,1) not null,
  coarse_longitude numeric(5,1) not null,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.presence_signals (
  user_id uuid not null references auth.users(id) on delete cascade,
  tab_id text not null,
  status text not null,
  room_id uuid references public.rooms(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, tab_id)
);
`;

interface QueueRow {
  user_id: string;
  joined_at: string;
  filters: QueueFilters;
  active: boolean;
}

interface LiveProfileRow {
  id: string;
  username: string;
  email: string | null;
  profile_mode: ProfileMode;
  bio: string | null;
  avatar_emoji: string | null;
  avatar_url: string | null;
  age_range: PresenceProfile["ageRange"];
  gender: PresenceProfile["gender"];
  preference: PresenceProfile["preference"];
  language: PresenceProfile["language"];
  interests: string[] | null;
  vibe_label: string | null;
  conversations_completed: number | null;
  streak_days: number | null;
  last_completed_at: string | null;
  supporter_badge: boolean | null;
  role: string | null;

  created_at: string;
  updated_at: string | null;
}

interface LiveRoomRow {
  id: string;
  user_a: string;
  user_b: string;
  started_at: string;
  ended_at: string | null;
  voice_enabled: boolean;
  rtc_state: string | null;
  rtc_connection_id: string | null;
  rtc_updated_at: string | null;
  voice_unlocked_at: string | null;
  typing_user_id: string | null;
  typing_updated_at: string | null;
}

interface LiveMessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
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
  created_at: string;
}

interface MatchQueueRow {
  room_id: string;
  partner_id: string;
  created_room: boolean;
  already_matched: boolean;
}

function createOfflineResult<T>(value: T) {
  return Promise.resolve(value);
}

async function cleanupExpiredMessages() {
  return createOfflineResult({ deletedCount: 0 });
}

function normalizeFilters(filters: QueueFilters) {

  return {
    preference: filters.preference,
    language: filters.language,
  };
}

function normalizeRole(role: string | null | undefined): ProfileRole {
  return role === "admin" ? "admin" : "member";
}

function normalizeProfileMode(mode: string | null | undefined): ProfileMode {
  return mode === "registered" ? "registered" : "guest";
}

function mapProfileRow(row: LiveProfileRow): PresenceProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    profileMode: normalizeProfileMode(row.profile_mode),
    bio: row.bio,
    avatarEmoji: row.avatar_emoji,
    avatarUrl: row.avatar_url,
    ageRange: row.age_range,
    gender: row.gender,
    preference: row.preference,
    language: row.language,
    interests: row.interests ?? [],
    vibeLabel: row.vibe_label ?? "night owl",
    conversationsCompleted: row.conversations_completed ?? 0,
    streakDays: row.streak_days ?? 0,
    lastCompletedAt: row.last_completed_at,
    supporterBadge: row.supporter_badge ?? false,
    role: normalizeRole(row.role),

    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export function isLanguageCompatible(

  targetLanguage: PresenceProfile["language"],
  candidateLanguage: PresenceProfile["language"],
  relaxed = false,
) {
  if (relaxed) {
    return true;
  }

  if (targetLanguage === "both" || candidateLanguage === "both") {
    return true;
  }

  return targetLanguage === candidateLanguage;
}

export function isPreferenceCompatible(
  source: PresenceProfile,
  candidate: PresenceProfile,
  relaxed = false,
) {
  if (relaxed) {
    return true;
  }

  const sourceAccepts = source.preference === "anyone" || source.preference === candidate.gender;
  const candidateAccepts = candidate.preference === "anyone" || candidate.preference === source.gender;

  return sourceAccepts && candidateAccepts;
}

export function createQueueNote(source: PresenceProfile, candidate: PresenceProfile, relaxed = false) {
  return {
    source,
    candidate,
    relaxed,
  };
}

export async function syncProfile(profile: PresenceProfile) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, profile });
  }

  const { error } = await supabase.from("profiles").upsert({
    id: profile.id,
    username: profile.username,
    email: profile.email,
    profile_mode: profile.profileMode,
    bio: profile.bio,
    avatar_emoji: profile.avatarEmoji,
    avatar_url: profile.avatarUrl,
    age_range: profile.ageRange,
    gender: profile.gender,
    preference: profile.preference,
    language: profile.language,
    interests: profile.interests,
    vibe_label: profile.vibeLabel,
    conversations_completed: profile.conversationsCompleted,
    streak_days: profile.streakDays,
    last_completed_at: profile.lastCompletedAt,
    supporter_badge: profile.supporterBadge,
    

    updated_at: profile.updatedAt,
  });

  if (error) {
    throw error;
  }

  return { ok: true, profile };
}

export async function loadProfile(userId: string) {
  if (!hasSupabaseConfig) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, profile_mode, bio, avatar_emoji, avatar_url, age_range, gender, preference, language, interests, vibe_label, conversations_completed, streak_days, last_completed_at, supporter_badge, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProfileRow(data as LiveProfileRow);
}

export async function loadBlockedUserIds(userId: string) {
  if (!hasSupabaseConfig) {
    return [] as string[];
  }

  const [{ data: blockedUsersData, error: blockedUsersError }, { data: legacyBlocksData, error: legacyBlocksError }] = await Promise.all([
    supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_blocks")
      .select("blocked_user_id")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (blockedUsersError) {
    throw blockedUsersError;
  }

  if (legacyBlocksError) {
    throw legacyBlocksError;
  }

  return [...new Set([
    ...((blockedUsersData ?? []) as { blocked_id: string }[]).map((row) => row.blocked_id),
    ...((legacyBlocksData ?? []) as { blocked_user_id: string }[]).map((row) => row.blocked_user_id),
  ])];
}

export async function loadModerationState(userId: string): Promise<AccountRestriction> {
  if (!hasSupabaseConfig) {
    return { status: "ok", reason: null, expiresAt: null };
  }

  const [suspensionsResult, bansResult] = await Promise.all([
    supabase
      .from("user_suspensions")
      .select("reason, expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_bans")
      .select("reason, expires_at, permanent")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (suspensionsResult.error) {
    throw suspensionsResult.error;
  }

  if (bansResult.error) {
    throw bansResult.error;
  }

  const now = Date.now();
  const activeBan = (bansResult.data ?? []).find((row) => {
    const expiresAt = row.permanent ? null : row.expires_at;
    return row.permanent || (expiresAt ? new Date(expiresAt).getTime() > now : false);
  }) as { reason: string; expires_at: string | null; permanent: boolean } | undefined;

  if (activeBan) {
    return {
      status: "banned",
      reason: activeBan.reason,
      expiresAt: activeBan.permanent ? null : activeBan.expires_at,
    };
  }

  const activeSuspension = (suspensionsResult.data ?? []).find((row) => row.expires_at && new Date(row.expires_at).getTime() > now) as
    | { reason: string; expires_at: string }
    | undefined;

  if (activeSuspension) {
    return {
      status: "suspended",
      reason: activeSuspension.reason,
      expiresAt: activeSuspension.expires_at,
    };
  }

  return { status: "ok", reason: null, expiresAt: null };
}

export async function joinQueue(userId: string, filters: QueueFilters) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, userId, filters });
  }

  const { error } = await supabase.from("queue").upsert({
    user_id: userId,
    preferred_gender: filters.preference,
    language: filters.language,
    filters: normalizeFilters(filters),
    active: true,
    room_id: null,
    matched_at: null,
    joined_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }

  void logAnalyticsEvent("user_joined_queue", {
    userId,
    properties: {
      preference: filters.preference,
      language: filters.language,
    },
  });

  return { ok: true, userId, filters };
}

export async function recordSafetyEvent(
  eventType: "queue_join" | "text_send" | "media_upload" | "reconnect",
  roomId?: string | null,
  targetUserId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, allowed: true, eventType, roomId, targetUserId, metadata });
  }

  const { data, error } = await supabase.rpc("record_safety_event", {
    p_event_type: eventType,
    p_room_id: roomId ?? null,
    p_target_user_id: targetUserId ?? null,
    p_metadata: metadata,
  });

  if (error) {
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(result?.allowed ?? true),
    remaining: Number(result?.remaining ?? 0),
    windowSeconds: Number(result?.window_seconds ?? 0),
    limitCount: Number(result?.limit_count ?? 0),
  };
}

export async function cleanupUserSession(userId: string) {

  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, userId });
  }

  const endedAt = new Date().toISOString();
  const [roomsResult, queueResult, presenceResult] = await Promise.all([
    supabase
      .from("rooms")
      .update({ ended_at: endedAt, rtc_state: "idle", rtc_connection_id: null, rtc_updated_at: endedAt })
      .is("ended_at", null)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`),

    supabase
  .from("queue")
  .update({ active: false, room_id: null, matched_at: endedAt })
  .eq("user_id", userId),

    supabase.from("room_presence_signals").delete().eq("user_id", userId),
  ]);

  if (roomsResult.error) {
    throw roomsResult.error;
  }

  if (queueResult.error) {
    throw queueResult.error;
  }

  if (presenceResult.error) {
    throw presenceResult.error;
  }

  return { ok: true, userId };
}

export async function leaveQueue(userId: string) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, userId });
  }

  const { error } = await supabase
    .from("queue")
    .update({ active: false, room_id: null, matched_at: null })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return { ok: true, userId };
}

export async function matchQueueUser(userId: string, relaxed = false) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ roomId: null as string | null, partnerId: null as string | null, createdRoom: false, alreadyMatched: false });
  }

  const { data, error } = await supabase.rpc("match_queue_user", {
    target_user_id: userId,
    allow_relaxed: relaxed,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data)
    ? ((data as MatchQueueRow[] | null | undefined)?.[0] ?? null)
    : ((data as MatchQueueRow | null | undefined) ?? null);

  return {
    roomId: row?.room_id ?? null,
    partnerId: row?.partner_id ?? null,
    createdRoom: row?.created_room ?? false,
    alreadyMatched: row?.already_matched ?? false,
  };

}

export async function findBestMatch(user: PresenceProfile, relaxed = false) {
  if (!hasSupabaseConfig) {
    return null;
  }

  const { data: queueRows, error: queueError } = await supabase
    .from("queue")
    .select("user_id, joined_at, filters, active")
    .eq("active", true)
    .neq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (queueError) {
    throw queueError;
  }

  const candidateIds = (queueRows as QueueRow[] | null | undefined)?.map((row) => row.user_id) ?? [];

  if (!candidateIds.length) {
    return null;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, email, profile_mode, bio, avatar_emoji, avatar_url, age_range, gender, preference, language, interests, vibe_label, conversations_completed, streak_days, last_completed_at, supporter_badge, role, created_at, updated_at")
    .in("id", candidateIds);

  if (profilesError) {
    throw profilesError;
  }

  const profileMap = new Map<string, PresenceProfile>();
  (profiles ?? []).forEach((row) => {
    const profileRow = row as LiveProfileRow;
    profileMap.set(profileRow.id, mapProfileRow(profileRow));
  });

  for (const candidateId of candidateIds) {
    const candidate = profileMap.get(candidateId);
    if (!candidate) {
      continue;
    }

    if (!isLanguageCompatible(user.language, candidate.language, relaxed)) {
      continue;
    }

    if (!isPreferenceCompatible(user, candidate, relaxed)) {
      continue;
    }

    return candidate;
  }

  return null;
}

export async function createRoomRecord(userA: string, userB: string) {
  if (!hasSupabaseConfig) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({ user_a: userA, user_b: userB, voice_enabled: false, rtc_state: "idle" })
    .select("id, user_a, user_b, started_at, ended_at, voice_enabled, rtc_state, rtc_connection_id, rtc_updated_at, voice_unlocked_at, typing_user_id, typing_updated_at")
    .single();

  if (error) {
    throw error;
  }

  const room = data as LiveRoomRow;
  void logAnalyticsEvent("room_created", {
    userId: userA,
    roomId: room.id,
    properties: {
      participantCount: 2,
    },
  });
  void logAnalyticsEvent("room_created", {
    userId: userB,
    roomId: room.id,
    properties: {
      participantCount: 2,
    },
  });

  return {
    id: room.id,
    userA: room.user_a,
    userB: room.user_b,
    startedAt: room.started_at,
    endedAt: room.ended_at ?? undefined,
    voiceEnabled: room.voice_enabled,
    rtcState: (room.rtc_state as RoomSession["rtcState"]) ?? "idle",
    rtcConnectionId: room.rtc_connection_id,
    rtcUpdatedAt: room.rtc_updated_at,
    voiceUnlockedAt: room.voice_unlocked_at,
    typingUserId: room.typing_user_id,
    typingUpdatedAt: room.typing_updated_at,
  };
}

export async function loadActiveRoomForUser(userId: string) {

  if (!hasSupabaseConfig) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, user_a, user_b, started_at, ended_at, voice_enabled, rtc_state, rtc_connection_id, rtc_updated_at, voice_unlocked_at, typing_user_id, typing_updated_at")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const room = data as LiveRoomRow;
  return {
    id: room.id,
    userA: room.user_a,
    userB: room.user_b,
    startedAt: room.started_at,
    endedAt: room.ended_at ?? undefined,
    voiceEnabled: room.voice_enabled,
    rtcState: (room.rtc_state as RoomSession["rtcState"]) ?? "idle",
    rtcConnectionId: room.rtc_connection_id,
    rtcUpdatedAt: room.rtc_updated_at,
    voiceUnlockedAt: room.voice_unlocked_at,
    typingUserId: room.typing_user_id,
    typingUpdatedAt: room.typing_updated_at,
  };
}

export async function loadRoomById(roomId: string) {

  if (!hasSupabaseConfig) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, user_a, user_b, started_at, ended_at, voice_enabled, rtc_state, rtc_connection_id, rtc_updated_at, voice_unlocked_at, typing_user_id, typing_updated_at")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const room = data as LiveRoomRow;
  return {
    id: room.id,
    userA: room.user_a,
    userB: room.user_b,
    startedAt: room.started_at,
    endedAt: room.ended_at ?? undefined,
    voiceEnabled: room.voice_enabled,
    rtcState: (room.rtc_state as RoomSession["rtcState"]) ?? "idle",
    rtcConnectionId: room.rtc_connection_id,
    rtcUpdatedAt: room.rtc_updated_at,
    voiceUnlockedAt: room.voice_unlocked_at,
    typingUserId: room.typing_user_id,
    typingUpdatedAt: room.typing_updated_at,
  };
}

export async function loadRoomMessages(roomId: string) {

  if (!hasSupabaseConfig) {
    return [] as ChatMessage[];
  }

  const { data, error } = await supabase

    .from("messages")
    .select("id, room_id, sender_id, content, type, media_url, media_path, media_bucket, media_mime_type, media_name, media_size, media_duration_seconds, media_width, media_height, expires_at, media_consumed_at, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const message = row as unknown as LiveMessageRow & { expires_at: string | null };

      if (message.type === "media" && message.media_path && message.media_mime_type && message.media_name && message.media_size !== null) {
        const kind = message.media_mime_type.startsWith("audio/")
          ? "audio"
          : message.media_mime_type.startsWith("video/")
            ? "video"
            : "image";

        return {
          id: message.id,
          roomId: message.room_id,
          senderId: message.sender_id,
          content: message.content,
          createdAt: message.created_at,
          expiresAt: message.expires_at ?? undefined,
          type: "media" as const,
          mediaConsumedAt: message.media_consumed_at ?? undefined,
          media: {
            url: message.media_url,
            path: message.media_path,
            bucket: message.media_bucket ?? MEDIA_UPLOAD_BUCKET,
            mimeType: message.media_mime_type,
            name: message.media_name,
            size: Number(message.media_size),
            kind,
            durationSeconds: message.media_duration_seconds ?? undefined,
            width: message.media_width ?? undefined,
            height: message.media_height ?? undefined,
          },
        };
      }

      return {
        id: message.id,
        roomId: message.room_id,
        senderId: message.sender_id,
        content: message.content,
        createdAt: message.created_at,
        expiresAt: message.expires_at ?? undefined,
        type: (message.type as "text" | "system") ?? "text",
      };

    })
    .filter((message): message is ChatMessage => Boolean(message));
}

export async function persistRoom(room: RoomSession) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, room });
  }

  const { error } = await supabase.from("rooms").upsert({
    id: room.id,
    user_a: room.userA,
    user_b: room.userB,
    started_at: room.startedAt,
    ended_at: room.endedAt ?? null,
    voice_enabled: room.voiceEnabled,
    rtc_state: room.rtcState ?? "idle",
    rtc_connection_id: room.rtcConnectionId ?? null,
    rtc_updated_at: room.rtcUpdatedAt ?? null,
    voice_unlocked_at: room.voiceUnlockedAt ?? null,
    typing_user_id: room.typingUserId ?? null,
    typing_updated_at: room.typingUpdatedAt ?? null,
  });

  if (error) {
    throw error;
  }

  return { ok: true, room };
}

export async function persistRoomTyping(room: RoomSession, typingUserId: string | null, updatedAt = new Date().toISOString()) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, roomId: room.id, typingUserId });
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      typing_user_id: typingUserId,
      typing_updated_at: updatedAt,
    })
    .eq("id", room.id);

  if (error) {
    throw error;
  }

  return { ok: true, roomId: room.id, typingUserId };
}

export async function persistMessage(message: ChatMessage) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, message });
  }

  const createdAt = new Date(message.createdAt);
  const expiresAt =
    message.type === "media"
      ? new Date(createdAt.getTime() + MESSAGE_TTL_SECONDS * 1000).toISOString()
      : new Date(createdAt.getTime() + PERMANENT_MESSAGE_TTL_SECONDS * 1000).toISOString();

  const { error } = await supabase.from("messages").insert({

    id: message.id,
    room_id: message.roomId,
    sender_id: message.senderId,
    content: message.content,
    type: message.type,
    media_url: null,
    media_path: message.type === "media" ? message.media.path : null,
    media_bucket: message.type === "media" ? message.media.bucket : MEDIA_UPLOAD_BUCKET,

    media_mime_type: message.type === "media" ? message.media.mimeType : null,
    media_name: message.type === "media" ? message.media.name : null,
    media_size: message.type === "media" ? message.media.size : null,
    media_duration_seconds: message.type === "media" ? message.media.durationSeconds ?? null : null,
    media_width: message.type === "media" ? message.media.width ?? null : null,
    media_height: message.type === "media" ? message.media.height ?? null : null,
    media_consumed_at: message.type === "media" ? message.mediaConsumedAt ?? null : null,
    expires_at: expiresAt,
    created_at: message.createdAt,
  });

  if (error) {
    throw error;
  }

  return { ok: true, message };
}

export async function persistRating(roomId: string, userId: string, score: RatingScore) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, roomId, userId, score });
  }

  const { error } = await supabase.from("ratings").insert({
    room_id: roomId,
    user_id: userId,
    score,
  });

  if (error) {
    throw error;
  }

  return { ok: true, roomId, userId, score };
}

export async function persistReport(roomId: string, reporterId: string, reportedUser: string, reason: string) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, roomId, reporterId, reportedUser, reason });
  }

  const { error } = await supabase.from("reports").insert({
    room_id: roomId,
    reporter_id: reporterId,
    reported_user: reportedUser,
    reason,
  });

  if (error) {
    throw error;
  }

  void logAnalyticsEvent("report_submitted", {
    userId: reporterId,
    roomId,
    properties: {
      reasonCategory: reason.split(":")[0]?.trim() || reason,
    },
  });

  return { ok: true, roomId, reporterId, reportedUser, reason };
}

export async function persistBlock(roomId: string, blockerId: string, blockedUserId: string) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, roomId, blockerId, blockedUserId });
  }

  const { error } = await supabase.rpc("block_user", {
    p_target_user_id: blockedUserId,
    p_room_id: roomId,
  });

  if (error) {
    throw error;
  }

  void logAnalyticsEvent("user_blocked", {
    userId: blockerId,
    roomId,
    properties: {
      context: "room",
    },
  });

  return { ok: true, roomId, blockerId, blockedUserId };
}

export async function endRoom(room: RoomSession) {

  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, room });
  }

  const endedAt = room.endedAt ?? new Date().toISOString();
  const [{ error: roomError }, { error: presenceError }] = await Promise.all([
    supabase
      .from("rooms")
      .update({
        ended_at: endedAt,
        voice_enabled: room.voiceEnabled,
        rtc_state: "idle",
        rtc_connection_id: null,
        rtc_updated_at: new Date().toISOString(),
      })
      .eq("id", room.id),
    supabase.from("room_presence_signals").delete().eq("room_id", room.id),
  ]);

  const error = roomError;

  if (error) {
    throw error;
  }

  if (presenceError) {
    throw presenceError;
  }

  void logAnalyticsEvent("room_ended", {

    userId: room.userA,
    roomId: room.id,
    properties: {
      endedAt,
      voiceEnabled: room.voiceEnabled,
    },
  });
  void logAnalyticsEvent("room_ended", {
    userId: room.userB,
    roomId: room.id,
    properties: {
      endedAt,
      voiceEnabled: room.voiceEnabled,
    },
  });

  return { ok: true, room };
}