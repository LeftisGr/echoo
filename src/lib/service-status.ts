import type { PresenceServiceName, ServiceStatusMode } from "@/lib/presence-types";

export const SERVICE_LABELS: Record<PresenceServiceName, string> = {
  matching: "Matching",
  voice: "Voice",
  contentSharing: "Content sharing",
};

export const DEFAULT_SERVICE_STATUSES: Record<PresenceServiceName, ServiceStatusMode> = {
  matching: "healthy",
  voice: "healthy",
  contentSharing: "healthy",
};
