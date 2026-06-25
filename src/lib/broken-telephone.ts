import { supabase } from "@/integrations/supabase/client";

const BT_BUCKET = "echoo-bt";
const SUPABASE_URL = "https://dfaevplpniphpgnljrpn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYWV2cGxwbmlwaHBnbmxqcnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTU5MDIsImV4cCI6MjA5MzAzMTkwMn0.bZrxEu-OUv5Foegg8eNCArqUOftknBzg8OfBkJn11wQ";

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

// Public URL για playback
export async function getPlaybackUrl(
  audioPath: string,
  audioBucket: string
): Promise<string | null> {
  return `${SUPABASE_URL}/storage/v1/object/public/${audioBucket}/${audioPath}`;
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

    // Παίρνουμε το token από το shim session
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) return false;

    // Upload με fetch απευθείας ώστε να χρησιμοποιεί το σωστό auth token
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BT_BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": audioBlob.type,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: audioBlob,
      }
    );

    if (!uploadResponse.ok) return false;

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