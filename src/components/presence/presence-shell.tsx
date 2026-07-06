import { Link } from "react-router-dom";
import { AlertTriangle, Globe, Home, Menu, Shield, Sparkles, UserCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePresence } from "@/components/presence/presence-provider";
import { SocialLinks } from "@/components/presence/social-links";
import { HowEchooWorksProvider, useHowEchooWorks } from "@/components/presence/how-echoo-works";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

function MenuSheet() {
  const { copy, isAdmin, language } = usePresence();

  const appLinks = [
    { to: "/", label: copy.nav.home, icon: Sparkles },
    { to: "/dashboard", label: copy.nav.dashboard, icon: Sparkles },
    { to: "/whats-next", label: language === "en" ? "What’s Next" : "Τι ακολουθεί", icon: Sparkles },

    { to: "/settings", label: copy.nav.settings, icon: Globe },
    { to: "/voice-unlock", label: copy.nav.voiceUnlock, icon: Sparkles },
    { to: "/community-guidelines", label: copy.nav.guidelines, icon: Shield },
  ];

  const learnLinks = [
    { to: "/learn#about", label: copy.nav.about, icon: Globe },
    { to: "/learn#faq", label: copy.nav.faq, icon: Sparkles },
    { to: "/learn#how-echoo-works", label: language === "el" ? "Πώς λειτουργεί το Echoo" : "How Echoo works", icon: Sparkles },
  ];

  const trustLinks = [
    { to: "/trust-safety#safety", label: copy.nav.safety, icon: Shield },
    { to: "/trust-safety#privacy", label: copy.nav.privacy, icon: Shield },
    { to: "/trust-safety#terms", label: copy.nav.terms, icon: Shield },
  ];

  const linkGroups = [
    { title: copy.nav.learn, links: learnLinks },
    { title: copy.nav.trustSafety, links: trustLinks },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white"
        >
          <Menu className="mr-2 h-4 w-4" />
          {copy.landing.stickyMenu}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="max-h-[var(--app-height,100vh)] overflow-y-auto border-white/10 bg-[#0d1020] text-white overscroll-contain">
        <SheetHeader>
          <SheetTitle className="text-left text-white">{copy.nav.menu}</SheetTitle>
        </SheetHeader>
        <div className="mt-8 space-y-4 pb-6 pr-1">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {appLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0f1526] px-3 py-3 text-sm text-white/80 transition hover:bg-white/10"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-violet-300/15 bg-violet-500/10 p-3">
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/support">{copy.nav.support}</Link>
              </Button>
            </SheetClose>
          </div>

          <div className="md:hidden">
            <Accordion type="single" collapsible className="space-y-3">
              {linkGroups.map((group) => (
                <AccordionItem key={group.title} value={group.title} className="rounded-[24px] border border-white/10 bg-white/5 px-4">
                  <AccordionTrigger className="text-left text-sm font-medium text-white hover:no-underline">
                    {group.title}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <div className="grid gap-2">
                      {group.links.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1526] px-4 py-3 text-sm text-white/78 transition hover:bg-white/10"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="hidden gap-3 md:grid md:grid-cols-2">
            {linkGroups.map((group) => (
              <div key={group.title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/35">{group.title}</p>
                <div className="mt-3 grid gap-2">
                  {group.links.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1526] px-4 py-3 text-sm text-white/78 transition hover:bg-white/10"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <SocialLinks compact />
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50 transition hover:bg-white/10 hover:text-white/80"
            >
              {copy.nav.admin}
            </Link>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PresenceLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center">
      <p
        className={cn(
          "font-serif text-2xl font-semibold tracking-[0.22em] text-white sm:text-3xl",
          compact && "text-xl sm:text-2xl",
        )}
      >
        Echoo
      </p>
    </div>
  );
}

export function LanguageToggle() {
  const { language, setLanguage } = usePresence();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="inline-flex max-w-full rounded-full border border-white/10 bg-white/5 p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
          className={cn(
            "rounded-full px-2.5 py-1.5 text-[11px] font-medium leading-none tracking-[0.12em] transition sm:px-3",
            language === "en" ? "bg-white text-[#0f1424]" : "text-white/70 hover:bg-white/10 hover:text-white",
          )}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguage("el")}
          aria-pressed={language === "el"}
          className={cn(
            "rounded-full px-2.5 py-1.5 text-[11px] font-medium leading-none tracking-[0.12em] transition sm:px-3",
            language === "el" ? "bg-white text-[#0f1424]" : "text-white/70 hover:bg-white/10 hover:text-white",
          )}
        >
          Ελληνικά (Beta)
        </button>
      </div>
      <p className="max-w-[11rem] text-right text-[10px] leading-tight text-white/38">
        Some translations may still evolve.
      </p>
    </div>
  );
}

function ProfileButton() {
  const { authenticated, profile, copy } = usePresence();
  const to = authenticated ? "/profile" : "/auth";
  const label = authenticated ? profile?.username ?? copy.auth.profileTitle : copy.misc.signIn;

  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 hover:text-white"
    >
      <UserCircle2 className="h-5 w-5" />
    </Link>
  );
}

function ServiceStatusBanner() {
  const { serviceStatuses } = usePresence();

  const activeStatuses = Object.entries(serviceStatuses).filter(([, status]) => status !== "healthy") as Array<
    [keyof typeof serviceStatuses, (typeof serviceStatuses)[keyof typeof serviceStatuses]]
  >;

  if (!activeStatuses.length) {
    return null;
  }

  return (

    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-[22px] border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-white/80 shadow-[0_14px_40px_rgba(245,158,11,0.08)]"

    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200/15 bg-amber-200/10 text-amber-50">
          <AlertTriangle className="h-4 w-4" />

        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-white">Some rooms may take longer than usual.</p>
          <div className="flex flex-wrap gap-2">
            {activeStatuses.map(([service, status]) => (
              <Badge
                key={service}
                className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/10"
              >
                {service === "contentSharing" ? "Content sharing" : service === "voice" ? "Voice" : "Matching"} · {status === "maintenance" ? "Maintenance" : "Degraded"}
              </Badge>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}

export function PageShell({

  children,
  className,
  showStickyBottomBar = true,
}: {
  children: React.ReactNode;
  className?: string;
  showStickyBottomBar?: boolean;
}) {
  const { authenticated } = usePresence();

  return (
    <HowEchooWorksProvider>
      <div className="min-h-[var(--app-height,100vh)] overflow-x-hidden bg-background text-foreground">
        <div className="mx-auto flex min-h-[var(--app-height,100vh)] w-full max-w-6xl flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6 lg:pb-28 lg:px-8">
          <header className="mb-6 flex items-center justify-between gap-4">
            <Link to={authenticated ? "/dashboard" : "/"} className="shrink-0">
              <PresenceLogo />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ProfileButton />
            </div>
          </header>

          <ServiceStatusBanner />

          <main className={cn("flex-1", className)}>{children}</main>

        </div>
        {showStickyBottomBar && <StickyBottomBar />}
      </div>
    </HowEchooWorksProvider>
  );
}

export function Surface({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(5,8,18,0.28)] backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="space-y-3">
      {eyebrow && (
        <Badge className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-medium text-violet-100 hover:bg-violet-400/10">
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      {body && <p className="max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{body}</p>}
    </div>
  );
}

export function StickyBottomBar() {
  const { authenticated, copy } = usePresence();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090b14]/92 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3">
        <Button asChild variant="ghost" className="h-12 rounded-full border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white">
          <Link to={authenticated ? "/dashboard" : "/"} aria-label={copy.nav.home} title={copy.nav.home}>
            <Home className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">{copy.nav.home}</span>
          </Link>
        </Button>

        <MenuSheet />

        <Button asChild className="h-12 rounded-full bg-violet-500 px-4 text-white hover:bg-violet-400">
          <Link to={authenticated ? "/dashboard" : "/auth"}>
            {authenticated ? copy.nav.dashboard : copy.misc.signIn}
          </Link>
        </Button>
      </div>
    </div>
  );
}
