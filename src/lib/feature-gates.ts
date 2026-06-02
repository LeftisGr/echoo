import { useEffect, useMemo, useRef, useState } from "react";

import type { RoomStatus } from "@/lib/presence-types";

export enum FeatureGateKey {
  RealtimeTextChat = "realtime_text_chat",
  PttVoice = "ptt_voice",
  EphemeralContent = "ephemeral_content",
  ImageSending = "image_sending",
  AudioContentSending = "audio_content_sending",
}

export type FeatureGateStatus = "locked" | "unlocked" | "expired";

export interface FeatureGateState {
  key: FeatureGateKey;
  status: FeatureGateStatus;
  unlocked: boolean;
  locked: boolean;
  expired: boolean;
  unlockAfterSeconds: number;
  unlockedAt: string | null;
  expiresAt: string | null;
  secondsUntilUnlock: number;
}

export type FeatureGateSnapshot = Record<FeatureGateKey, FeatureGateState>;

const FEATURE_UNLOCK_SCHEDULE: Record<FeatureGateKey, number> = {
  [FeatureGateKey.RealtimeTextChat]: 0,
  [FeatureGateKey.PttVoice]: 600,
  [FeatureGateKey.EphemeralContent]: 1200,
  [FeatureGateKey.ImageSending]: 1200,
  [FeatureGateKey.AudioContentSending]: 1200,
};

function createFeatureGateState(
  key: FeatureGateKey,
  startedAt: string | null | undefined,
  roomStatus: RoomStatus | null | undefined,
  now: number,
): FeatureGateState {
  const unlockAfterSeconds = FEATURE_UNLOCK_SCHEDULE[key];
  const expired = roomStatus === "ended";

  if (!startedAt) {
    return {
      key,
      status: "locked",
      unlocked: false,
      locked: true,
      expired: false,
      unlockAfterSeconds,
      unlockedAt: null,
      expiresAt: null,
      secondsUntilUnlock: unlockAfterSeconds,
    };
  }

  const unlockedAtTimestamp = new Date(startedAt).getTime() + unlockAfterSeconds * 1000;
  const unlocked = !expired && now >= unlockedAtTimestamp;

  return {
    key,
    status: expired ? "expired" : unlocked ? "unlocked" : "locked",
    unlocked,
    locked: !unlocked && !expired,
    expired,
    unlockAfterSeconds,
    unlockedAt: unlocked ? new Date(unlockedAtTimestamp).toISOString() : null,
    expiresAt: expired ? new Date(now).toISOString() : null,
    secondsUntilUnlock: expired ? 0 : Math.max(Math.ceil((unlockedAtTimestamp - now) / 1000), 0),
  };
}

export function createFeatureGateSnapshot(
  startedAt: string | null | undefined,
  roomStatus: RoomStatus | null | undefined,
  now = Date.now(),
): FeatureGateSnapshot {
  return {
    [FeatureGateKey.RealtimeTextChat]: createFeatureGateState(FeatureGateKey.RealtimeTextChat, startedAt, roomStatus, now),
    [FeatureGateKey.PttVoice]: createFeatureGateState(FeatureGateKey.PttVoice, startedAt, roomStatus, now),
    [FeatureGateKey.EphemeralContent]: createFeatureGateState(FeatureGateKey.EphemeralContent, startedAt, roomStatus, now),
    [FeatureGateKey.ImageSending]: createFeatureGateState(FeatureGateKey.ImageSending, startedAt, roomStatus, now),
    [FeatureGateKey.AudioContentSending]: createFeatureGateState(FeatureGateKey.AudioContentSending, startedAt, roomStatus, now),
  };
}

export function canUseFeature(gates: FeatureGateSnapshot, feature: FeatureGateKey) {
  return gates[feature].unlocked;
}

export function useFeatureGates(startedAt: string | null | undefined, roomStatus: RoomStatus | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const previousStatusRef = useRef<Record<FeatureGateKey, FeatureGateStatus | null>>({
    [FeatureGateKey.RealtimeTextChat]: null,
    [FeatureGateKey.PttVoice]: null,
    [FeatureGateKey.EphemeralContent]: null,
    [FeatureGateKey.ImageSending]: null,
    [FeatureGateKey.AudioContentSending]: null,
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const gates = useMemo(() => createFeatureGateSnapshot(startedAt, roomStatus, now), [now, roomStatus, startedAt]);

  useEffect(() => {
    (Object.entries(gates) as Array<[FeatureGateKey, FeatureGateState]>).forEach(([key, gate]) => {
      if (previousStatusRef.current[key] === gate.status) {
        return;
      }

      previousStatusRef.current[key] = gate.status;
    });
  }, [gates]);

  return gates;
}
