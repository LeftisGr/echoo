import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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

const PwaInstallContext = createContext<PwaInstallState | null>(null);

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

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneMode());
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [isIosSafari, setIsIosSafari] = useState(() => isIosSafariBrowser());

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setIsStandalone(true);
    };

    const updateStandaloneState = () => {
      const standalone = isStandaloneMode();
      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
      }
      setIsIosSafari(isIosSafariBrowser());
    };

    const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");

    updateStandaloneState();

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("resize", updateStandaloneState);
    standaloneMediaQuery.addEventListener("change", updateStandaloneState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("resize", updateStandaloneState);
      standaloneMediaQuery.removeEventListener("change", updateStandaloneState);
    };
  }, []);

  const installState = useMemo(() => {
    if (isInstalled) {
      return "installed" as const;
    }

    if (deferredPrompt) {
      return "available" as const;
    }

    if (isIosSafari) {
      return "ios" as const;
    }

    return "hidden" as const;
  }, [deferredPrompt, isIosSafari, isInstalled]);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return "unavailable" as const;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setIsStandalone(true);
    }

    return choice.outcome;
  };

  return (
    <PwaInstallContext.Provider
      value={{
        installState,
        isInstalled,
        isStandalone,
        isIosSafari,
        canPromptInstall: installState === "available",
        promptInstall,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used within a PwaProvider");
  }

  return context;
}
