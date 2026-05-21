import { Play, Video } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/presence-types";

export function SessionMediaMessage({
  message,
  isSelf,
  onViewed,
}: {
  message: ChatMessage;
  isSelf: boolean;
  onViewed?: () => void;
}) {
  const viewedRef = useRef(false);
  const viewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (viewTimerRef.current !== null) {
        window.clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, []);

  const scheduleViewed = () => {
    if (viewedRef.current || !onViewed) {
      return;
    }

    viewedRef.current = true;
    if (viewTimerRef.current !== null) {
      window.clearTimeout(viewTimerRef.current);
    }

    viewTimerRef.current = window.setTimeout(() => {
      onViewed();
    }, 8000);
  };

  if (message.type !== "media" || !message.media) {
    return null;
  }

  return (
    <div className={cn("overflow-hidden rounded-[22px] border shadow-sm", isSelf ? "border-violet-200/20 bg-white text-slate-950" : "border-white/10 bg-white/5 text-white")}>
      <div className={cn("border-b px-4 py-3 text-xs uppercase tracking-[0.22em]", isSelf ? "border-black/5 bg-black/5 text-black/45" : "border-white/5 bg-white/5 text-white/50")}>
        <div className="flex items-center gap-2">
          {message.media.kind === "video" ? <Video className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{message.media.kind === "video" ? "Video" : "Photo"}</span>
        </div>
      </div>

      {message.media.kind === "image" ? (
        <img
          src={message.media.url}
          alt={message.media.name}
          className="max-h-[24rem] w-full select-none object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          onContextMenu={(event) => event.preventDefault()}
          onLoad={scheduleViewed}
        />
      ) : (
        <video
          src={message.media.url}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          className="max-h-[24rem] w-full bg-black object-cover"
          onLoadedData={scheduleViewed}
          onContextMenu={(event) => event.preventDefault()}
        />
      )}

      {(message.content || message.media.name) && (
        <div className="px-4 py-3 text-sm leading-6">
          {message.content || message.media.name}
        </div>
      )}
    </div>
  );
}
