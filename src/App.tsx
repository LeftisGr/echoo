import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { PresenceProvider, usePresence } from "@/components/presence/presence-provider";
import AdminPage from "@/pages/AdminPage";
import AuthPage from "@/pages/AuthPage";
import ContactPage from "@/pages/ContactPage";
import DashboardPage from "@/pages/DashboardPage";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import PrivacyPage from "@/pages/PrivacyPage";
import QueuePage from "@/pages/QueuePage";
import SafetyPage from "@/pages/SafetyPage";
import SessionPage from "@/pages/SessionPage";
import SettingsPage from "@/pages/SettingsPage";
import TermsPage from "@/pages/TermsPage";

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();
  const { authenticated, room, sessionReady } = usePresence();

  if (sessionReady && authenticated && room?.status === "active" && location.pathname !== "/session") {
    return <Navigate to="/session" replace />;
  }

  return (
    <div key={location.pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Routes location={location}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/contact" element={<ContactPage />} />
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
      <PresenceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" richColors />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </PresenceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;