import { supabase } from "@/integrations/supabase/client";
import { MEDIA_UPLOAD_BUCKET, sanitizeMediaFileName, type MediaPreviewData } from "@/lib/session-media";
import type { MediaChatMessage } from "@/lib/presence-types";

const EPHEMERAL_MEDIA_TTL_SECONDS = 18;

function mediaLog(message: string, data?: unknown) {
  if (data !== undefined) {
    console.info("[media]", message, data);
    return;
  }

  console.info("[media]", message);
}

function getSupabaseStorage() {
  mediaLog("supabase instance", {
    hasSupabase: Boolean(supabase),
    hasStorage: Boolean((supabase as { storage?: unknown } | null)?.storage),
  });

  const storage = (supabase as any).storage as {
    from: (bucket: string) => {
      upload: (path: string, file: File, options: { contentType: string; upsert: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  } | null;

  if (!storage) {
    throw new Error("Supabase storage is unavailable.");
  }

  return storage;
}

function getMediaBucket(bucketName = MEDIA_UPLOAD_BUCKET) {
  mediaLog("bucket name", { bucketName });
  return bucketName;
}

export async function getEphemeralSignedUrl(mediaPath: string, expirationSeconds = EPHEMERAL_MEDIA_TTL_SECONDS, bucketName = MEDIA_UPLOAD_BUCKET) {
  const storage = getSupabaseStorage();
  const bucket = getMediaBucket(bucketName);

  if (!mediaPath) {
    throw new Error("Missing media path.");
  }

  mediaLog("signed url requested", {
    bucket,
    mediaPath,
    expirationSeconds,
  });

  const { data, error } = await storage.from(bucket).createSignedUrl(mediaPath, expirationSeconds);
  if (error) {
    mediaLog("signed url failed", {
      bucket,
      mediaPath,
      error: error.message,
    });
    throw error;
  }

  const signedUrl = data?.signedUrl ?? null;
  mediaLog("signed url created", {
    bucket,
    mediaPath,
    hasUrl: Boolean(signedUrl),
  });

  if (!signedUrl) {
    throw new Error("Failed to create signed URL.");
  }

  return signedUrl;
}

export async function uploadMedia({
  roomId,
  userId,
  file,
  caption,
  preview,
  bucketName = MEDIA_UPLOAD_BUCKET,
}: {
  roomId: string;
  userId: string;
  file: File;
  caption: string;
  preview: MediaPreviewData;
  bucketName?: string;
}): Promise<MediaChatMessage> {

  const storage = getSupabaseStorage();
  const bucket = getMediaBucket(bucketName);

  const auth = await supabase.auth.getSession();
  const authUserId = auth.data.session?.user?.id ?? null;

  mediaLog("upload request", {
    bucket,
    roomId,
    userId,
    authUserId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    displayName: preview.displayName,
  });

  if (!authUserId || authUserId !== userId) {
    throw new Error("Unauthorized media upload.");
  }

  const uploadPath = `rooms/${roomId}/${crypto.randomUUID()}-${sanitizeMediaFileName(preview.displayName)}`;
  mediaLog("upload path", { bucket, uploadPath });

  const { error: uploadError } = await storage.from(bucket).upload(uploadPath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    mediaLog("upload failed", {
      bucket,
      uploadPath,
      error: uploadError.message,
    });
    throw uploadError;
  }

  const signedUrl = await getEphemeralSignedUrl(uploadPath, EPHEMERAL_MEDIA_TTL_SECONDS, bucket);

  const createdAt = new Date().toISOString();
  const message: MediaChatMessage = {

    id: crypto.randomUUID(),
    roomId,
    senderId: userId,
    content: caption.trim() || (preview.kind === "image" ? "Photo" : "Video"),
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + EPHEMERAL_MEDIA_TTL_SECONDS * 1000).toISOString(),
    type: "media",
    media: {
      url: signedUrl,
      path: uploadPath,
      mimeType: file.type,
      name: preview.displayName,
      size: file.size,
      kind: preview.kind,
      durationSeconds: preview.durationSeconds,
      width: preview.width,
      height: preview.height,
    },
  };

  mediaLog("upload ready", {
    bucket,
    roomId,
    userId,
    uploadPath,
    messageId: message.id,
  });

  return message;
}

export async function deleteMediaMessage(input: {
  roomId: string;
  messageId: string;
  mediaPath: string;
  reason: "viewed" | "expired" | "orphaned";
  bucketName?: string;
}) {
  const storage = getSupabaseStorage();
  const bucket = getMediaBucket(input.bucketName);

  mediaLog("delete requested", {
    bucket,
    ...input,
  });

  const [removeResult, rowResult] = await Promise.all([
    storage.from(bucket).remove([input.mediaPath]),
    (supabase as any)
      .from("messages")
      .delete()
      .eq("id", input.messageId)
      .eq("room_id", input.roomId),
  ]);

  if (removeResult.error) {
    mediaLog("delete storage failed", {
      bucket,
      mediaPath: input.mediaPath,
      error: removeResult.error.message,
    });
    throw removeResult.error;
  }

  if (rowResult.error) {
    mediaLog("delete row failed", {
      roomId: input.roomId,
      messageId: input.messageId,
      error: rowResult.error.message,
    });
    throw rowResult.error;
  }

  mediaLog("delete completed", {
    bucket,
    ...input,
  });
}

export async function deleteExpiredMedia() {
  const { data, error } = await supabase.rpc("cleanup_expired_messages");

  if (error) {
    mediaLog("cleanup rpc failed", { error: error.message });
    throw error;
  }

  mediaLog("cleanup rpc complete", { deletedCount: data ?? 0 });
  return data ?? 0;
}
