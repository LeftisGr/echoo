import { supabase } from "@/integrations/supabase/client";

const CONTENT_FUNCTION_URL = "https://dfaevplpniphpgnljrpn.supabase.co/functions/v1/content";

interface SignedContentResponse {
  messageId: string;
  roomId: string;
  signedUrl: string;
  expiresInSeconds: number;
  consumedAt: string;
}

interface CleanupContentResponse {
  deletedCount: number;
  storageDeletedCount: number;
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function requestEphemeralContentAccess(messageId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Authentication is required.");
  }

  const response = await fetch(CONTENT_FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "sign", messageId }),
  });

  const payload = (await response.json().catch(() => null)) as SignedContentResponse | { error?: string } | null;
  if (!response.ok) {
    throw new Error((payload && "error" in payload && payload.error) || "Could not open content.");
  }

  return payload as SignedContentResponse;
}

export async function cleanupExpiredEphemeralContent() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  const response = await fetch(CONTENT_FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "cleanup" }),
  });

  const payload = (await response.json().catch(() => null)) as CleanupContentResponse | { error?: string } | null;
  if (!response.ok) {
    return null;
  }

  return payload as CleanupContentResponse;
}
