export type AppLanguage = "en" | "el";

export type AuthMethod = "google" | "guest";

export type AgeRange = "18-24" | "25-34" | "35-44" | "45+";

export type GenderOption = "male" | "female" | "nonbinary" | "prefer-not";

export type PreferenceOption = "male" | "female" | "anyone";

export type LanguagePreference = "greek" | "english" | "both";

export type RatingScore = "good" | "neutral" | "bad";

export type RoomStatus = "idle" | "active" | "ended";

export type PresenceServiceName = "matching" | "voice" | "contentSharing";

export type ServiceStatusMode = "healthy" | "degraded" | "maintenance";

export type VoiceState = "idle" | "requesting-microphone" | "connecting" | "connected" | "reconnecting" | "failed" | "error";

export type RtcConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "failed";

export type ProfileRole = "member" | "admin";

export type ProfileMode = "guest" | "registered";
export type AccountRestrictionStatus = "ok" | "suspended" | "banned";

export interface AccountRestriction {
  status: AccountRestrictionStatus;
  reason: string | null;
  expiresAt: string | null;
}

export interface PresenceProfile {

  id: string;
  username: string;
  email: string | null;
  profileMode: ProfileMode;
  bio: string | null;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  ageRange: AgeRange;
  gender: GenderOption;
  preference: PreferenceOption;
  language: LanguagePreference;
  interests: string[];
  vibeLabel: string;
  conversationsCompleted: number;
  streakDays: number;
  lastCompletedAt: string | null;
  supporterBadge: boolean;
  role: ProfileRole;

  createdAt: string;
  updatedAt: string;
}

export interface QueueFilters {
  preference: PreferenceOption;
  language: LanguagePreference;
}

export interface PartnerProfile {
  id: string;
  username: string;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  ageRange: AgeRange;
  gender: GenderOption;
  language: LanguagePreference;
  interests: string[];
}

export interface MediaMessagePayload {
  url: string | null;
  path: string;
  bucket: string;
  mimeType: string;
  name: string;
  size: number;
  kind: "image" | "audio" | "video";
  durationSeconds?: number;
  width?: number;
  height?: number;
}

interface ChatMessageBase {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
  expiresAt?: string;
}

export interface TextChatMessage extends ChatMessageBase {
  type: "text";
}

export interface SystemChatMessage extends ChatMessageBase {
  type: "system";
}

export interface MediaChatMessage extends ChatMessageBase {
  type: "media";
  mediaConsumedAt?: string | null;
  media: MediaMessagePayload;
}

export type ChatMessage = TextChatMessage | SystemChatMessage | MediaChatMessage;

export interface RoomSession {
  id: string;
  userA: string;
  userB: string;
  startedAt: string;
  endedAt?: string;
  voiceEnabled: boolean;
  rtcState?: RtcConnectionState;
  rtcConnectionId?: string | null;
  rtcUpdatedAt?: string | null;
  voiceUnlockedAt?: string | null;
  status: RoomStatus;
  partner: PartnerProfile | null;
  messages: ChatMessage[];
  rating?: RatingScore;
  typingUserId?: string | null;
  typingUpdatedAt?: string | null;
}

export interface QueueState {
  active: boolean;
  joinedAt?: string;
  estimatedWaitSeconds: number;
  filters: QueueFilters;
  messageIndex: number;
  softRelaxed: boolean;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  queueCount: number;
  activeRooms: number;
  averageSessionDuration: number;
  reportsCount: number;
  dailySignups: number;
  usersOnlineNow: number;
  avgWaitTimeSeconds: number;
}

export interface AdminOperationalMetrics {
  connectedNow: number | null;
  guestsOnline: number | null;
  registeredOnline: number | null;
  activeRooms: number | null;
  usersSearching: number | null;
  activeVoiceSessions: number | null;
  lastUpdatedAt: string | null;
  sourceState: "live" | "connecting" | "unavailable";
}

export interface PresenceStoredState {

  language: AppLanguage;
  authenticated: boolean;
  reportsCount: number;
  ratings: RatingScore[];
  matchSoundEnabled: boolean;
}
