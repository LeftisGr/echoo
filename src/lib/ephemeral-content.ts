export const EPHEMERAL_CONTENT_TTL_SECONDS = 15;

export const EPHEMERAL_CONTENT_TTL_MS = EPHEMERAL_CONTENT_TTL_SECONDS * 1000;
export const EPHEMERAL_CONTENT_CLEANUP_INTERVAL_MS = 60_000;

export const EPHEMERAL_CONTENT_VIEWER_SECONDS = 15;

export function getEphemeralContentExpiresAt(createdAt: string | Date) {
  const timestamp = typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  return new Date(timestamp + EPHEMERAL_CONTENT_TTL_MS).toISOString();
}

export function isEphemeralContentExpired(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= now;
}

export function getEphemeralContentSecondsLeft(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

export function getEphemeralContentLabel(kind: "image" | "audio" | "video") {
  return kind === "image" ? "Photo" : kind === "audio" ? "Audio" : "Video";
}
