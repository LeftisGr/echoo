import { Link } from "react-router-dom";
import { Globe, Home, Menu, Shield, Sparkles, UserCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePresence } from "@/components/presence/presence-provider";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

function MenuSheet() {
  const { copy, isAdmin } = usePresence();

  const links = [
    { to: "/", label: copy.nav.home, icon: Sparkles },
    { to: "/dashboard", label: copy.nav.dashboard, icon: Sparkles },
    { to: "/about", label: copy.nav.about, icon: Globe },
    { to: "/faq", label: copy.nav.faq, icon: Sparkles },
    { to: "/support", label: copy.nav.support, icon: Shield },
    { to: "/community-guidelines", label: copy.nav.guidelines, icon: Shield },
    { to: "/voice-unlock", label: copy.nav.voiceUnlock, icon: Sparkles },
    { to: "/safety", label: copy.nav.safety, icon: Shield },
    { to: "/settings", label: copy.nav.settings, icon: Globe },
    { to: "/privacy", label: copy.nav.privacy, icon: Shield },
    { to: "/terms", label: copy.nav.terms, icon: Shield },

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
        <div className="mt-8 space-y-3 pb-6 pr-1">
          <div className="rounded-[24px] border border-violet-300/15 bg-violet-500/10 p-3">
            <PwaInstallButton className="w-full justify-center" />
          </div>
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin/presence"
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
  const nextLabel = language === "en" ? "EL" : "EN";

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium tracking-[0.18em] text-white transition hover:bg-white/10"
      onClick={() => setLanguage(language === "en" ? "el" : "en")}
      type="button"
      aria-label={nextLabel}
      title={nextLabel}
    >
      {nextLabel}
    </button>
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

export function PageShell({
  children,
  className,
  showStickyBottomBar = true,
}: {
  children: React.ReactNode;
  className?: string;
  showStickyBottomBar?: boolean;
}) {
  return (
    <div className="min-h-[var(--app-height,100vh)] overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-[var(--app-height,100vh)] w-full max-w-6xl flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6 lg:pb-28 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <PresenceLogo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ProfileButton />
          </div>
        </header>

        <main className={cn("flex-1", className)}>{children}</main>
      </div>
      {showStickyBottomBar && <StickyBottomBar />}
    </div>
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
          <Link to="/" aria-label={copy.nav.home} title={copy.nav.home}>
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
