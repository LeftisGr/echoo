import { CircleOff, Eye, Lock, Play, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaChatMessage } from "@/lib/presence-types";

export function SessionMediaMessage({
  message,
  isSelf,
  opening,
  onOpen,
}: {
  message: MediaChatMessage;
  isSelf: boolean;
  opening: boolean;
  onOpen: (messageId: string) => void;
}) {
  const isOpen = Boolean(message.media.url);
  const isExpired = !isOpen && Boolean(message.mediaConsumedAt);

  return (
    <div className={cn("overflow-hidden rounded-[22px] border shadow-sm", isSelf ? "border-violet-200/20 bg-white text-slate-950" : "border-white/10 bg-white/5 text-white")}>
      <div className={cn("border-b px-4 py-3 text-xs uppercase tracking-[0.22em]", isSelf ? "border-black/5 bg-black/5 text-black/45" : "border-white/5 bg-white/5 text-white/50")}>
        <div className="flex items-center gap-2">
          {message.media.kind === "video" ? <Video className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{message.media.kind === "video" ? "Video" : "Photo"}</span>
        </div>
      </div>

      {isOpen ? (
        message.media.kind === "image" ? (
          <img
            src={message.media.url ?? undefined}
            alt={message.media.name}
            className="max-h-[24rem] w-full select-none object-cover"
            loading="lazy"
            decoding="async"
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
          />
        ) : (
          <video
            src={message.media.url ?? undefined}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            className="max-h-[24rem] w-full bg-black object-cover"
            onContextMenu={(event) => event.preventDefault()}
          />
        )
      ) : (
        <div className={cn("space-y-3 p-4", isExpired ? "bg-black/10" : "bg-black/5")}>
          <div className="flex items-start gap-3">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", isSelf ? "border-black/10 bg-black/5 text-black/55" : "border-white/10 bg-white/5 text-white/70")}>
              {isExpired ? <CircleOff className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">{isExpired ? "Expired" : "Open once"}</p>
              <p className={cn("text-sm leading-6", isSelf ? "text-slate-600" : "text-white/65")}>
                {isExpired
                  ? "This moment is no longer available."
                  : "Tap to reveal this content. It will fade automatically after a few seconds."}
              </p>
            </div>
          </div>

          {!isExpired && (
            <Button
              type="button"
              className={cn(
                "h-11 rounded-full px-4 transition-transform duration-150 active:scale-95",
                isSelf ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-violet-500 text-white hover:bg-violet-400",
              )}
              onClick={() => onOpen(message.id)}
              disabled={opening}
            >
              <Eye className="mr-2 h-4 w-4" />
              {opening ? "Opening..." : "Open content"}
            </Button>
          )}
        </div>
      )}

      {(message.content || message.media.name) && !isOpen && (
        <div className={cn("border-t px-4 py-3 text-sm leading-6", isSelf ? "border-black/5 text-slate-700" : "border-white/5 text-white/70")}>
          {message.content || message.media.name}
        </div>
      )}

      {isOpen && (
        <div className={cn("border-t px-4 py-3 text-sm leading-6", isSelf ? "border-black/5 text-slate-700" : "border-white/5 text-white/70")}>
          <span className="inline-flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Visible temporarily
          </span>
        </div>
      )}
    </div>
  );
}
