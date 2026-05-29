import { useEffect, useSyncExternalStore, type ReactNode } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallState = {
  installState: "hidden" | "available" | "ios" | "installed";
  isInstalled: boolean;
  isStandalone: boolean;
  isIosSafari: boolean;
  canPromptInstall: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

type PwaStoreSnapshot = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  isInstalled: boolean;
  isIosSafari: boolean;
};

const listeners = new Set<() => void>();
let registered = false;
let snapshot: PwaStoreSnapshot = {
  deferredPrompt: null,
  isStandalone: false,
  isInstalled: false,
  isIosSafari: false,
};

function isIosSafariBrowser() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|chrome/.test(userAgent);

  return isIosDevice && isSafari;
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function updateSnapshot(next: Partial<PwaStoreSnapshot>) {
  snapshot = {
    ...snapshot,
    ...next,
  };
  emitChange();
}

function ensureRegistered() {
  if (registered || typeof window === "undefined") {
    return;
  }

  registered = true;

  snapshot = {
    deferredPrompt: snapshot.deferredPrompt,
    isStandalone: isStandaloneMode(),
    isInstalled: isStandaloneMode(),
    isIosSafari: isIosSafariBrowser(),
  };

  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    updateSnapshot({ deferredPrompt: event as BeforeInstallPromptEvent });
  };

  const handleAppInstalled = () => {
    updateSnapshot({
      deferredPrompt: null,
      isInstalled: true,
      isStandalone: true,
    });
  };

  const updateStandaloneState = () => {
    const standalone = isStandaloneMode();
    updateSnapshot({
      isStandalone: standalone,
      isInstalled: standalone ? true : snapshot.isInstalled,
      isIosSafari: isIosSafariBrowser(),
    });
  };

  const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");

  updateStandaloneState();

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  window.addEventListener("resize", updateStandaloneState);
  standaloneMediaQuery.addEventListener("change", updateStandaloneState);

  const cleanup = () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
    window.removeEventListener("resize", updateStandaloneState);
    standaloneMediaQuery.removeEventListener("change", updateStandaloneState);
  };

  window.addEventListener("beforeunload", cleanup, { once: true });
}

function getSnapshot() {
  ensureRegistered();
  return snapshot;
}

function subscribe(listener: () => void) {
  ensureRegistered();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function PwaProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function usePwaInstall() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const installState: PwaInstallState["installState"] = current.isInstalled
    ? "installed"
    : current.deferredPrompt
      ? "available"
      : current.isIosSafari
        ? "ios"
        : "hidden";

  const promptInstall = async () => {
    if (!current.deferredPrompt) {
      return "unavailable" as const;
    }

    await current.deferredPrompt.prompt();
    const choice = await current.deferredPrompt.userChoice;

    updateSnapshot({ deferredPrompt: null });

    if (choice.outcome === "accepted") {
      updateSnapshot({ isInstalled: true, isStandalone: true });
    }

    return choice.outcome;
  };

  return {
    installState,
    isInstalled: current.isInstalled,
    isStandalone: current.isStandalone,
    isIosSafari: current.isIosSafari,
    canPromptInstall: installState === "available",
    promptInstall,
  };
}
