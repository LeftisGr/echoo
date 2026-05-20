import { CheckCircle2, Download, ExternalLink, Smartphone } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePresence } from "@/components/presence/presence-provider";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallButton({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { language } = usePresence();
  const { installState, promptInstall } = usePwaInstall();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  if (installState === "hidden") {
    return null;
  }

  if (installState === "installed") {
    return (
      <Badge
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 text-emerald-50 hover:bg-emerald-400/10",
          compact && "h-10 px-3 text-[11px] uppercase tracking-[0.22em]",
          className,
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>{language === "en" ? "Installed" : "Εγκατεστημένο"}</span>
      </Badge>
    );
  }

  if (installState === "available") {
    return (
      <Button
        type="button"
        className={cn(
          "h-11 rounded-full bg-violet-500 px-4 text-white hover:bg-violet-400",
          compact && "px-3 text-sm",
          className,
        )}
        onClick={async () => {
          await promptInstall();
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        {language === "en" ? "Install Echoo" : "Εγκατάσταση Echoo"}
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 rounded-full border-violet-300/20 bg-violet-400/10 px-4 text-violet-50 hover:bg-violet-400/15 hover:text-violet-50",
          compact && "px-3 text-sm",
          className,
        )}
        onClick={() => setIosHelpOpen(true)}
      >
        <Smartphone className="mr-2 h-4 w-4" />
        {language === "en" ? "Install Echoo" : "Εγκατάσταση Echoo"}
      </Button>

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent className="border-white/10 bg-[#0d1020] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-white">
              {language === "en" ? "Add Echoo to your Home Screen" : "Πρόσθεσε το Echoo στην Αρχική οθόνη"}
            </DialogTitle>
            <DialogDescription className="text-left text-white/60">
              {language === "en"
                ? "iPhone and iPad use Safari’s Share menu instead of the browser install prompt."
                : "Στο iPhone και iPad η εγκατάσταση γίνεται από το μενού Κοινή χρήση του Safari."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-sm leading-6 text-white/75">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white">1. {language === "en" ? "Open Echoo in Safari" : "Άνοιξε το Echoo στο Safari"}</p>
              <p className="mt-1 text-white/60">
                {language === "en"
                  ? "Use Safari on iPhone or iPad to see the Share button in the bottom toolbar."
                  : "Χρησιμοποίησε το Safari σε iPhone ή iPad για να δεις το κουμπί Κοινή χρήση στη μπάρα κάτω."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white">2. {language === "en" ? "Tap Share" : "Πάτησε Κοινή χρήση"}</p>
              <p className="mt-1 text-white/60">
                {language === "en"
                  ? "Choose the square-with-arrow icon from the browser toolbar."
                  : "Επίλεξε το εικονίδιο με το τετράγωνο και το βέλος από τη μπάρα του browser."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white">3. {language === "en" ? "Select Add to Home Screen" : "Επίλεξε Προσθήκη στην Αρχική"}</p>
              <p className="mt-1 text-white/60">
                {language === "en"
                  ? "Confirm to create the installed Echoo app on your device."
                  : "Επιβεβαίωσε για να δημιουργηθεί η εγκατεστημένη εφαρμογή Echoo στη συσκευή σου."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button className="h-11 rounded-full bg-violet-500 text-white hover:bg-violet-400" onClick={() => setIosHelpOpen(false)}>
              {language === "en" ? "Got it" : "Έγινε"}
            </Button>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {language === "en" ? "Learn more" : "Μάθε περισσότερα"}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
