import { useCallback, useEffect, useRef, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PresenceProvider, usePresence } from "@/components/presence/presence-provider";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { PwaSplashScreen } from "@/components/pwa/pwa-splash";
import { PwaProvider, usePwaInstall } from "@/hooks/use-pwa-install";
import AboutPage from "@/pages/AboutPage";
import AdminPage from "@/pages/AdminPage";
import AuthPage from "@/pages/AuthPage";
import CommunityGuidelinesPage from "@/pages/CommunityGuidelinesPage";
import ContactPage from "@/pages/ContactPage";
import DashboardPage from "@/pages/DashboardPage";
import FAQPage from "@/pages/FAQPage";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import PrivacyPage from "@/pages/PrivacyPage";
import ProfilePage from "@/pages/ProfilePage";
import QueuePage from "@/pages/QueuePage";
import RetentionPage from "@/pages/RetentionPage";
import SafetyPage from "@/pages/SafetyPage";
import SessionPage from "@/pages/SessionPage";
import SettingsPage from "@/pages/SettingsPage";
import SupportPage from "@/pages/SupportPage";
import TermsPage from "@/pages/TermsPage";
import VoiceUnlockPage from "@/pages/VoiceUnlockPage";

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

function BackNavigationGuard() {
  const { queue, room, cancelQueue, leaveRoom, copy, language } = usePresence();
  const navigate = useNavigate();
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const pendingActionRef = useRef<"queue" | "room" | null>(null);
  const armedRef = useRef(false);
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const guardMode = room?.status === "active" ? "room" : queue.active ? "queue" : null;

  const closeModal = useCallback(() => {
    pendingActionRef.current = null;
    setModalOpen(false);
  }, []);

  useEffect(() => {
    if (!guardMode) {
      armedRef.current = false;
      closeModal();
      return;
    }

    if (modalOpen) {
      pendingActionRef.current = guardMode;
    }

    if (!armedRef.current) {
      armedRef.current = true;
      window.history.pushState({ echooBackGuard: true, guardMode, currentUrl }, "", currentUrl);
    }
  }, [closeModal, currentUrl, guardMode, modalOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (!guardMode) {
        return;
      }

      pendingActionRef.current = guardMode;
      setModalOpen(true);
      window.history.pushState({ echooBackGuard: true, guardMode, currentUrl }, "", currentUrl);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUrl, guardMode]);

  const handleLeave = useCallback(async () => {
    const action = pendingActionRef.current;
    closeModal();

    if (action === "queue") {
      await cancelQueue();
      navigate("/dashboard", { replace: true });
      return;
    }

    if (action === "room") {
      leaveRoom(copy.session.partnerDisconnected);
    }
  }, [cancelQueue, closeModal, copy.session.partnerDisconnected, leaveRoom, navigate]);

  const title = pendingActionRef.current === "room" ? copy.session.backLeaveTitle : copy.queue.backLeaveTitle;
  const body = pendingActionRef.current === "room" ? copy.session.backLeaveBody : copy.queue.backLeaveBody;
  const stayLabel = pendingActionRef.current === "room" ? copy.session.backStay : copy.queue.backStay;
  const leaveLabel = pendingActionRef.current === "room" ? copy.session.backLeave : copy.queue.backLeave;

  return (
    <AlertDialog open={modalOpen} onOpenChange={(open) => (!open ? closeModal() : setModalOpen(true))}>
      <AlertDialogContent className="border-white/10 bg-[#0f1424] text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-white/55">{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={closeModal}>
            {stayLabel}
          </AlertDialogCancel>
          <AlertDialogAction className="rounded-full bg-rose-500 text-white hover:bg-rose-400" onClick={() => void handleLeave()}>
            {leaveLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appReady, initializing, copy } = usePresence();

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

  const { isStandalone } = usePwaInstall();
  const initialRouteHandledRef = useRef(false);
  const storedRoute = readStoredRoute();

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
      <Routes location={location}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/session/:roomId" element={<SessionPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
        <Route path="/retention" element={<RetentionPage />} />
        <Route path="/voice-unlock" element={<VoiceUnlockPage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route path="/terms" element={<TermsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/presence" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />

      </Routes>
      </div>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <PwaProvider>
        <PwaBootstrap />
        <PresenceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-center" richColors />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </PresenceProvider>
      </PwaProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
