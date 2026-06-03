import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePresence } from "@/components/presence/presence-provider";
import type { AppLanguage } from "@/lib/presence-types";

const seenStoragePrefix = "echoo-onboarding-seen";
const deviceIdStorageKey = "echoo-onboarding-device-id";

type HowEchooWorksContextValue = {
  openHowEchooWorks: () => void;
};

const HowEchooWorksContext = createContext<HowEchooWorksContextValue | null>(null);

function getOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "device";
  }

  const existing = window.localStorage.getItem(deviceIdStorageKey);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(deviceIdStorageKey, next);
  return next;
}

function getStorageKey(userId: string | null) {
  return userId ? `${seenStoragePrefix}:user:${userId}` : `${seenStoragePrefix}:device:${getOrCreateDeviceId()}`;
}

function hasSeen(key: string) {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(key) === "true";
}

function markSeen(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, "true");
}

export function HowEchooWorksProvider({ children }: { children: React.ReactNode }) {
  const { appReady, authenticated, initializing, language, userId } = usePresence();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const lastAutoOpenKeyRef = useRef<string | null>(null);

  const storageKey = useMemo(() => {
    if (authenticated && !userId) {
      return null;
    }

    return getStorageKey(userId);
  }, [authenticated, userId]);

  const openHowEchooWorks = useCallback(() => {
    if (!storageKey) {
      return;
    }

    setStep(0);
    setOpen(true);
    markSeen(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !appReady || initializing || location.pathname.startsWith("/session")) {
      return;
    }

    if (authenticated && !userId) {
      return;
    }

    if (hasSeen(storageKey) || lastAutoOpenKeyRef.current === storageKey) {
      return;
    }

    lastAutoOpenKeyRef.current = storageKey;
    const timeout = window.setTimeout(() => {
      setStep(0);
      setOpen(true);
      markSeen(storageKey);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [appReady, authenticated, initializing, location.pathname, storageKey, userId]);

  return (
    <HowEchooWorksContext.Provider value={{ openHowEchooWorks }}>
      {children}
      <HowEchooWorksDialog
        open={open}
        language={language}
        step={step}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setStep(0);
            if (storageKey) {
              markSeen(storageKey);
            }
          }
        }}
        onStepChange={setStep}
      />
    </HowEchooWorksContext.Provider>
  );
}

export function useHowEchooWorks() {
  const context = useContext(HowEchooWorksContext);
  if (!context) {
    throw new Error("useHowEchooWorks must be used within HowEchooWorksProvider");
  }

  return context;
}

function HowEchooWorksDialog({
  open,
  step,
  language,
  onOpenChange,
  onStepChange,
}: {
  open: boolean;
  step: number;
  language: AppLanguage;
  onOpenChange: (open: boolean) => void;
  onStepChange: (step: number) => void;
}) {
  const screens = useMemo(
    () => [
      {
        title: language === "el" ? "Καλωσήρθες στο Echoo" : "Welcome to Echoo",
        body:
          language === "el"
            ? "Το Echoo δεν είναι social media. Δεν υπάρχουν followers, προφίλ για επίδειξη ή δημόσια feeds. Εδώ, οι συζητήσεις έρχονται πρώτες."
            : "Echoo is not social media. There are no followers, profiles to impress, or public feeds. Here, conversations come first.",
      },
      {
        title: language === "el" ? "Πώς εξελίσσονται οι συζητήσεις" : "How conversations unfold",
        body:
          language === "el"
            ? "1. Ξεκινάς ανώνυμα με text.\n2. Η φωνή ανοίγει αργότερα.\n3. Η κοινοποίηση περιεχομένου ξεκλειδώνει μόνο με τον χρόνο και την εμπιστοσύνη.\n\nΧωρίς βιασύνη. Χωρίς πίεση."
            : "1. Start anonymously with text.\n2. Voice becomes available later.\n3. Content sharing unlocks only after time and trust.\n\nNo rushing. No pressure.",
      },
      {
        title: language === "el" ? "Έτοιμος;" : "Ready?",
        body:
          language === "el"
            ? "Κάθε room είναι προσωρινό. Κάθε συζήτηση είναι διαφορετική. Μπες με περιέργεια."
            : "Every room is temporary. Every conversation is different. Enter with curiosity.",
      },
    ],
    [language],
  );

  const activeScreen = screens[step] ?? screens[0];
  const isLastStep = step >= screens.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0d1020] text-white shadow-[0_30px_90px_rgba(5,8,18,0.45)] transition-all duration-300 ease-out sm:max-w-[30rem]">
        <div className="space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2">
            {screens.map((_, index) => (
              <span
                key={index}
                className={index === step ? "h-1.5 w-8 rounded-full bg-violet-300" : "h-1.5 w-1.5 rounded-full bg-white/20"}
                aria-hidden="true"
              />
            ))}
          </div>

          <DialogHeader className="space-y-4 text-left">
            <div className="space-y-2">
              <div className="h-px w-14 bg-violet-300/30" />
              <DialogTitle className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                {activeScreen.title}
              </DialogTitle>
            </div>
            <DialogDescription
              key={`${step}-${language}`}
              className="whitespace-pre-line text-sm leading-7 text-white/68 sm:text-[0.95rem] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
            >
              {activeScreen.body}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/40">{language === "el" ? "Ήρεμο ξεκίνημα" : "A calm start"}</div>
            <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => onStepChange(step - 1)}
                >
                  {language === "el" ? "Πίσω" : "Back"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => onOpenChange(false)}
                >
                  {language === "el" ? "Κλείσιμο" : "Close"}
                </Button>
              )}

              {isLastStep ? (
                <Button asChild className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400">
                  <Link
                    to="/dashboard"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    {language === "el" ? "Άνοιξε ένα room" : "Open a room"}
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400"
                  onClick={() => onStepChange(step + 1)}
                >
                  {language === "el" ? "Συνέχεια" : "Continue"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
