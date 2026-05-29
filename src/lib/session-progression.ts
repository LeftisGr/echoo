import { useEffect, useMemo, useRef, useState } from "react";

import type { AppLanguage } from "@/lib/presence-types";

export const SESSION_TEXT_PHASE_SECONDS = 600;
export const SESSION_AUDIO_PHASE_SECONDS = 600;
export const SESSION_MEDIA_PHASE_SECONDS = 600;
export const SESSION_TOTAL_PROGRESS_SECONDS = SESSION_TEXT_PHASE_SECONDS + SESSION_AUDIO_PHASE_SECONDS + SESSION_MEDIA_PHASE_SECONDS;

export type SessionPhase = "TEXT_PHASE" | "AUDIO_PHASE" | "MEDIA_PHASE";

export interface SessionProgression {
  phase: SessionPhase;
  elapsedSeconds: number;
  secondsUntilVoiceUnlock: number;
  secondsUntilMediaUnlock: number;
  mediaUnlocked: boolean;
  voiceUnlocked: boolean;
}

export interface SessionPhaseCopy {
  badgeLabel: string;
  moment: string;
}

const sessionPhaseCopy: Record<SessionPhase, Record<AppLanguage, SessionPhaseCopy>> = {
  TEXT_PHASE: {
    en: {
      badgeLabel: "Settling in",
      moment: "The room is learning your pace.",
    },
    el: {
      badgeLabel: "Το room ηρεμεί",
      moment: "Το room μαθαίνει τον ρυθμό σας.",
    },
  },
  AUDIO_PHASE: {
    en: {
      badgeLabel: "Voice approaching",
      moment: "A little more trust is enough to open the voice.",
    },
    el: {
      badgeLabel: "Η φωνή πλησιάζει",
      moment: "Λίγη περισσότερη εμπιστοσύνη αρκεί για να ανοίξει η φωνή.",
    },
  },
  MEDIA_PHASE: {
    en: {
      badgeLabel: "The room opens wider",
      moment: "What you share now feels more intimate.",
    },
    el: {
      badgeLabel: "Το room ανοίγει πιο πολύ",
      moment: "Αυτό που μοιράζεστε τώρα νιώθει πιο κοντινό.",
    },
  },
};

export function getSessionPhaseCopy(phase: SessionPhase, language: AppLanguage) {
  return sessionPhaseCopy[phase][language];
}

export function getSessionPhase(elapsedSeconds: number): SessionPhase {
  if (elapsedSeconds >= SESSION_TEXT_PHASE_SECONDS + SESSION_AUDIO_PHASE_SECONDS) {
    return "MEDIA_PHASE";
  }

  if (elapsedSeconds >= SESSION_TEXT_PHASE_SECONDS) {
    return "AUDIO_PHASE";
  }

  return "TEXT_PHASE";
}

export function getSessionProgression(startedAt: string | null | undefined, now = Date.now()): SessionProgression {
  if (!startedAt) {
    return {
      phase: "TEXT_PHASE",
      elapsedSeconds: 0,
      secondsUntilVoiceUnlock: SESSION_TEXT_PHASE_SECONDS,
      secondsUntilMediaUnlock: SESSION_TEXT_PHASE_SECONDS + SESSION_AUDIO_PHASE_SECONDS,
      mediaUnlocked: false,
      voiceUnlocked: false,
    };
  }

  const elapsedSeconds = Math.max(Math.floor((now - new Date(startedAt).getTime()) / 1000), 0);
  const phase = getSessionPhase(elapsedSeconds);

  return {
    phase,
    elapsedSeconds,
    secondsUntilVoiceUnlock: Math.max(SESSION_TEXT_PHASE_SECONDS - elapsedSeconds, 0),
    secondsUntilMediaUnlock: Math.max(SESSION_TEXT_PHASE_SECONDS + SESSION_AUDIO_PHASE_SECONDS - elapsedSeconds, 0),
    mediaUnlocked: phase === "MEDIA_PHASE",
    voiceUnlocked: phase === "AUDIO_PHASE" || phase === "MEDIA_PHASE",
  };
}

export function useSessionProgression(startedAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const lastPhaseRef = useRef<SessionPhase | null>(null);

  const progression = useMemo(() => getSessionProgression(startedAt, now), [now, startedAt]);

  useEffect(() => {
    if (!startedAt || progression.phase === "MEDIA_PHASE") {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [progression.phase, startedAt]);

  useEffect(() => {
    if (!startedAt) {
      lastPhaseRef.current = null;
      return;
    }

    if (lastPhaseRef.current !== progression.phase) {
      lastPhaseRef.current = progression.phase;
      console.info("[session] phase entered", {
        startedAt,
        phase: progression.phase,
        elapsedSeconds: progression.elapsedSeconds,
      });
    }
  }, [progression.elapsedSeconds, progression.phase, startedAt]);

  return progression;
}
