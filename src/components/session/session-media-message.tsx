import { useEffect, useMemo, useRef, useState } from "react";

import { Image, Play, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EPHEMERAL_CONTENT_VIEWER_SECONDS } from "@/lib/ephemeral-content";
import { requestEphemeralContentAccess } from "@/lib/content-api";
import type { ChatMessage } from "@/lib/presence-types";

export function SessionMediaMessage({ message, isSelf }: { message: ChatMessage; isSelf: boolean }) {
  const [openedUrl, setOpenedUrl] = useState<string | null>(message.type === "media" && message.media.url?.startsWith("blob:") ? message.media.url : null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerExpired, setViewerExpired] = useState(false);
  const expiryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (message.type !== "media") {
      return;
    }

    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    setError(null);
    setViewerExpired(false);
    setOpenedUrl(message.media.url?.startsWith("blob:") ? message.media.url : null);
  }, [message]);

  useEffect(() => {
    return () => {
      if (expiryTimerRef.current) {
        window.clearTimeout(expiryTimerRef.current);
      }
    };
  }, []);

  const kindLabel = useMemo(() => {
    if (message.type !== "media") {
      return "Content";
    }

    return message.media.kind === "video" ? "Video" : message.media.kind === "audio" ? "Audio" : "Photo";
  }, [message]);

  if (message.type !== "media" || !message.media) {
    return null;
  }

  const serverExpired = Boolean(message.expiresAt && new Date(message.expiresAt).getTime() <= Date.now());
  const isExpired = viewerExpired || serverExpired;
  const isOpened = Boolean(openedUrl) && !isExpired;
  const canOpen = !isExpired && !message.mediaConsumedAt && !isSelf;

  const startViewerExpiryTimer = () => {
    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
    }

    expiryTimerRef.current = window.setTimeout(() => {
      console.info("[content] content expired", {
        messageId: message.id,
        roomId: message.roomId,
      });
      setOpenedUrl(null);
      setViewerExpired(true);
    }, EPHEMERAL_CONTENT_VIEWER_SECONDS * 1000);
  };

  const openContent = async () => {
    if (!canOpen || opening) {
      return;
    }

    setOpening(true);
    setError(null);
    try {
      if (message.media.url && message.media.url.startsWith("blob:")) {
        console.info("[content] content opened", {
          messageId: message.id,
          roomId: message.roomId,
          source: "local-preview",
        });
        setOpenedUrl(message.media.url);
        startViewerExpiryTimer();
        return;
      }

      const response = await requestEphemeralContentAccess(message.id);
      console.info("[content] signed url created", {
        messageId: message.id,
        roomId: message.roomId,
        expiresInSeconds: response.expiresInSeconds,
      });
      console.info("[content] content opened", {
        messageId: message.id,
        roomId: message.roomId,
        source: "signed-url",
      });
      setOpenedUrl(response.signedUrl);
      startViewerExpiryTimer();
    } catch (contentError) {
      setError(contentError instanceof Error ? contentError.message : "Could not open content.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-[22px] border shadow-sm", isSelf ? "border-violet-200/20 bg-white text-slate-950" : "border-white/10 bg-white/5 text-white")}>
      <div className={cn("flex items-center justify-between gap-3 border-b px-4 py-3 text-xs uppercase tracking-[0.22em]", isSelf ? "border-black/5 bg-black/5 text-black/45" : "border-white/5 bg-white/5 text-white/50")}>
        <div className="flex items-center gap-2">
          {message.media.kind === "video" ? <Video className="h-4 w-4" /> : message.media.kind === "audio" ? <Play className="h-4 w-4" /> : <Image className="h-4 w-4" />}
          <span>{kindLabel}</span>
        </div>
        <span>{serverExpired || viewerExpired || message.mediaConsumedAt ? "Expired" : "Open once"}</span>
      </div>

      {!isOpened ? (
        <div className={cn("space-y-3 p-4", isSelf ? "bg-white" : "bg-transparent")}>
          <p className={cn("text-sm leading-6", isSelf ? "text-slate-700" : "text-white/70")}>{message.content || message.media.name}</p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              className={cn("h-10 rounded-full px-4 text-sm font-medium transition-transform duration-150 active:scale-95", isSelf ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-violet-500 text-white hover:bg-violet-400")}
              disabled={!canOpen || opening}
              onClick={() => {
                void openContent();
              }}
            >
              {opening ? "Opening..." : isExpired || message.mediaConsumedAt ? "Expired" : "Open once"}
            </Button>
            {error ? <span className={cn("text-xs", isSelf ? "text-rose-600" : "text-rose-200")}>{error}</span> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-0">
          {message.media.kind === "audio" ? (
            <audio
              src={openedUrl ?? undefined}
              controls
              autoPlay
              preload="metadata"
              controlsList="nodownload noplaybackrate noremoteplayback"
              className={cn("w-full", isSelf ? "bg-white" : "bg-transparent")}
              onContextMenu={(event) => event.preventDefault()}
            />
          ) : message.media.kind === "video" ? (
            <video
              src={openedUrl ?? undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              className="max-h-[24rem] w-full bg-black object-cover"
              onContextMenu={(event) => event.preventDefault()}
            />
          ) : (
            <img
              src={openedUrl ?? undefined}
              alt={message.media.name}
              className="max-h-[24rem] w-full select-none object-cover"
              loading="eager"
              decoding="async"
              draggable={false}
              onContextMenu={(event) => event.preventDefault()}
            />
          )}

          <div className="flex items-center justify-between gap-3 px-4 pb-4 text-xs text-inherit/50">
            <span>{message.media.name}</span>
            <span>{serverExpired || viewerExpired || message.mediaConsumedAt ? "Expired" : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
