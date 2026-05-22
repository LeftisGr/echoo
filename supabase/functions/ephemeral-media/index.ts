import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const MEDIA_URL_TTL_SECONDS = 20

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function createUserClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase configuration is missing.")
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration is missing.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    console.info("[content] unauthorized request")
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  let body: { action?: string; roomId?: string; messageId?: string } | null = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const action = body?.action
  if (!action) {
    return jsonResponse({ error: "Action is required." }, 400)
  }

  const userClient = createUserClient(authHeader)
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    console.info("[content] auth verification failed", {
      error: userError?.message ?? "missing user",
    })
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const userId = userData.user.id
  const serviceClient = createServiceClient()

  if (action === "cleanup") {
    const { data, error } = await serviceClient.rpc("cleanup_expired_messages")
    if (error) {
      console.info("[content] cleanup failed", { userId, error: error.message })
      return jsonResponse({ error: error.message }, 500)
    }

    const deletedCount = typeof data === "number" ? data : Number(data ?? 0)
    console.info("[content] cleanup complete", { userId, deletedCount })
    return jsonResponse({ deletedCount })
  }

  if (action !== "open") {
    return jsonResponse({ error: "Unsupported action." }, 400)
  }

  const roomId = body?.roomId?.trim()
  const messageId = body?.messageId?.trim()
  if (!roomId || !messageId) {
    return jsonResponse({ error: "Room and message identifiers are required." }, 400)
  }

  const { data: message, error: messageError } = await serviceClient
    .from("messages")
    .select("id, room_id, sender_id, type, media_path, media_bucket, media_consumed_at, expires_at")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle()

  if (messageError) {
    console.info("[content] message lookup failed", {
      userId,
      roomId,
      messageId,
      error: messageError.message,
    })
    return jsonResponse({ error: messageError.message }, 500)
  }

  if (!message || message.type !== "media" || !message.media_path) {
    return jsonResponse({ error: "Media message not found." }, 404)
  }

  const { data: room, error: roomError } = await serviceClient
    .from("rooms")
    .select("id, user_a, user_b, ended_at")
    .eq("id", roomId)
    .maybeSingle()

  if (roomError) {
    console.info("[content] room lookup failed", {
      userId,
      roomId,
      messageId,
      error: roomError.message,
    })
    return jsonResponse({ error: roomError.message }, 500)
  }

  if (!room || (room.user_a !== userId && room.user_b !== userId)) {
    return jsonResponse({ error: "Forbidden" }, 403)
  }

  if (room.ended_at) {
    return jsonResponse({ error: "The room has ended." }, 410)
  }

  if (message.media_consumed_at) {
    return jsonResponse({ error: "This content has already been opened." }, 409)
  }

  const expiresAt = message.expires_at ? new Date(message.expires_at).getTime() : 0
  if (!expiresAt || expiresAt <= Date.now()) {
    return jsonResponse({ error: "This content has expired." }, 410)
  }

  const signed = await serviceClient.storage
    .from(message.media_bucket ?? "echoo-media")
    .createSignedUrl(message.media_path, MEDIA_URL_TTL_SECONDS)

  if (signed.error || !signed.data?.signedUrl) {
    console.info("[content] signed url failed", {
      userId,
      roomId,
      messageId,
      error: signed.error?.message ?? "missing signed url",
    })
    return jsonResponse({ error: signed.error?.message ?? "Unable to create signed url." }, 500)
  }

  const consumedAt = new Date().toISOString()
  const { error: consumeError } = await serviceClient
    .from("messages")
    .update({ media_consumed_at: consumedAt })
    .eq("id", messageId)
    .is("media_consumed_at", null)

  if (consumeError) {
    console.info("[content] content consume update failed", {
      userId,
      roomId,
      messageId,
      error: consumeError.message,
    })
    return jsonResponse({ error: consumeError.message }, 500)
  }

  console.info("[content] signed url created", {
    userId,
    roomId,
    messageId,
    bucket: message.media_bucket ?? "echoo-media",
  })
  console.info("[content] content opened", {
    userId,
    roomId,
    messageId,
    consumedAt,
  })

  return jsonResponse({
    messageId,
    roomId,
    signedUrl: signed.data.signedUrl,
    signedUrlExpiresAt: new Date(Date.now() + MEDIA_URL_TTL_SECONDS * 1000).toISOString(),
    consumedAt,
  })
})
