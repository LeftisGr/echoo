import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";

interface NavigationGuardContextValue {
  allowNavigationOnce: () => void;
  navigationBypassActive: boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [navigationBypassActive, setNavigationBypassActive] = useState(false);
  const bypassTimeoutRef = useRef<number | null>(null);

  const allowNavigationOnce = useCallback(() => {
    flushSync(() => {
      setNavigationBypassActive(true);
    });

    if (bypassTimeoutRef.current) {
      window.clearTimeout(bypassTimeoutRef.current);
    }

    bypassTimeoutRef.current = window.setTimeout(() => {
      setNavigationBypassActive(false);
      bypassTimeoutRef.current = null;
    }, 10000);

  }, []);

  useEffect(() => {
    if (!navigationBypassActive) {
      return;
    }

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
    };
  }, []);

  const value = useMemo(
    () => ({
      allowNavigationOnce,
      navigationBypassActive,
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
