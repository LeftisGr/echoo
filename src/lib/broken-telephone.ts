import { supabase } from "@/integrations/supabase/client";
import { MEDIA_UPLOAD_BUCKET } from "@/lib/session-media";

export interface BrokenTelephoneMessage {
  id: string;
  audioPath: string;
  audioBucket: string;
  durationSeconds: number;
  createdAt: string;
}

// Φέρε το active μήνυμα (αν υπάρχει)
export async function fetchActiveBrokenTelephone(): Promise<BrokenTelephoneMessage | null> {
  try {
    const { data, error } = await supabase.rpc("get_active_broken_telephone");
    if (error || !data || data.length === 0) return null;

    const row = data[0];
    return {
      id: row.id,
      audioPath: row.audio_path,
      audioBucket: row.audio_bucket,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

// Δημιούργησε signed URL για playback
export async function getPlaybackUrl(
  audioPath: string,
  audioBucket: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(audioBucket)
      .createSignedUrl(audioPath, 60); // 60s TTL
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

// Upload audio και αντικατέστησε το active μήνυμα
export async function submitBrokenTelephone(
  audioBlob: Blob,
  durationSeconds: number,
  userId: string
): Promise<boolean> {
  try {
    const ext = audioBlob.type.includes("mp4") ? "mp4" : "webm";
    const path = `broken-telephone/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_UPLOAD_BUCKET)
      .upload(path, audioBlob, {
        contentType: audioBlob.type,
        upsert: true,
      });

    if (uploadError) return false;

    const { error: rpcError } = await supabase.rpc("replace_broken_telephone", {
      p_audio_path: path,
      p_audio_bucket: MEDIA_UPLOAD_BUCKET,
      p_duration_seconds: Math.round(durationSeconds),
    });

    return !rpcError;
  } catch {
    return false;
  }
}