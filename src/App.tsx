import { useCallback, useEffect, useRef, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { PresenceProvider, usePresence } from "@/components/presence/presence-provider";

import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { PwaSplashScreen } from "@/components/pwa/pwa-splash";
import { PwaProvider } from "@/hooks/use-pwa-install";

import AdminPage from "@/pages/AdminPage";
import AuthPage from "@/pages/AuthPage";
import CommunityGuidelinesPage from "@/pages/CommunityGuidelinesPage";
import ContactPage from "@/pages/ContactPage";
import DashboardPage from "@/pages/DashboardPage";
import Index from "@/pages/Index";
import LearnPage from "@/pages/LearnPage";
import NotFound from "@/pages/NotFound";
import ProfilePage from "@/pages/ProfilePage";
import QueuePage from "@/pages/QueuePage";
import RetentionPage from "@/pages/RetentionPage";
import SessionPage from "@/pages/SessionPage";
import SettingsPage from "@/pages/SettingsPage";
import SupportPage from "@/pages/SupportPage";
import TrustSafetyPage from "@/pages/TrustSafetyPage";
import VoiceUnlockPage from "@/pages/VoiceUnlockPage";
import { Navigate, Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useBlocker, useLocation, useNavigate } from "react-router-dom";

const queryClient = new QueryClient();
const routeStorageKey = "presence-mvp-route";

function readStoredRoute() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(routeStorageKey);
}

function writeStoredRoute(route: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(routeStorageKey, route);
}

function isRouteBypassed(pathname: string) {
  return ["/admin", "/profile", "/settings"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function BackNavigationGuard() {
  const { queue, room, matchTransition, roomLoaded, cancelQueue, leaveRoom, copy } = usePresence();
  const location = useLocation();
  const navigate = useNavigate();

  const isQueueRoute = location.pathname === "/queue";
  const isRoomRoute = location.pathname === "/session" || location.pathname.startsWith("/session/");
  const queueGuardActive = isQueueRoute && queue.active && !matchTransition && !room;
  const roomGuardActive = isRoomRoute && roomLoaded && room?.status === "active";
  const guardActive = (queueGuardActive || roomGuardActive) && !isRouteBypassed(location.pathname);
  const blocker = useBlocker(guardActive);

  const [modalOpen, setModalOpen] = useState(false);
  const pendingActionRef = useRef<"queue" | "room" | null>(null);

  useEffect(() => {
    if (blocker.state === "blocked") {
      pendingActionRef.current = roomGuardActive ? "room" : "queue";
      setModalOpen(true);
      return;
    }

    pendingActionRef.current = null;
    setModalOpen(false);
  }, [blocker.state, location.pathname, queueGuardActive, roomGuardActive]);

  useEffect(() => {
    if (!guardActive) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [guardActive]);

  const closeModal = useCallback(() => {
    pendingActionRef.current = null;
    setModalOpen(false);
    blocker.reset();
  }, [blocker]);

  const handleLeave = useCallback(async () => {
    const action = pendingActionRef.current ?? (roomGuardActive ? "room" : "queue");
    setModalOpen(false);
    pendingActionRef.current = null;

    if (action === "queue") {
      await cancelQueue();
    } else {
      leaveRoom(copy.session.partnerDisconnected);
    }

    blocker.reset();
    navigate("/dashboard", { replace: true });
  }, [blocker, cancelQueue, copy.session.partnerDisconnected, leaveRoom, location.pathname, navigate, roomGuardActive]);

  const title = pendingActionRef.current === "room" ? copy.session.backLeaveTitle : copy.queue.backLeaveTitle;
  const body = pendingActionRef.current === "room" ? copy.session.backLeaveBody : copy.queue.backLeaveBody;
  const stayLabel = pendingActionRef.current === "room" ? copy.session.backStay : copy.queue.backStay;
  const leaveLabel = pendingActionRef.current === "room" ? copy.session.backLeave : copy.queue.backLeave;

  return (
    <AlertDialog
      open={modalOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeModal();
        }
      }}
    >
      <AlertDialogContent className="border-white/10 bg-[#0f1424] text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line text-white/55">{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={closeModal}>
            {stayLabel}
          </Button>
          <Button className="rounded-full bg-rose-500 text-white hover:bg-rose-400" onClick={() => void handleLeave()}>
            {leaveLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function AppLayoutContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appReady, initializing, copy } = usePresence();
  const initialRouteHandledRef = useRef(false);
  const storedRoute = readStoredRoute();
  const isStandalone = isStandaloneMode();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[app] runtime error", {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[app] unhandled rejection", { reason: event.reason });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const updateViewportVars = () => {
      const viewport = window.visualViewport;
      const viewportHeight = Math.round(viewport?.height ?? window.innerHeight);
      const viewportOffsetTop = Math.round(viewport?.offsetTop ?? 0);
      const keyboardHeight = Math.max(0, Math.round(window.innerHeight - viewportHeight - viewportOffsetTop));

      document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`);
      document.documentElement.style.setProperty("--viewport-offset-top", `${viewportOffsetTop}px`);
      document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
    };

    updateViewportVars();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateViewportVars);
    viewport?.addEventListener("scroll", updateViewportVars);
    window.addEventListener("resize", updateViewportVars);
    window.addEventListener("orientationchange", updateViewportVars);
    window.addEventListener("pageshow", updateViewportVars);

    return () => {
      viewport?.removeEventListener("resize", updateViewportVars);
      viewport?.removeEventListener("scroll", updateViewportVars);
      window.removeEventListener("resize", updateViewportVars);
      window.removeEventListener("orientationchange", updateViewportVars);
      window.removeEventListener("pageshow", updateViewportVars);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    writeStoredRoute(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!appReady || initialRouteHandledRef.current) {
      return;
    }

    initialRouteHandledRef.current = true;

    if (location.pathname === "/" && storedRoute && storedRoute !== "/") {
      navigate(storedRoute, { replace: true });
    }
  }, [appReady, location.pathname, navigate, storedRoute]);

  if (initializing || !appReady) {
    return isStandalone ? (
      <PwaSplashScreen message={copy.misc.restoring} />
    ) : (
      <div className="flex h-[var(--app-height,100vh)] items-center justify-center bg-[#08101b] px-4 text-center text-white">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/35">Echoo</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{copy.misc.restoring}</h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <BackNavigationGuard />
      <div key={location.pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Outlet />
      </div>
    </>
  );
}

function AppLayout() {
  return <AppLayoutContent />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/queue" element={<QueuePage />} />
      <Route path="/session" element={<SessionPage />} />
      <Route path="/session/:roomId" element={<SessionPage />} />
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/trust-safety" element={<TrustSafetyPage />} />
      <Route path="/about" element={<Navigate to="/learn#about" replace />} />
      <Route path="/faq" element={<Navigate to="/learn#faq" replace />} />
      <Route path="/how-echoo-works" element={<Navigate to="/learn#how-echoo-works" replace />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
      <Route path="/retention" element={<RetentionPage />} />
      <Route path="/voice-unlock" element={<VoiceUnlockPage />} />
      <Route path="/safety" element={<Navigate to="/trust-safety#safety" replace />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/privacy" element={<Navigate to="/trust-safety#privacy" replace />} />
      <Route path="/terms" element={<Navigate to="/trust-safety#terms" replace />} />
      <Route path="/admin" element={<AdminPage />} />

      <Route path="/admin/presence" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <PwaProvider>
        <PwaBootstrap />
        <PresenceProvider>
          <RouterProvider router={router} />
          <Toaster />
        </PresenceProvider>

      </PwaProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
