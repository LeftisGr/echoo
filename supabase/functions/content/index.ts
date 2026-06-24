import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EPHEMERAL_CONTENT_TTL_SECONDS = 30;

interface ContentRequestBody {
  action?: "sign" | "cleanup";
  messageId?: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase configuration is missing." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userResult.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const user = userResult.user;
  const body = (await req.json().catch(() => ({}))) as ContentRequestBody;

  if (body.action === "cleanup") {
    const nowIso = new Date().toISOString();
    const { data: expiredMessages, error: loadError } = await supabase
      .from("messages")
      .select("id, media_path, media_bucket, expires_at, media_consumed_at")
      .eq("type", "media")
      .lte("expires_at", nowIso);

    if (loadError) {
      console.error("[content] cleanup load failed", { error: loadError.message });
      return jsonResponse({ error: loadError.message }, 500);
    }

    const messageRows = expiredMessages ?? [];
    const expiredMedia = messageRows.filter((message) => Boolean(message.media_path));
    if (expiredMedia.length) {
      console.info("[content] content expired", {
        messageIds: expiredMedia.map((message) => message.id),
      });
    }

    const removeTargets = expiredMedia.reduce<Record<string, string[]>>((acc, message) => {
      const bucket = message.media_bucket ?? "echoo-media";
      if (!acc[bucket]) {
        acc[bucket] = [];
      }
      acc[bucket].push(message.media_path as string);
      return acc;
    }, {});

    let storageDeletedCount = 0;
    for (const [bucket, paths] of Object.entries(removeTargets)) {
      if (!paths.length) {
        continue;
      }
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) {
        console.error("[content] cleanup storage failed", { bucket, error: removeError.message });
        return jsonResponse({ error: removeError.message }, 500);
      }
      storageDeletedCount += paths.length;
    }

    if (expiredMedia.length) {
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          media_url: null,
          media_consumed_at: nowIso,
        })
        .in("id", expiredMedia.map((message) => message.id));

      if (updateError) {
        console.error("[content] cleanup update failed", { error: updateError.message });
        return jsonResponse({ error: updateError.message }, 500);
      }
    }

    console.info("[content] cleanup complete", {
      deletedCount: expiredMedia.length,
      storageDeletedCount,
    });

    return jsonResponse({ deletedCount: expiredMedia.length, storageDeletedCount });
  }

  if (body.action !== "sign" || !body.messageId) {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const { data: messageRow, error: messageError } = await supabase
    .from("messages")
    .select("id, room_id, sender_id, type, media_path, media_bucket, expires_at, media_consumed_at")
    .eq("id", body.messageId)
    .maybeSingle();

  if (messageError) {
    return jsonResponse({ error: messageError.message }, 500);
  }

  if (!messageRow || messageRow.type !== "media" || !messageRow.media_path) {
    return jsonResponse({ error: "Content not found" }, 404);
  }

  const { data: roomRow, error: roomError } = await supabase
    .from("rooms")
    .select("user_a, user_b")
    .eq("id", messageRow.room_id)
    .maybeSingle();

  if (roomError) {
    return jsonResponse({ error: roomError.message }, 500);
  }

  const isParticipant = roomRow ? roomRow.user_a === user.id || roomRow.user_b === user.id : false;
  if (!isParticipant && messageRow.sender_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (messageRow.expires_at && new Date(messageRow.expires_at).getTime() <= Date.now()) {
    return jsonResponse({ error: "Expired" }, 410);
  }

  if (messageRow.media_consumed_at) {
    return jsonResponse({ error: "Content already opened" }, 409);
  }

  const bucket = messageRow.media_bucket ?? "echoo-media";
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(messageRow.media_path, EPHEMERAL_CONTENT_TTL_SECONDS);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return jsonResponse({ error: signedUrlError?.message ?? "Unable to create signed URL." }, 500);
  }

  const consumedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("messages")
    .update({
      media_consumed_at: consumedAt,
      media_url: null,
    })
    .eq("id", messageRow.id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  console.info("[content] signed url created", {
    messageId: messageRow.id,
    roomId: messageRow.room_id,
    userId: user.id,
    expiresInSeconds: EPHEMERAL_CONTENT_TTL_SECONDS,
  });

  return jsonResponse({
    messageId: messageRow.id,
    roomId: messageRow.room_id,
    signedUrl: signedUrlData.signedUrl,
    expiresInSeconds: EPHEMERAL_CONTENT_TTL_SECONDS,
    consumedAt,
  });
});
