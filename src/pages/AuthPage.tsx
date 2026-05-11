import { useState } from "react";
import { Mail, RefreshCcw, Shield, Sparkles, UserRound } from "lucide-react";

import { Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import {
  ageRangeOptions,
  genderOptions,
  interestTags,
  languageOptions,
  localizeAgeRange,
  localizeGender,
  localizeLanguagePreference,
  localizePreference,
  preferenceOptions,
} from "@/lib/presence-content";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const { copy, language, login, profile, rerollUsername, updateProfile, authenticated } = usePresence();

  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageShell className="space-y-6">
      <Surface className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5">
          <SectionTitle eyebrow="Echoo" title={copy.auth.title} body={copy.auth.body} />

          <div className="rounded-[28px] border border-violet-400/15 bg-violet-400/10 p-5 text-sm leading-7 text-violet-50">
            <p className="font-medium">{copy.auth.helper}</p>
            <div className="mt-4 flex items-center gap-2 text-violet-100/75">
              <Shield className="h-4 w-4" />
              <span>{copy.landing.safetyBody}</span>
            </div>
          </div>
          <div className="space-y-3 rounded-[28px] border border-white/10 bg-black/20 p-4">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="name@example.com"
              className="h-12 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/35"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                className="h-12 rounded-full bg-white text-slate-950 hover:bg-white/90"
                onClick={async () => {
                  await login("google");
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {copy.auth.google}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-full border-violet-400/20 bg-violet-400/10 text-violet-50 hover:bg-violet-400/15 hover:text-violet-50"
                onClick={async () => {
                  await login("guest");
                }}
              >
                <UserRound className="mr-2 h-4 w-4" />
                {copy.auth.guest}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={async () => {
                  await login("magic", email);
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                {copy.auth.magic}
              </Button>
            </div>

          </div>
        </div>

        {profile ? (
          <div className="space-y-4">
            <Surface className="space-y-4 bg-black/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white/50">{copy.auth.profileTitle}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">{profile.username}</h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={rerollUsername}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {copy.auth.reroll}
                </Button>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[#0a0d18] p-4 text-sm text-white/70">
                <p>{copy.brand.tagline}</p>
              </div>
            </Surface>

            <ProfileSelectGroup
              label={copy.auth.ageRange}
              values={ageRangeOptions}
              activeValue={profile.ageRange}
              getLabel={(value) => localizeAgeRange(language, value)}
              onSelect={(value) => updateProfile({ ageRange: value })}
            />
            <ProfileSelectGroup
              label={copy.auth.gender}
              values={genderOptions}
              activeValue={profile.gender}
              getLabel={(value) => localizeGender(language, value)}
              onSelect={(value) => updateProfile({ gender: value })}
            />
            <ProfileSelectGroup
              label={copy.auth.lookingFor}
              values={preferenceOptions}
              activeValue={profile.preference}
              getLabel={(value) => localizePreference(language, value)}
              onSelect={(value) => updateProfile({ preference: value })}
            />
            <ProfileSelectGroup
              label={copy.auth.language}
              values={languageOptions}
              activeValue={profile.language}
              getLabel={(value) => localizeLanguagePreference(language, value)}
              onSelect={(value) => updateProfile({ language: value })}
            />

            <Surface className="space-y-4 bg-black/20 p-5">
              <p className="text-sm text-white/55">{copy.auth.interests}</p>
              <div className="flex flex-wrap gap-2">
                {interestTags.map((tag) => {
                  const active = profile.interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={active ? activeTagClass : tagClass}
                      onClick={() => {
                        const nextInterests = active
                          ? profile.interests.filter((item) => item !== tag)
                          : [...profile.interests, tag].slice(-6);
                        updateProfile({ interests: nextInterests });
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Surface>
          </div>
        ) : (
          <Surface className="space-y-4 bg-black/20 p-6 text-white/75">
            <p className="text-sm uppercase tracking-[0.2em] text-white/45">{copy.auth.profileTitle}</p>
            <h2 className="text-2xl font-semibold text-white">{copy.brand.name}</h2>
            <p className="text-sm leading-7 text-white/65">
              {language === "en"
                ? "Sign in or sign up to unlock your personal profile, queue settings, and room history."
                : "Συνδέσου ή κάνε εγγραφή για να ξεκλειδώσεις το προσωπικό προφίλ, τις ρυθμίσεις ουράς και το ιστορικό των rooms."}
            </p>
          </Surface>
        )}
      </Surface>
    </PageShell>
  );
};

function ProfileSelectGroup<T extends string>({
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
    <Surface className="space-y-3 bg-black/20 p-5">
      <p className="text-sm text-white/55">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const active = value === activeValue;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={active ? activeTagClass : tagClass}
            >
              {getLabel(value)}
            </button>
          );
        })}
      </div>
    </Surface>
  );
}

const tagClass =
  "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white";

const activeTagClass =
  "rounded-full border border-violet-400/20 bg-violet-400/15 px-4 py-2 text-sm text-violet-50 transition hover:bg-violet-400/20";

export default AuthPage;