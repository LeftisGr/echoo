import { Link } from "react-router-dom";
import { Globe, Menu, Shield, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePresence } from "@/components/presence/presence-provider";

function MenuSheet() {
  const { copy } = usePresence();

  const links = [
    { to: "/dashboard", label: copy.nav.dashboard, icon: Sparkles },
    { to: "/safety", label: copy.nav.safety, icon: Shield },
    { to: "/settings", label: copy.nav.settings, icon: Globe },
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
      <SheetContent side="right" className="border-white/10 bg-[#0d1020] text-white">
        <SheetHeader>
          <SheetTitle className="text-left text-white">{copy.nav.menu}</SheetTitle>
        </SheetHeader>
        <div className="mt-8 space-y-3">
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
          <Link
            to="/contact"
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
          >
            {copy.nav.contact}
          </Link>
          <Link
            to="/admin/presence"
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50 transition hover:bg-white/10 hover:text-white/80"
          >
            {copy.nav.admin}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PresenceLogo({ compact = false }: { compact?: boolean }) {
  const { copy } = usePresence();

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[15px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        E
      </div>
      {!compact && (
        <div>
          <p className="text-[0.9rem] font-semibold tracking-[0.34em] text-white uppercase">
            Echoo
          </p>

          <p className="text-xs text-white/50">{copy.brand.waitlist}</p>
        </div>
      )}
    </div>
  );
}

export function LanguageToggle() {
  const { language, setLanguage } = usePresence();

  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
      <button
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition",
          language === "en" ? "bg-white text-slate-950" : "text-white/60",
        )}
        onClick={() => setLanguage("en")}
        type="button"
      >
        EN
      </button>
      <button
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition",
          language === "el" ? "bg-white text-slate-950" : "text-white/60",
        )}
        onClick={() => setLanguage("el")}
        type="button"
      >
        EL
      </button>
    </div>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <PresenceLogo />
          </Link>
          <LanguageToggle />
        </header>
        <main className={cn("flex-1", className)}>{children}</main>
      </div>
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
  const { copy } = usePresence();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090b14]/90 px-4 py-3 backdrop-blur xl:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <MenuSheet />
        <Link to="/auth" className="flex-1">
          <Button className="h-12 w-full rounded-full bg-violet-500 text-white hover:bg-violet-400">
            {copy.landing.stickySession}
          </Button>
        </Link>
      </div>
    </div>
  );
}
