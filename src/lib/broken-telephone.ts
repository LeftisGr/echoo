import { supabase } from "@/integrations/supabase/client";

const BT_BUCKET = "echoo-bt";

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

// Public URL για playback (το bucket είναι public)
export async function getPlaybackUrl(
  audioPath: string,
  audioBucket: string
): Promise<string | null> {
  return `https://dfaevplpniphpgnljrpn.supabase.co/storage/v1/object/public/${audioBucket}/${audioPath}`;
}

// Upload audio και αντικατέστησε το active μήνυμα
export async function submitBrokenTelephone(
  audioBlob: Blob,
  durationSeconds: number,
  userId: string
): Promise<boolean> {
  try {
    const ext = audioBlob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${userId}/broken-telephone/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BT_BUCKET)
      .upload(path, audioBlob, {
        contentType: audioBlob.type,
        upsert: true,
      });

    if (uploadError) return false;

    const { error: rpcError } = await supabase.rpc("replace_broken_telephone", {
      p_audio_path: path,
      p_audio_bucket: BT_BUCKET,
      p_duration_seconds: Math.round(durationSeconds),
    });

    return !rpcError;
  } catch {
    return false;
  }
}