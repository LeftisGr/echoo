import { Link, Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { CalmStateCard } from "@/components/presence/calm-state-card";
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
    rerollUsername,
    hapticsEnabled,
    reconnectEnabled,
    matchSoundEnabled,
    setHapticsEnabled,
    setReconnectEnabled,
    setMatchSoundEnabled,
    logout,
  } = usePresence();

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
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={rerollUsername}
            >
              {copy.auth.reroll}
            </Button>
          </div>
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
            <SwitchRow label={copy.settings.matchSound} checked={matchSoundEnabled} onCheckedChange={setMatchSoundEnabled} />
            <SwitchRow label={copy.settings.reconnect} checked={reconnectEnabled} onCheckedChange={setReconnectEnabled} />
          </Surface>
        </div>
      </div>

      <Surface className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/dashboard">
            <Button className="h-12 w-full rounded-full bg-violet-500 text-white hover:bg-violet-400">{copy.nav.dashboard}</Button>
          </Link>
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
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-white/75">{label}</p>
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
