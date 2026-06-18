import { Link, Navigate } from "react-router-dom";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { CalmStateCard } from "@/components/presence/calm-state-card";
import { SupportCard } from "@/components/support/support-card";
import { usePresence } from "@/components/presence/presence-provider";

import { languageOptions, localizeLanguagePreference, localizePreference, preferenceOptions } from "@/lib/presence-content";
import { upperWithoutAccents } from "@/lib/utils";

const SettingsPage = () => {
  const {
    authenticated,
    profile,
    copy,
    language,
    setLanguage,
    updateProfile,
    hapticsEnabled,
    reconnectEnabled,
    matchSoundEnabled,
    setHapticsEnabled,
    setReconnectEnabled,

    setMatchSoundEnabled,
    logout,
    guestMode,
  } = usePresence();

  const supporter = profile?.supporterBadge ?? false;
  const isGuestAccount = guestMode || profile?.profileMode === "guest";
  const { theme, setTheme } = useTheme();

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-0">
          <CalmStateCard
            eyebrow="Echoo"
            title={copy.settings.title}
            body={language === "en" ? "Your settings are quietly coming back." : "Οι ρυθμίσεις σου επιστρέφουν ήσυχα."}
            status={copy.misc.loadingSettings}
          />
        </div>
      </PageShell>

    );
  }

  return (
    <PageShell className="space-y-6">
      <Surface className="space-y-4 p-6 sm:p-8">
        <SectionTitle title={copy.settings.title} body={copy.settings.body} />
      </Surface>

    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Surface className="space-y-4 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">{copy.auth.profileTitle}</p>
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/50">{language === "en" ? "Nickname" : "Ψευδώνυμο"}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{profile.username}</p>
          <div className="mt-4 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-50">
            {isGuestAccount ? (language === "en" ? "Guest account" : "Guest λογαριασμός") : (language === "en" ? "Nickname locked" : "Το ψευδώνυμο είναι κλειδωμένο")}
          </div>
          {supporter && (
            <div className="mt-3 space-y-2">
              <div className="inline-flex items-center rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-50">
                ❤️ Supporter
              </div>
              <p className="text-xs leading-5 text-white/45">{copy.settings.supporterNote}</p>
            </div>
          )}

        </div>
        {isGuestAccount ? (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">{language === "en" ? "Account type" : "Τύπος λογαριασμού"}</p>
            <p className="mt-2 text-sm font-medium text-white">{language === "en" ? "Anonymous user" : "Ανώνυμος χρήστης"}</p>
            <p className="mt-2 text-xs leading-5 text-white/40">
              {language === "en"
                ? "Guest accounts do not show email or profile IDs."
                : "Οι guest λογαριασμοί δεν εμφανίζουν email ή profile IDs."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/35">{language === "en" ? "Signed-in email" : "Email σύνδεσης"}</p>
              <p className="mt-2 break-all text-sm font-medium text-white">{profile.email ?? (language === "en" ? "No email on this account" : "Δεν υπάρχει email σε αυτόν τον λογαριασμό")}</p>
              <p className="mt-2 text-xs leading-5 text-white/40">
                {language === "en"
                  ? "This confirms which registered account is active."
                  : "Αυτό επιβεβαιώνει ποιος registered λογαριασμός είναι ενεργός."}
              </p>
            </div>
            <div className="flex items-end">
              <Button asChild className="h-11 w-full rounded-full bg-violet-500 px-4 text-white hover:bg-violet-400">
                <Link to="/profile">{language === "en" ? "Edit profile" : "Επεξεργασία προφίλ"}</Link>
              </Button>
            </div>
          </div>
        )}
        <p className="text-sm leading-6 text-white/60">{copy.auth.helper}</p>
      </Surface>

        <div className="space-y-4">

          <SettingPills
            label={copy.settings.appLanguage}
            values={["en", "el"] as const}
            activeValue={language}
            getLabel={(value) => upperWithoutAccents(value, language)}

            onSelect={setLanguage}
          />
          <SettingPills
            label={copy.settings.queueLanguage}
            values={languageOptions}
            activeValue={profile.language}
            getLabel={(value) => localizeLanguagePreference(language, value)}
            onSelect={(value) => updateProfile({ language: value })}
          />
          <SettingPills
            label={copy.settings.lookingFor}
            values={preferenceOptions}
            activeValue={profile.preference}
            getLabel={(value) => localizePreference(language, value)}
            onSelect={(value) => updateProfile({ preference: value })}
          />

          <Surface className="space-y-5 p-5">
            <SwitchRow label={copy.settings.haptics} checked={hapticsEnabled} onCheckedChange={setHapticsEnabled} />
            <SwitchRow
              label={copy.settings.matchSound}
              description={language === "en" ? "Soft tones for room opening, push-to-talk, and unlock moments." : "Απαλοί ήχοι για άνοιγμα room, push-to-talk και ξεκλειδώματα."}
              checked={matchSoundEnabled}
              onCheckedChange={setMatchSoundEnabled}
            />
            <SwitchRow label={copy.settings.reconnect} checked={reconnectEnabled} onCheckedChange={setReconnectEnabled} />
            
          </Surface>
        </div>
      </div>

      <SupportCard language={language} />

      <Surface className="space-y-4 p-5 sm:p-6">

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild className="h-12 w-full rounded-full bg-violet-500 text-white hover:bg-violet-400">
            <Link to="/dashboard">{copy.nav.dashboard}</Link>
          </Button>
          <Button variant="outline" className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={logout}>
            {copy.settings.signOut}
          </Button>
        </div>

      </Surface>
    </PageShell>
  );
};

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="space-y-1">
        <p className="text-sm text-white/75">{label}</p>
        {description && <p className="max-w-xs text-xs leading-5 text-white/45">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SettingPills<T extends string>({
  label,
  values,
  activeValue,
  getLabel,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  activeValue: T;
  getLabel: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <Surface className="space-y-3 p-5">
      <p className="text-sm text-white/55">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const active = value === activeValue;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={active ? "rounded-full border border-violet-400/20 bg-violet-400/15 px-4 py-2 text-sm text-violet-50" : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70"}
            >
              {getLabel(value)}
            </button>
          );
        })}
      </div>
    </Surface>
  );
}

export default SettingsPage;
