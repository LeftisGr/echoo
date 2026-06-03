import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface NavigationGuardContextValue {
  allowNavigationOnce: () => void;
  navigationBypassRef: MutableRefObject<boolean>;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigationBypassRef = useRef(false);
  const bypassTimeoutRef = useRef<number | null>(null);

  const allowNavigationOnce = useCallback(() => {
    navigationBypassRef.current = true;

    if (bypassTimeoutRef.current) {
      window.clearTimeout(bypassTimeoutRef.current);
    }

    bypassTimeoutRef.current = window.setTimeout(() => {
      navigationBypassRef.current = false;
      bypassTimeoutRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    navigationBypassRef.current = false;

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
      navigationBypassRef,
    }),
    [allowNavigationOnce],
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
