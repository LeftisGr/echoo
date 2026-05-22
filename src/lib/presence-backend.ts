import { supabase } from "@/integrations/supabase/client";
import { EPHEMERAL_CONTENT_TTL_SECONDS } from "@/lib/ephemeral-content";
import { MEDIA_UPLOAD_BUCKET } from "@/lib/session-media";
import type {
  ChatMessage,
  PresenceProfile,
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
  age_range text not null,
  gender text not null,
  preference text not null,
  language text not null,
  interests text[] not null default '{}',
  role text not null default 'member',
  created_at timestamptz not null default now(),
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
`;

interface QueueRow {
  user_id: string;
  joined_at: string;
  filters: QueueFilters;
  active: boolean;
}

interface LiveProfileRow extends PresenceProfile {}

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
    age_range: profile.ageRange,
    gender: profile.gender,
    preference: profile.preference,
    language: profile.language,
    interests: profile.interests,
    role: profile.role,
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
    .select("id, username, age_range, gender, preference, language, interests, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as LiveProfileRow & {
    age_range: PresenceProfile["ageRange"];
    created_at: string;
  };

  return {
    id: row.id,
    username: row.username,
    ageRange: row.age_range,
    gender: row.gender,
    preference: row.preference,
    language: row.language,
    interests: row.interests ?? [],
    role: normalizeRole(row.role),
    createdAt: row.created_at,
  } satisfies PresenceProfile;

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
  const [roomsResult, queueResult] = await Promise.all([
    supabase
      .from("rooms")
      .update({ ended_at: endedAt, rtc_state: "idle", rtc_connection_id: null, rtc_updated_at: endedAt })
      .is("ended_at", null)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`),

    supabase
      .from("queue")
      .upsert({
        user_id: userId,
        preferred_gender: "anyone",
        language: "both",
        filters: { preference: "anyone", language: "both" },
        active: false,
        room_id: null,
        matched_at: endedAt,
        joined_at: endedAt,
      })
      .select("user_id"),
  ]);

  if (roomsResult.error) {
    throw roomsResult.error;
  }

  if (queueResult.error) {
    throw queueResult.error;
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
    .select("id, username, age_range, gender, preference, language, interests, created_at")
    .in("id", candidateIds);

  if (profilesError) {
    throw profilesError;
  }

  const profileMap = new Map<string, PresenceProfile>();
  (profiles ?? []).forEach((row) => {
    const profileRow = row as unknown as LiveProfileRow & {
      age_range: PresenceProfile["ageRange"];
      created_at: string;
    };
    profileMap.set(profileRow.id, {
      id: profileRow.id,
      username: profileRow.username,
      ageRange: profileRow.age_range,
      gender: profileRow.gender,
      preference: profileRow.preference,
      language: profileRow.language,
      interests: profileRow.interests ?? [],
      role: normalizeRole((profileRow as { role?: string }).role),
      createdAt: profileRow.created_at,
    });

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

  return { ok: true, roomId, blockerId, blockedUserId };
}

export async function endRoom(room: RoomSession) {

  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, room });
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      ended_at: room.endedAt ?? new Date().toISOString(),
      voice_enabled: room.voiceEnabled,
      rtc_state: "idle",
      rtc_connection_id: null,
      rtc_updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  if (error) {
    throw error;
  }

  return { ok: true, room };
}