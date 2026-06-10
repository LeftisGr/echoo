import { supabase } from "@/integrations/supabase/client";
import { logErrorEvent } from "@/lib/operational-logs";

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

async function getSessionToken() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session?.user?.id || !session.access_token) {
    return null;
  }

  return session.access_token;
}

export async function requestEphemeralContentAccess(messageId: string): Promise<SignedContentResponse | null> {
  const accessToken = await getSessionToken();
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(CONTENT_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "sign", messageId }),
    });

    if (response.status === 401) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as SignedContentResponse | { error?: string } | null;
    if (!response.ok) {
      throw new Error((payload && "error" in payload && payload.error) || "Could not open content.");
    }

    return payload as SignedContentResponse;
  } catch (error) {
    await logErrorEvent("content_api_failure", {
      error,
      errorMessage: error instanceof Error ? error.message : "Could not open content.",
      properties: {
        action: "sign",
        messageId,
      },
    });
    throw new Error("Could not open content.");
  }
}

export async function cleanupExpiredEphemeralContent() {
  const accessToken = await getSessionToken();
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(CONTENT_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "cleanup" }),
    });

    if (response.status === 401) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as CleanupContentResponse | { error?: string } | null;
    if (!response.ok) {
      await logErrorEvent("content_api_failure", {
        errorMessage: (payload && "error" in payload && payload.error) || "Could not clean up content.",
        properties: {
          action: "cleanup",
          status: response.status,
        },
      });
      return null;
    }

    return payload as CleanupContentResponse;
  } catch {
    return null;
  }
}
