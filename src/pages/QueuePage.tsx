import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LoaderCircle, TimerReset, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell, Surface } from "@/components/presence/presence-shell";
import { usePresence } from "@/components/presence/presence-provider";
import { queueMessages } from "@/lib/presence-content";

const QueuePage = () => {
  const navigate = useNavigate();
  const { authenticated, queue, room, cancelQueue, copy, language, online } = usePresence();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!room) {
      setCountdown(3);
      return;
    }

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          navigate("/session", { replace: true });
          return 0;
        }
        return current - 1;
      });
    }, 900);

    return () => window.clearInterval(interval);
  }, [navigate, room]);

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!queue.active && !room) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentMessage = queueMessages[language][queue.messageIndex] ?? queueMessages[language][0];
  const progressValue = room ? 100 : queue.softRelaxed ? 78 : 54;

  return (
    <PageShell className="flex items-center">
      <Surface className="mx-auto w-full max-w-2xl space-y-6 p-6 text-center sm:p-10">
        {!online && (
          <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-center justify-center gap-2">
              <WifiOff className="h-4 w-4" />
              {copy.queue.offline}
            </div>
          </div>
        )}

        {!room ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-violet-100">
              <LoaderCircle className="h-10 w-10 animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Echoo live queue</p>

              <h1 className="text-3xl font-semibold tracking-tight text-white">{copy.queue.title}</h1>
              <p className="text-sm text-white/60">{copy.queue.body}</p>
            </div>
            <div className="space-y-4 rounded-[28px] border border-white/10 bg-black/25 p-5">
              <p className="text-lg text-white">{currentMessage}</p>
              <Progress value={progressValue} className="h-2 rounded-full bg-white/10 [&>div]:bg-violet-400" />
              <div className="flex items-center justify-center gap-2 text-sm text-white/55">
                <TimerReset className="h-4 w-4 text-violet-200" />
                <span>{queue.estimatedWaitSeconds}s</span>
              </div>
            </div>
            {queue.softRelaxed && (
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                {copy.queue.relaxed}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={async () => {
                  await cancelQueue();
                  navigate("/dashboard", { replace: true });
                }}
              >
                {copy.queue.cancel}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-full border-violet-400/20 bg-violet-400/10 text-violet-50 hover:bg-violet-400/15"
                onClick={() => navigate("/settings")}
              >
                {copy.queue.changeFilters}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-16 rounded-[22px] bg-white/10" />
              <Skeleton className="h-16 rounded-[22px] bg-white/10" />
              <Skeleton className="h-16 rounded-[22px] bg-white/10" />
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
              <LoaderCircle className="h-10 w-10 animate-spin" />
            </div>
            <p className="text-sm uppercase tracking-[0.28em] text-white/40">{copy.queue.found}</p>
            <h1 className="text-5xl font-semibold text-white">{countdown}</h1>
            <div className="rounded-[26px] border border-white/10 bg-black/25 p-5">
              <p className="text-sm text-white/50">Partner</p>
              <p className="mt-2 text-2xl font-semibold text-white">{room.partner.username}</p>
            </div>
          </>
        )}
      </Surface>
    </PageShell>
  );
};

export default QueuePage;
