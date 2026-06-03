import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";

import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";

interface NavigationGuardContextValue {
  allowNavigationOnce: () => void;
  navigationBypassActive: boolean;
  navigationBypassRef: MutableRefObject<boolean>;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [navigationBypassActive, setNavigationBypassActive] = useState(false);
  const navigationBypassRef = useRef(false);
  const bypassTimeoutRef = useRef<number | null>(null);

  const allowNavigationOnce = useCallback(() => {
    navigationBypassRef.current = true;
    flushSync(() => {
      setNavigationBypassActive(true);
    });

    if (bypassTimeoutRef.current) {
      window.clearTimeout(bypassTimeoutRef.current);
    }

    bypassTimeoutRef.current = window.setTimeout(() => {
      navigationBypassRef.current = false;
      setNavigationBypassActive(false);
      bypassTimeoutRef.current = null;
    }, 10000);

  }, []);

  useEffect(() => {
    if (!navigationBypassActive) {
      return;
    }

    navigationBypassRef.current = false;
    setNavigationBypassActive(false);
    if (bypassTimeoutRef.current) {
      window.clearTimeout(bypassTimeoutRef.current);
      bypassTimeoutRef.current = null;
    }

  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    return () => {
      if (bypassTimeoutRef.current) {
        window.clearTimeout(bypassTimeoutRef.current);
      }
      navigationBypassRef.current = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      allowNavigationOnce,
      navigationBypassActive,
      navigationBypassRef,
    }),
    [allowNavigationOnce, navigationBypassActive],
  );

  return <NavigationGuardContext.Provider value={value}>{children}</NavigationGuardContext.Provider>;
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error("useNavigationGuard must be used within NavigationGuardProvider");
  }

  return context;
}
