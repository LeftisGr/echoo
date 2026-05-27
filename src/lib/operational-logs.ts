import { supabase } from "@/integrations/supabase/client";

const ANALYTICS_EVENT_TYPES = [
  "user_joined_queue",
  "room_created",
  "room_ended",
  "voice_unlocked",
  "upload_started",
  "upload_success",
  "upload_failed",
  "reconnect_success",
  "reconnect_failed",
  "report_submitted",
  "user_blocked",
] as const;

const ERROR_EVENT_TYPES = [
  "rtc_failure",
  "upload_failed",
  "websocket_disconnect",
  "reconnect_loop",
  "permission_denied",
  "unexpected_room_closure",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];
export type OperationalErrorEventType = (typeof ERROR_EVENT_TYPES)[number];

export interface LogEventOptions {
  userId?: string | null;
  roomId?: string | null;
  properties?: Record<string, unknown>;
}

export interface LogErrorOptions extends LogEventOptions {
  severity?: "info" | "warn" | "error";
  error?: unknown;
  errorMessage?: string;
  errorCode?: string | null;
}

export interface CleanupOperationalLogsResult {
  analyticsDeleted: number;
  errorsDeleted: number;
  moderationDeleted: number;
}

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `u_${(hash >>> 0).toString(36)}`;
}

function anonymizeUserId(userId: string | null | undefined) {
  if (!userId) {
    return "u_anon";
  }

  return hashString(userId);
}

function normalizeMessage(error: unknown, fallback = "Unknown error") {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 240);
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim().slice(0, 240);
  }

  return fallback;
}

function normalizeProperties(properties: Record<string, unknown> | undefined) {
  if (!properties) {
    return {};
  }

  return properties;
}

async function writeRow(table: "analytics_events" | "error_logs", payload: Record<string, unknown>) {
  const { error } = await supabase.from(table).insert(payload);
  if (error) {
    throw error;
  }
}

export async function logAnalyticsEvent(eventType: AnalyticsEventType, options: LogEventOptions = {}) {
  const { userId, roomId = null, properties } = options;

  try {
    await writeRow("analytics_events", {
      anonymized_user_id: anonymizeUserId(userId),
      room_id: roomId,
      event_type: eventType,
      properties: normalizeProperties(properties),
    });
  } catch {
    return;
  }
}

export async function logErrorEvent(eventType: OperationalErrorEventType, options: LogErrorOptions = {}) {
  const { userId, roomId = null, properties, severity = "error", error, errorMessage, errorCode = null } = options;

  try {
    await writeRow("error_logs", {
      anonymized_user_id: anonymizeUserId(userId),
      room_id: roomId,
      event_type: eventType,
      severity,
      error_message: (errorMessage ?? normalizeMessage(error)).slice(0, 240),
      error_code: errorCode,
      properties: normalizeProperties(properties),
    });
  } catch {
    return;
  }
}

export async function cleanupOperationalLogs() {
  const { data, error } = await supabase.rpc("cleanup_operational_logs");

  if (error) {
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;

  return {
    analyticsDeleted: Number(result?.analytics_deleted ?? 0),
    errorsDeleted: Number(result?.errors_deleted ?? 0),
    moderationDeleted: Number(result?.moderation_deleted ?? 0),
  } satisfies CleanupOperationalLogsResult;
}
