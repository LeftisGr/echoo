import { useEffect, useRef } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

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

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appReady, initializing, copy } = usePresence();

  const { isStandalone } = usePwaInstall();
  const initialRouteHandledRef = useRef(false);
  const storedRoute = readStoredRoute();

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
      <div className="flex h-[100dvh] items-center justify-center bg-[#08101b] px-4 text-center text-white">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/35">Echoo</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{copy.misc.restoring}</h1>
        </div>
      </div>
    );
  }

  return (
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
        <Route path="/retention" element={<RetentionPage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route path="/terms" element={<TermsPage />} />
        <Route path="/admin/presence" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
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
