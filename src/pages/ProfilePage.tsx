import { useEffect, useState } from "react";

import { ArrowRight, LoaderCircle, MoonStar, PencilLine, Shield } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PageShell, SectionTitle, Surface } from "@/components/presence/presence-shell";
import { SupportCard } from "@/components/support/support-card";
import { usePresence } from "@/components/presence/presence-provider";

import { interestTags } from "@/lib/presence-content";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const vibeChoices = ["night owl", "deep talker", "soft listener", "curious mind"] as const;

function formatJoinDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const ProfilePage = () => {

  const {
    authenticated,
    profile,
    copy,
    language,
    updateProfile,
    login,
    blockedUserCount,
    blockedUserIds,
    supporter,
  } = usePresence();

  const [draftBio, setDraftBio] = useState("");
  const [draftInterests, setDraftInterests] = useState<string[]>([]);
  const [draftVibeLabel, setDraftVibeLabel] = useState<(typeof vibeChoices)[number]>(vibeChoices[0]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDraftBio(profile.bio ?? "");
    setDraftInterests(profile.interests);
    setDraftVibeLabel(profile.vibeLabel as (typeof vibeChoices)[number]);
  }, [profile]);

  const isRegistered = profile?.profileMode === "registered";
  const avatarLabel = profile?.avatarEmoji ?? profile?.username?.slice(0, 1).toUpperCase() ?? "E";

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <PageShell className="flex items-center">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
          <Surface className="space-y-4 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-white/65">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>{copy.misc.loadingProfile}</span>
            </div>
            <div className="h-20 rounded-[24px] border border-white/10 bg-white/5" />
          </Surface>
        </div>
      </PageShell>
    );
  }

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        bio: isRegistered ? draftBio.trim() || null : profile.bio,
        avatarEmoji: profile.avatarEmoji,
        avatarUrl: profile.avatarUrl,
        interests: isRegistered ? draftInterests : profile.interests,
        vibeLabel: isRegistered ? draftVibeLabel : profile.vibeLabel,
        profileMode: isRegistered ? "registered" : "guest",
      });
    } catch (error) {

      toast.error(error instanceof Error ? error.message : language === "en" ? "Profile save failed." : "Η αποθήκευση προφίλ απέτυχε.");
    } finally {
      setSaving(false);
    }
  };

  return (

    <PageShell className="space-y-6">
      <Surface className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow={copy.auth.profileTitle}
            title={isRegistered ? (language === "en" ? "Registered profile" : "Εγγεγραμμένο προφίλ") : (language === "en" ? "Guest profile" : "Guest προφίλ")}
            body={
              isRegistered
                ? language === "en"
                  ? "A lightweight profile with just enough detail to help Echoo find the right conversation."
                  : "Ένα ελαφρύ προφίλ με όσα χρειάζεται το Echoo για να βρει τη σωστή κουβέντα."
                : language === "en"
                  ? "Keep it light. Your nickname stays private, and your tiny chat avatar only appears while you’re chatting."
                  : "Κράτα το ελαφρύ. Το ψευδώνυμό σου μένει ιδιωτικό και το μικρό chat avatar εμφανίζεται μόνο όταν μιλάς."

            }
          />

          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70 hover:bg-white/5">
              {profile.profileMode === "registered" ? (language === "en" ? "Registered" : "Εγγεγραμμένο") : (language === "en" ? "Guest" : "Guest")}
            </Badge>
            <Badge className="rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-100 hover:bg-violet-500/10">
              {profile.vibeLabel}
            </Badge>
            {supporter && (
              <Badge className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-50 hover:bg-rose-500/10">
                ❤️ Supporter
              </Badge>
            )}

          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Surface className={cn("space-y-5 bg-[#0d1424]/80 p-5", supporter ? "border-rose-300/15" : "border-white/10")}>

            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <AvatarFallback className="bg-[#121b31] text-2xl text-white">{avatarLabel}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-white/35">{language === "en" ? "Chat identity" : "Ταυτότητα chat"}</p>
                <Input
                  value={profile.username}
                  readOnly
                  tabIndex={-1}
                  className="h-12 rounded-full border-violet-400/15 bg-violet-400/10 text-white placeholder:text-white/30"
                  placeholder={language === "en" ? "Your nickname" : "Το ψευδώνυμό σου"}
                  maxLength={28}
                />
                <p className="text-xs leading-5 text-white/40">
                  {language === "en"
                    ? "This little avatar shows up next to your messages."
                    : "Αυτό το μικρό avatar εμφανίζεται δίπλα στα μηνύματά σου."}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/60">
              {isRegistered
                ? language === "en"
                  ? "Registered profiles keep the same calm identity across sessions."
                  : "Τα registered προφίλ κρατούν την ίδια ήρεμη ταυτότητα σε όλα τα sessions."
                : language === "en"
                  ? "Guest profiles stay quiet and lightweight, with an avatar that only shows while you chat."
                  : "Τα guest profiles μένουν ήσυχα και ελαφριά, με avatar που εμφανίζεται μόνο όταν μιλάς."}
            </div>
            {supporter && (
              <div className="rounded-[24px] border border-rose-300/15 bg-rose-500/10 p-4 text-sm leading-6 text-rose-50">
                <p className="font-medium">❤️ Supporter</p>
                <p className="mt-1 text-rose-50/75">{copy.settings.supporterNote}</p>
              </div>
            )}

            {!isRegistered && (

              <div className="space-y-3 rounded-[24px] border border-violet-300/15 bg-violet-500/10 p-4 text-sm text-violet-50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/15 bg-white/10">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{language === "en" ? "Upgrade when it feels right" : "Κάνε upgrade όταν σου ταιριάξει"}</p>
                    <p className="mt-1 text-sm leading-6 text-violet-50/75">
                      {language === "en"
                        ? "Keep the same calm profile, then make it permanent with a registered account."
                        : "Κράτα το ίδιο ήρεμο προφίλ και μετά κάν' το μόνιμο με έναν εγγεγραμμένο λογαριασμό."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="h-11 w-full rounded-full bg-violet-500 text-white hover:bg-violet-400"
                  onClick={async () => {
                    await login("google");
                  }}
                >
                  {language === "en" ? "Upgrade to registered" : "Μετάβαση σε registered"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </Surface>

          <div className="space-y-5">
            {isRegistered ? (
              <Surface className="space-y-5 border-white/10 bg-[#0d1424]/80 p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/35">{language === "en" ? "Bio" : "Bio"}</p>
                      <p className="mt-1 text-sm text-white/60">
                        {language === "en"
                          ? "Short, private, and optional."
                          : "Σύντομο, ιδιωτικό και προαιρετικό."}
                      </p>
                    </div>
                    <Badge className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/65 hover:bg-white/5">
                      {profile.conversationsCompleted} {language === "en" ? "conversations" : "συνομιλίες"}
                    </Badge>
                  </div>
                  <Textarea
                    value={draftBio}
                    onChange={(event) => setDraftBio(event.target.value)}
                    placeholder={language === "en" ? "A quiet line about you..." : "Μια ήσυχη γραμμή για σένα..."}
                    className="min-h-28 rounded-[24px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
                    maxLength={180}
                  />
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MoonStar className="h-4 w-4 text-violet-200" />
                    <span>{language === "en" ? "Vibe" : "Vibe"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vibeChoices.map((vibe) => {
                      const active = draftVibeLabel === vibe;
                      return (
                        <button
                          key={vibe}
                          type="button"
                          onClick={() => setDraftVibeLabel(vibe)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm transition",
                            active ? "border-violet-300/20 bg-violet-500/15 text-violet-50" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                          )}
                        >
                          {vibe}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <PencilLine className="h-4 w-4 text-violet-200" />
                    <span>{language === "en" ? "Interests" : "Ενδιαφέροντα"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {interestTags.map((tag) => {
                      const active = draftInterests.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setDraftInterests((current) =>
                              current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(-6),
                            );
                          }}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm transition",
                            active ? "border-violet-300/20 bg-violet-500/15 text-violet-50" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Surface>
            ) : (
              <Surface className="space-y-5 border-white/10 bg-[#0d1424]/80 p-5">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/65">
                  {language === "en"
                    ? "Guest mode keeps things intentionally small: just a nickname, a soft avatar, and room to disappear when you're done."
                    : "Το guest mode κρατά τα πράγματα επίτηδες μικρά: μόνο ένα ψευδώνυμο, ένα ήπιο avatar και χώρο να χαθείς όταν τελειώσεις."}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard
                    label={language === "en" ? "Join date" : "Ημερομηνία"}
                    value={formatJoinDate(profile.createdAt)}
                  />
                  <StatCard
                    label={language === "en" ? "Blocked" : "Μπλοκαρισμένοι"}
                    value={String(blockedUserCount)}
                  />
                  <StatCard
                    label={language === "en" ? "Mode" : "Λειτουργία"}
                    value={language === "en" ? "Guest" : "Guest"}
                  />
                </div>
              </Surface>
            )}

            <Surface className="space-y-5 border-white/10 bg-[#0d1424]/80 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={language === "en" ? "Conversations" : "Συνομιλίες"} value={String(profile.conversationsCompleted)} />
                <StatCard label={language === "en" ? "Streak" : "Streak"} value={`${profile.streakDays}d`} />
                <StatCard label={language === "en" ? "Joined" : "Joined"} value={formatJoinDate(profile.createdAt)} />
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/65">
                {language === "en"
                  ? "Echoo keeps stats gentle: conversations, streaks, and the vibe you bring back. No vanity metrics, no followers, no feed."
                  : "Το Echoo κρατά τα stats ήπια: συνομιλίες, streaks και το vibe που φέρνεις πίσω. Χωρίς vanity metrics, χωρίς followers, χωρίς feed."}
              </div>
            </Surface>

            <Surface className="space-y-4 border-white/10 bg-[#0d1424]/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">{language === "en" ? "Privacy" : "Απόρρητο"}</p>
                  <p className="mt-1 text-sm text-white/60">
                    {language === "en"
                      ? "Blocked users stay private and are automatically excluded from future matches."
                      : "Οι μπλοκαρισμένοι χρήστες μένουν ιδιωτικοί και αποκλείονται αυτόματα από μελλοντικά matches."}
                  </p>
                </div>
                <Badge className="rounded-full border border-rose-300/15 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-50 hover:bg-rose-500/10">
                  {blockedUserCount}
                </Badge>
              </div>
              {blockedUserIds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">{language === "en" ? "Blocked list" : "Λίστα αποκλεισμών"}</p>
                  <div className="flex flex-wrap gap-2">
                    {blockedUserIds.map((blockedUserId) => (
                      <span
                        key={blockedUserId}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70"
                      >
                        {blockedUserId.slice(0, 8)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/60">
                {language === "en"
                  ? "No public profile browsing, no follower counts, and no pressure to perform. Your account only remembers what helps Echoo work better for you."
                  : "Χωρίς δημόσια περιήγηση προφίλ, χωρίς counts followers και χωρίς πίεση για επίδειξη. Ο λογαριασμός σου θυμάται μόνο ό,τι βοηθά το Echoo να δουλεύει καλύτερα για σένα."}
              </div>

            </Surface>
          </div>
        </div>
      </Surface>

      <SupportCard language={language} />

      <Surface className="space-y-4 p-5 sm:p-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-white/55">{language === "en" ? "Next step" : "Επόμενο βήμα"}</p>
            <p className="mt-1 text-lg font-medium text-white">
              {isRegistered
                ? language === "en"
                  ? "Your profile is ready for calmer matching."
                  : "Το προφίλ σου είναι έτοιμο για πιο ήρεμο matching."
                : language === "en"
                  ? "Upgrade whenever you want a permanent Echoo identity."
                  : "Κάνε upgrade όποτε θέλεις μια μόνιμη Echoo ταυτότητα."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="h-12 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {language === "en" ? "Saving" : "Αποθήκευση"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {language === "en" ? "Save profile" : "Αποθήκευση προφίλ"}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/settings">{language === "en" ? "Open settings" : "Άνοιγμα ρυθμίσεων"}</Link>
            </Button>
          </div>
        </div>
      </Surface>
    </PageShell>
  );
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/35">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export default ProfilePage;
