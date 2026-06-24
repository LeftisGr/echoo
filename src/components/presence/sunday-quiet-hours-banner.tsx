import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/presence/presence-shell";

function getSundayCutoff(): number | null {
  const now = new Date();
  const day = now.getDay(); // 0 = Κυριακή
  const hour = now.getHours();

  // Εμφάνιση μόνο Κυριακή 21:00 - 23:59
  if (day === 0 && hour >= 20) {
    // Cutoff = Δευτέρα 00:00 (τέλος της Κυριακής)
    const cutoff = new Date(now);
    cutoff.setHours(24, 0, 0, 0); // επόμενα μεσάνυχτα
    return cutoff.getTime();
  }

  return null;
}

export function SundayQuietHoursBanner() {
  const [visible, setVisible] = useState(() => {
    const cutoff = getSundayCutoff();
    return cutoff !== null && cutoff > Date.now();
  });

  useEffect(() => {
    const cutoff = getSundayCutoff();
    if (!cutoff || cutoff <= Date.now()) {
      setVisible(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, cutoff - Date.now());

    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Surface className="border-violet-300/15 bg-violet-500/10 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-1 text-[11px] font-medium text-violet-50 hover:bg-violet-400/10">
              🌙 Sunday Quiet Hours
            </Badge>
          </div>

          <div className="space-y-2 text-sm leading-6 text-white/75">
            <p>This week we try something different.</p>
            <p>More people may be around Sunday night.</p>
          </div>

          <div className="grid gap-1 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 sm:max-w-[220px]">
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Sunday</p>
            <p className="text-lg font-semibold text-white">21:00–00:00</p>
          </div>

          <div className="space-y-1 text-sm leading-6 text-white/72">
            <p>No profiles.</p>
            <p>No pressure.</p>
            <p>Just conversations.</p>
          </div>
        </div>

        <Button asChild className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400 sm:self-end">
          <Link to="/auth">Join Queue</Link>
        </Button>
      </div>
    </Surface>
  );
}
