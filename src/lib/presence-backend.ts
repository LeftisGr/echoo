import type {
  ChatMessage,
  PresenceProfile,
  QueueFilters,
  RatingScore,
  RoomSession,
} from "@/lib/presence-types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const presenceSchemaSql = `
create table if not exists profiles (
  id uuid primary key,
  username text not null,
  age_range text not null,
  gender text not null,
  preference text not null,
  language text not null,
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists queue (
  user_id uuid primary key,
  joined_at timestamptz not null default now(),
  filters jsonb not null,
  active boolean not null default true
);

create table if not exists rooms (
  id uuid primary key,
  user_a uuid not null,
  user_b uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  voice_enabled boolean not null default false
);

create table if not exists messages (
  id uuid primary key,
  room_id uuid not null,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key,
  room_id uuid not null,
  score text not null,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key,
  room_id uuid not null,
  reported_user uuid not null,
  reason text not null,
  created_at timestamptz not null default now()
);
`;

async function fakeNetwork<T>(value: T) {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return value;
}

export async function syncProfile(profile: PresenceProfile) {
  return fakeNetwork({ ok: hasSupabaseConfig, profile });
}

export async function joinQueue(userId: string, filters: QueueFilters) {
  return fakeNetwork({ ok: hasSupabaseConfig, userId, filters });
}

export async function leaveQueue(userId: string) {
  return fakeNetwork({ ok: hasSupabaseConfig, userId });
}

export async function persistRoom(room: RoomSession) {
  return fakeNetwork({ ok: hasSupabaseConfig, room });
}

export async function persistMessage(message: ChatMessage) {
  return fakeNetwork({ ok: hasSupabaseConfig, message });
}

export async function persistRating(roomId: string, score: RatingScore) {
  return fakeNetwork({ ok: hasSupabaseConfig, roomId, score });
}

export async function persistReport(roomId: string, reportedUser: string, reason: string) {
  return fakeNetwork({ ok: hasSupabaseConfig, roomId, reportedUser, reason });
}
