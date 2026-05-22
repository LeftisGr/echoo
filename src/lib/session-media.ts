export const MEDIA_UPLOAD_BUCKET = "echoo-media";
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_SIZE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 28 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 20;
export const MAX_MEDIA_MESSAGES_PER_SESSION = 4;
export const MEDIA_UPLOAD_COOLDOWN_MS = 15000;
export const MAX_IMAGE_EDGE_PX = 1600;
export const IMAGE_QUALITY = 0.82;

export type MediaKind = "image" | "audio" | "video";

export interface MediaPreviewData {
  kind: MediaKind;
  file: File;
  previewUrl: string;
  displayName: string;
  size: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
}

export interface PreparedMediaUpload {
  file: File;
  kind: MediaKind;
  contentType: string;
  displayName: string;
  size: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
}

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedAudioTypes = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"]);
const supportedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function isSupportedImageType(type: string) {
  return supportedImageTypes.has(type);
}

export function isSupportedAudioType(type: string) {
  return supportedAudioTypes.has(type);
}

export function isSupportedVideoType(type: string) {
  return supportedVideoTypes.has(type);
}

export function isSupportedMediaFile(file: File) {
  return isSupportedImageType(file.type) || isSupportedAudioType(file.type) || isSupportedVideoType(file.type);
}

export function getMediaKind(file: File): MediaKind | null {
  if (isSupportedImageType(file.type)) {
    return "image";
  }

  if (isSupportedAudioType(file.type)) {
    return "audio";
  }

  if (isSupportedVideoType(file.type)) {
    return "video";
  }

  return null;
}

export function sanitizeMediaFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "media";
}

export async function compressImageFile(file: File) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const drawImage = async () => {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.width = width;
      canvas.height = height;
      if (!context) {
        return { width: bitmap.width, height: bitmap.height };
      }
      context.drawImage(bitmap, 0, 0, width, height);
      return { width, height };
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Unable to read image."));
        nextImage.src = objectUrl;
      });
      const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.width = width;
      canvas.height = height;
      if (!context) {
        return { width: image.naturalWidth, height: image.naturalHeight };
      }
      context.drawImage(image, 0, 0, width, height);
      return { width, height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const { width, height } = await drawImage();

  if (!context) {
    return {
      file,
      width,
      height,
    };
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", IMAGE_QUALITY);
  });

  if (!blob) {
    return {
      file,
      width,
      height,
    };
  }

  const nextFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  return {
    file: nextFile,
    width,
    height,
  };
}

export function getVideoMetadata(file: File) {
  return new Promise<{ durationSeconds: number; width: number; height: number }>((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(video.duration) ? Math.max(1, Math.round(video.duration)) : 0;
      resolve({
        durationSeconds,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      cleanup();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Unable to read video metadata."));
    };
  });
}

export function getAudioMetadata(file: File) {
  return new Promise<{ durationSeconds: number }>((resolve, reject) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
      audio.load();
    };

    audio.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(audio.duration) ? Math.max(1, Math.round(audio.duration)) : 0;
      resolve({ durationSeconds });
      cleanup();
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error("Unable to read audio metadata."));
    };
  });
}

export async function prepareMediaUpload(file: File): Promise<PreparedMediaUpload> {
  const kind = getMediaKind(file);
  if (!kind) {
    throw new Error("Unsupported media file.");
  }

  if (kind === "image") {
    const compressed = await compressImageFile(file);
    return {
      file: compressed.file,
      kind,
      contentType: compressed.file.type,
      displayName: sanitizeMediaFileName(file.name),
      size: compressed.file.size,
      width: compressed.width,
      height: compressed.height,
    };
  }

  if (kind === "audio") {
    const metadata = await getAudioMetadata(file);
    return {
      file,
      kind,
      contentType: file.type,
      displayName: sanitizeMediaFileName(file.name),
      size: file.size,
      durationSeconds: metadata.durationSeconds,
    };
  }

  const metadata = await getVideoMetadata(file);
  return {
    file,
    kind,
    contentType: file.type,
    displayName: sanitizeMediaFileName(file.name),
    size: file.size,
    durationSeconds: metadata.durationSeconds,
    width: metadata.width,
    height: metadata.height,
  };
}
