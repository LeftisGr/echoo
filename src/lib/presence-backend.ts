import { supabase } from "@/integrations/supabase/client";
import type {
  ChatMessage,
  PresenceProfile,
  QueueFilters,
  RatingScore,
  RoomSession,
} from "@/lib/presence-types";

export const hasSupabaseConfig = true;

export const presenceSchemaSql = `
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  age_range text not null,
  gender text not null,
  preference text not null,
  language text not null,
  interests text[] not null default '{}',
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
  voice_enabled boolean not null default false
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
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
}

interface LiveMessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
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

function normalizeFilters(filters: QueueFilters) {
  return {
    preference: filters.preference,
    language: filters.language,
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
    age_range: profile.ageRange,
    gender: profile.gender,
    preference: profile.preference,
    language: profile.language,
    interests: profile.interests,
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
    .select("id, username, age_range, gender, preference, language, interests, created_at")
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

export async function leaveQueue(userId: string) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, userId });
  }

  const { error } = await supabase.from("queue").upsert({
    user_id: userId,
    preferred_gender: "anyone",
    language: "both",
    filters: { preference: "anyone", language: "both" },
    active: false,
    room_id: null,
    matched_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
  });

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

  const row = (data as MatchQueueRow[] | null | undefined)?.[0] ?? null;

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
    .insert({ user_a: userA, user_b: userB, voice_enabled: false })
    .select("id, user_a, user_b, started_at, ended_at, voice_enabled")
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
  };
}

export async function loadActiveRoomForUser(userId: string) {
  if (!hasSupabaseConfig) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, user_a, user_b, started_at, ended_at, voice_enabled")
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
  };
}

export async function loadRoomById(roomId: string) {
  if (!hasSupabaseConfig) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, user_a, user_b, started_at, ended_at, voice_enabled")
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
  };
}

export async function loadRoomMessages(roomId: string) {
  if (!hasSupabaseConfig) {
    return [] as ChatMessage[];
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, room_id, sender_id, content, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const message = row as unknown as LiveMessageRow;
    return {
      id: message.id,
      roomId: message.room_id,
      senderId: message.sender_id,
      content: message.content,
      createdAt: message.created_at,
      type: "text" as const,
    };
  });
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
  });

  if (error) {
    throw error;
  }

  return { ok: true, room };
}

export async function persistMessage(message: ChatMessage) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, message });
  }

  const { error } = await supabase.from("messages").insert({
    id: message.id,
    room_id: message.roomId,
    sender_id: message.senderId,
    content: message.content,
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

export async function endRoom(room: RoomSession) {
  if (!hasSupabaseConfig) {
    return createOfflineResult({ ok: true, room });
  }

  const { error } = await supabase
    .from("rooms")
    .update({ ended_at: room.endedAt ?? new Date().toISOString(), voice_enabled: room.voiceEnabled })
    .eq("id", room.id);

  if (error) {
    throw error;
  }

  return { ok: true, room };
}
